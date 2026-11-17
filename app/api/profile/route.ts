import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { UserProfileSchema } from '@/lib/schemas';
import {
  normalizeProfileInput,
  buildUserUpsertData,
  buildProfileUpsertData,
} from '@/lib/profile';

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
