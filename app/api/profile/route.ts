import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { UserProfileSchema } from '@/lib/schemas';

export interface ProfileInput {
  allergens?: string[];
  dietaryRegimes?: string[];
  healthConditions?: string[];
}

export interface NormalizedProfileData {
  allergens: string[];
  dietaryRegimes: string[];
  healthConditions: string[];
}

/**
 * Normalizes user health profile inputs:
 * - Trims and lowercases all allergen tags.
 * - Trims dietary regimes and health condition tags.
 * - Deduplicates all entries cleanly.
 * - Strips empty and whitespace-only tags.
 */
export function normalizeProfileInput(input: ProfileInput): NormalizedProfileData {
  const cleanTags = (tags: string[] = [], toLower = false): string[] => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const tag of tags) {
      if (typeof tag !== 'string') continue;
      const trimmed = tag.trim();
      const val = toLower ? trimmed.toLowerCase() : trimmed;
      if (val.length > 0 && !seen.has(val)) {
        seen.add(val);
        result.push(val);
      }
    }
    return result;
  };

  return {
    allergens: cleanTags(input.allergens, true),
    dietaryRegimes: cleanTags(input.dietaryRegimes, false),
    healthConditions: cleanTags(input.healthConditions, false),
  };
}

/**
 * Constructs the upsert payload for the User row, ensuring foreign key constraints
 * are satisfied before creating/updating UserProfile.
 */
export function buildUserUpsertData(userId: string, email?: string | null) {
  return {
    where: { id: userId },
    create: {
      id: userId,
      email: email || `${userId}@placeholder.supabase`,
    },
    update: {},
  };
}

/**
 * Constructs the upsert payload for UserProfile, including householdMembers relation.
 */
export function buildProfileUpsertData(userId: string, normalized: NormalizedProfileData) {
  return {
    where: { userId },
    create: {
      userId,
      allergens: normalized.allergens,
      dietaryRegimes: normalized.dietaryRegimes,
      healthConditions: normalized.healthConditions,
    },
    update: {
      allergens: normalized.allergens,
      dietaryRegimes: normalized.dietaryRegimes,
      healthConditions: normalized.healthConditions,
    },
    include: { householdMembers: true },
  };
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const profile = await prisma.userProfile.findUnique({
      where: { userId: user.id },
      include: { householdMembers: true },
    });

    return NextResponse.json({ profile });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching user profile:', message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 });
    }

    const parsed = UserProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid profile data', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const normalized = normalizeProfileInput(parsed.data);

    // Ensure User row exists if required by FK before upserting UserProfile
    await prisma.user.upsert(buildUserUpsertData(user.id, user.email));

    const profile = await prisma.userProfile.upsert(
      buildProfileUpsertData(user.id, normalized)
    );

    return NextResponse.json({ profile });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error updating user profile:', message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
