import { describe, expect, it } from 'bun:test';
import { UserProfileSchema } from '@/lib/schemas';
import {
  normalizeProfileInput,
  buildUserUpsertData,
  buildProfileUpsertData,
} from '@/app/api/profile/route';

describe('Profile Route Logic', () => {
  it('validates profile updates and normalizes lowercased allergen tags', () => {
    const raw = {
      allergens: ['Tree_Nuts', 'Peanuts', 'Dairy '],
      dietaryRegimes: ['Vegan'],
      healthConditions: ['Diabetes'],
    };
    const parsed = UserProfileSchema.parse(raw);
    const normalizedAllergens = parsed.allergens.map((a) => a.trim().toLowerCase());
    expect(normalizedAllergens).toContain('tree_nuts');
    expect(normalizedAllergens).toContain('dairy');
  });

  describe('normalizeProfileInput', () => {
    it('normalizes allergen tags: trims, lowercases, deduplicates, and strips empty entries', () => {
      const input = {
        allergens: [' Tree_Nuts ', 'peanuts', 'PEANUTS', '  Dairy  ', '', '   ', 'peanuts'],
        dietaryRegimes: ['Vegan', ' Gluten-Free ', 'Vegan', '  '],
        healthConditions: [' Type 2 Diabetes ', 'Hypertension', 'Hypertension', ''],
      };

      const normalized = normalizeProfileInput(input);

      expect(normalized.allergens).toEqual(['tree_nuts', 'peanuts', 'dairy']);
      expect(normalized.dietaryRegimes).toEqual(['Vegan', 'Gluten-Free']);
      expect(normalized.healthConditions).toEqual(['Type 2 Diabetes', 'Hypertension']);
    });

    it('handles omitted and empty arrays gracefully by defaulting to empty arrays', () => {
      const normalized = normalizeProfileInput({});

      expect(normalized.allergens).toEqual([]);
      expect(normalized.dietaryRegimes).toEqual([]);
      expect(normalized.healthConditions).toEqual([]);
    });

    it('ignores non-string array elements defensively', () => {
      const input = {
        allergens: ['Tree_Nuts', null as unknown as string, undefined as unknown as string, ' Peanuts '],
      };

      const normalized = normalizeProfileInput(input);
      expect(normalized.allergens).toEqual(['tree_nuts', 'peanuts']);
    });
  });

  describe('buildUserUpsertData', () => {
    it('creates correct User upsert payload with provided email', () => {
      const payload = buildUserUpsertData('user_123', 'test@example.com');

      expect(payload).toEqual({
        where: { id: 'user_123' },
        create: {
          id: 'user_123',
          email: 'test@example.com',
        },
        update: {},
      });
    });

    it('falls back to deterministic placeholder email when email is null or undefined', () => {
      const payloadNull = buildUserUpsertData('user_456', null);
      expect(payloadNull.create.email).toBe('user_456@placeholder.supabase');

      const payloadUndefined = buildUserUpsertData('user_789', undefined);
      expect(payloadUndefined.create.email).toBe('user_789@placeholder.supabase');
    });
  });

  describe('buildProfileUpsertData', () => {
    it('creates correct UserProfile upsert payload including householdMembers relation', () => {
      const normalized = {
        allergens: ['gluten', 'dairy'],
        dietaryRegimes: ['Vegetarian'],
        healthConditions: ['Celiac'],
      };

      const payload = buildProfileUpsertData('user_123', normalized);

      expect(payload).toEqual({
        where: { userId: 'user_123' },
        create: {
          userId: 'user_123',
          allergens: ['gluten', 'dairy'],
          dietaryRegimes: ['Vegetarian'],
          healthConditions: ['Celiac'],
        },
        update: {
          allergens: ['gluten', 'dairy'],
          dietaryRegimes: ['Vegetarian'],
          healthConditions: ['Celiac'],
        },
        include: { householdMembers: true },
      });
    });
  });

  describe('UserProfileSchema validation', () => {
    it('rejects invalid non-array payloads', () => {
      const invalid = {
        allergens: 'not-an-array',
      };
      const result = UserProfileSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('provides empty defaults when fields are omitted', () => {
      const result = UserProfileSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.allergens).toEqual([]);
        expect(result.data.dietaryRegimes).toEqual([]);
        expect(result.data.healthConditions).toEqual([]);
      }
    });
  });
});
