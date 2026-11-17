import { describe, expect, it } from 'bun:test';
import {
  UserProfileSchema,
  HouseholdMemberSchema,
  CleanerSwapResultSchema,
  EducationalInteractionSchema,
  HealthGuruIntentSchema,
  ToxicologyCitationSchema,
  ScanResultSchema,
  IngredientAnalysisSchema,
} from '@/lib/schemas';

describe('Validation Schemas', () => {
  it('validates a user health profile', () => {
    const profile = {
      allergens: ['peanuts', 'tree_nuts'],
      dietaryRegimes: ['vegan', 'clean_label'],
      healthConditions: ['diabetes'],
    };
    expect(UserProfileSchema.parse(profile)).toEqual(profile);
  });

  it('defaults empty arrays for user health profile when omitted', () => {
    const parsed = UserProfileSchema.parse({});
    expect(parsed).toEqual({
      allergens: [],
      dietaryRegimes: [],
      healthConditions: [],
    });
  });

  it('validates household member schema', () => {
    const member = {
      name: 'Emma',
      allergens: ['dairy'],
      dietaryRegimes: ['gluten_free'],
      healthConditions: [],
    };
    expect(HouseholdMemberSchema.parse(member)).toEqual(member);

    expect(() => HouseholdMemberSchema.parse({ name: '' })).toThrow();
  });

  it('validates a cleaner swap result', () => {
    const swap = {
      id: 'swap-1',
      productName: 'Clean Organic Oat Bar',
      category: 'snack_bars',
      purityScore: 9.4,
      eliminatedAdditives: ['BHT', 'Yellow 5'],
      deltaScore: 5.6,
    };
    expect(CleanerSwapResultSchema.parse(swap)).toEqual(swap);
  });

  it('validates an educational interaction card', () => {
    const card = {
      drugName: 'Atorvastatin',
      foodOrSubstance: 'Grapefruit Juice',
      mechanism: 'CYP3A4 enzymatic inhibition',
      clinicalObservation: 'Elevated statin serum concentration',
      advisoryDisclaimer: 'Consult your prescribing physician or pharmacist before modifying any medication schedule.',
    };
    expect(EducationalInteractionSchema.parse(card)).toEqual(card);
  });

  it('validates health guru intent schema', () => {
    const allowed = { isPermitted: true };
    expect(HealthGuruIntentSchema.parse(allowed)).toEqual({ isPermitted: true });

    const blocked = { isPermitted: false, reason: 'Out of domain medical diagnosis' };
    expect(HealthGuruIntentSchema.parse(blocked)).toEqual(blocked);
  });

  it('validates toxicology citation schema', () => {
    const citation = {
      regulatoryBody: 'EFSA',
      summary: 'Re-evaluation of titanium dioxide (E171) showing genotoxicity concern.',
      citationUrl: 'https://www.efsa.europa.eu/en/efsajournal/pub/6585',
    };
    expect(ToxicologyCitationSchema.parse(citation)).toEqual(citation);
  });

  it('supports allergenAlert on ScanResultSchema', () => {
    const parsed = ScanResultSchema.safeParse({
      overallScore: 8.5,
      summary: 'Good profile',
      scoreBreakdown: {
        highConcernCount: 0,
        moderateConcernCount: 1,
        lowConcernCount: 2,
        biggestConcern: 'None',
        easiestFix: 'None',
      },
      ingredients: [],
      allergenAlert: { hasConflict: true, conflictingAllergens: ['Tree Nuts'] },
    });
    expect(parsed.success).toBe(true);
  });

  it('supports allergenConflict and citation on IngredientAnalysisSchema', () => {
    const ingredient = {
      name: 'Red 40',
      normalisedName: 'Allura Red AC',
      origin: 'synthetic',
      category: 'colorant',
      pros: [],
      cons: ['May cause hypersensitivity reactions'],
      longTermEffects: { positive: [], negative: ['Hyperactivity in children'] },
      riskLevel: 'high' as const,
      counter: { needed: true, nutrients: ['Zinc'], suggestions: ['Avoid artificial colors'] },
      didYouKnow: 'Banned in parts of Europe',
      allergenConflict: true,
      citation: {
        regulatoryBody: 'FDA',
        summary: 'Color additive certified under FD&C Act.',
        citationUrl: 'https://www.fda.gov/industry/color-additives',
      },
    };
    const parsed = IngredientAnalysisSchema.parse(ingredient);
    expect(parsed.allergenConflict).toBe(true);
    expect(parsed.citation?.regulatoryBody).toBe('FDA');
  });
});
