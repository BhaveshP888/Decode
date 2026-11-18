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
