import { describe, expect, it } from 'bun:test';
import { ScanResultSchema } from '@/lib/schemas';

describe('Scan Route Serialization & Enrichment', () => {
  it('enriches extracted ingredients with allergen conflict and regulatory citation', () => {
    const rawResult = {
      overallScore: 8.0,
      summary: 'Clean snack with one tree nut ingredient.',
      scoreBreakdown: { highConcernCount: 0, moderateConcernCount: 0, lowConcernCount: 1, biggestConcern: 'None', easiestFix: 'None' },
      ingredients: [
        {
          name: 'Almonds',
          normalisedName: 'Almonds',
          origin: 'natural',
          category: 'whole_food',
          pros: ['Healthy fats'],
          cons: [],
          longTermEffects: { positive: [], negative: [] },
          riskLevel: 'low' as const,
          counter: { needed: false, nutrients: [] },
        },
      ],
    };

    // Simulate post-LLM enrichment logic
    const userAllergens = ['tree_nuts'];
    const conflictingAllergens: string[] = [];

    const enrichedIngredients = rawResult.ingredients.map((ing) => {
      const isNut = /almond|walnut|cashew/i.test(ing.name);
      if (isNut && userAllergens.includes('tree_nuts')) {
        conflictingAllergens.push(ing.name);
        return { ...ing, allergenConflict: true };
      }
      return { ...ing, allergenConflict: false };
    });

    const finalResult = {
      ...rawResult,
      ingredients: enrichedIngredients,
      allergenAlert: {
        hasConflict: conflictingAllergens.length > 0,
        conflictingAllergens,
      },
    };

    const validated = ScanResultSchema.parse(finalResult);
    expect(validated.allergenAlert?.hasConflict).toBe(true);
    expect(validated.ingredients[0].allergenConflict).toBe(true);
  });

  it('validates ScanResultSchema with attached relational citation', () => {
    const resultWithCitation = {
      overallScore: 5.5,
      summary: 'Processed food with synthetic additives.',
      scoreBreakdown: {
        highConcernCount: 1,
        moderateConcernCount: 0,
        lowConcernCount: 0,
        biggestConcern: 'Titanium Dioxide',
        easiestFix: 'Choose unwhitened alternatives',
      },
      ingredients: [
        {
          name: 'Titanium Dioxide',
          normalisedName: 'Titanium Dioxide',
          origin: 'synthetic',
          category: 'colorant',
          pros: [],
          cons: ['Possible genotoxicity concern'],
          longTermEffects: { positive: [], negative: ['DNA damage'] },
          riskLevel: 'high' as const,
          counter: { needed: true, nutrients: [], suggestions: [] },
          didYouKnow: 'Banned in the EU under regulation E171.',
          allergenConflict: false,
          citation: {
            regulatoryBody: 'EFSA',
            summary: 'Titanium dioxide (E171) no longer considered safe as food additive.',
            citationUrl: 'https://www.efsa.europa.eu/en/efsajournal/pub/6585',
          },
        },
      ],
      allergenAlert: {
        hasConflict: false,
        conflictingAllergens: [],
      },
    };

    const validated = ScanResultSchema.parse(resultWithCitation);
    expect(validated.ingredients[0].citation?.regulatoryBody).toBe('EFSA');
    expect(validated.ingredients[0].citation?.citationUrl).toContain('efsa.europa.eu');
    expect(validated.allergenAlert?.hasConflict).toBe(false);
  });

  it('detects multiple allergen conflicts when user profile has multiple allergens', () => {
    const rawResult = {
      overallScore: 6.0,
      summary: 'Granola with nuts and dairy.',
      scoreBreakdown: { highConcernCount: 0, moderateConcernCount: 1, lowConcernCount: 1, biggestConcern: 'None', easiestFix: 'None' },
      ingredients: [
        {
          name: 'Whole Milk Powder',
          normalisedName: 'Whole Milk Powder',
          origin: 'dairy',
          category: 'dairy',
          pros: ['Calcium'],
          cons: [],
          longTermEffects: { positive: [], negative: [] },
          riskLevel: 'low' as const,
          counter: { needed: false, nutrients: [] },
        },
        {
          name: 'Crushed Peanuts',
          normalisedName: 'Peanuts',
          origin: 'natural',
          category: 'whole_food',
          pros: ['Protein'],
          cons: [],
          longTermEffects: { positive: [], negative: [] },
          riskLevel: 'low' as const,
          counter: { needed: false, nutrients: [] },
        },
        {
          name: 'Rolled Oats',
          normalisedName: 'Oats',
          origin: 'natural',
          category: 'grain',
          pros: ['Fiber'],
          cons: [],
          longTermEffects: { positive: [], negative: [] },
          riskLevel: 'low' as const,
          counter: { needed: false, nutrients: [] },
        },
      ],
    };

    const userAllergens = ['dairy', 'peanuts'];
    const conflictingAllergens: string[] = [];

    const enrichedIngredients = rawResult.ingredients.map((ing) => {
      const isDairy = /milk|dairy|lactose/i.test(ing.name);
      const isPeanut = /peanut/i.test(ing.name);
      if ((isDairy && userAllergens.includes('dairy')) || (isPeanut && userAllergens.includes('peanuts'))) {
        conflictingAllergens.push(ing.name);
        return { ...ing, allergenConflict: true };
      }
      return { ...ing, allergenConflict: false };
    });

    const finalResult = {
      ...rawResult,
      ingredients: enrichedIngredients,
      allergenAlert: {
        hasConflict: conflictingAllergens.length > 0,
        conflictingAllergens,
      },
    };

    const validated = ScanResultSchema.parse(finalResult);
    expect(validated.allergenAlert?.hasConflict).toBe(true);
    expect(validated.allergenAlert?.conflictingAllergens).toEqual(['Whole Milk Powder', 'Crushed Peanuts']);
    expect(validated.ingredients[0].allergenConflict).toBe(true);
    expect(validated.ingredients[1].allergenConflict).toBe(true);
    expect(validated.ingredients[2].allergenConflict).toBe(false);
  });

  it('handles empty allergen profile safely with hasConflict false', () => {
    const rawResult = {
      overallScore: 9.0,
      summary: 'Pure organic dark chocolate.',
      scoreBreakdown: { highConcernCount: 0, moderateConcernCount: 0, lowConcernCount: 0, biggestConcern: 'None', easiestFix: 'None' },
      ingredients: [
        {
          name: 'Organic Cocoa Beans',
          normalisedName: 'Cocoa Beans',
          origin: 'natural',
          category: 'whole_food',
          pros: ['Antioxidants'],
          cons: [],
          longTermEffects: { positive: [], negative: [] },
          riskLevel: 'low' as const,
          counter: { needed: false, nutrients: [] },
        },
      ],
    };

    const userAllergens: string[] = [];
    const conflictingAllergens: string[] = [];

    const enrichedIngredients = rawResult.ingredients.map((ing) => {
      return { ...ing, allergenConflict: false };
    });

    const finalResult = {
      ...rawResult,
      ingredients: enrichedIngredients,
      allergenAlert: {
        hasConflict: conflictingAllergens.length > 0,
        conflictingAllergens,
      },
    };

    const validated = ScanResultSchema.parse(finalResult);
    expect(validated.allergenAlert?.hasConflict).toBe(false);
    expect(validated.allergenAlert?.conflictingAllergens).toEqual([]);
    expect(validated.ingredients[0].allergenConflict).toBe(false);
  });
});
