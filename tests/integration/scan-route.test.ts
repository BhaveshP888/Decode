import { describe, expect, it } from 'bun:test';
import { ScanResultSchema } from '@/lib/schemas';
import {
  matchesAllergen,
  enrichIngredientsWithAllergensAndCitations,
  type DbIngredientWithCitation,
} from '@/app/api/scan/route';

describe('Scan Route Allergen Matching Logic (matchesAllergen)', () => {
  it('correctly matches tree nut ingredients against tree_nuts allergen tag', () => {
    expect(matchesAllergen('Almonds', 'tree_nuts')).toBe(true);
    expect(matchesAllergen('Crushed Walnuts', 'tree_nuts')).toBe(true);
    expect(matchesAllergen('Organic Cashew Butter', 'tree_nuts')).toBe(true);
    expect(matchesAllergen('Hazelnut Paste', 'tree_nuts')).toBe(true);
    expect(matchesAllergen('Pecan pieces', 'tree_nuts')).toBe(true);
    expect(matchesAllergen('Rolled Oats', 'tree_nuts')).toBe(false);
  });

  it('correctly matches peanut ingredients against peanuts allergen tag', () => {
    expect(matchesAllergen('Roasted Peanuts', 'peanuts')).toBe(true);
    expect(matchesAllergen('Peanut Butter', 'peanut')).toBe(true);
    expect(matchesAllergen('Groundnut Oil', 'peanuts')).toBe(true);
    expect(matchesAllergen('Sunflower Seeds', 'peanuts')).toBe(false);
  });

  it('correctly matches dairy derivatives against dairy allergen tag', () => {
    expect(matchesAllergen('Whole Milk Powder', 'dairy')).toBe(true);
    expect(matchesAllergen('Micellar Casein', 'dairy')).toBe(true);
    expect(matchesAllergen('Whey Protein Isolate', 'dairy')).toBe(true);
    expect(matchesAllergen('Lactose Monohydrate', 'dairy')).toBe(true);
    expect(matchesAllergen('Clarified Butter (Ghee)', 'dairy')).toBe(true);
    expect(matchesAllergen('Almond Milk', 'dairy')).toBe(false);
  });

  it('correctly matches gluten grains against gluten allergen tag', () => {
    expect(matchesAllergen('Enriched Wheat Flour', 'gluten')).toBe(true);
    expect(matchesAllergen('Barley Malt Extract', 'gluten')).toBe(true);
    expect(matchesAllergen('Rye Flour', 'gluten')).toBe(true);
    expect(matchesAllergen('Spelt Flakes', 'gluten')).toBe(true);
    expect(matchesAllergen('Brown Rice Flour', 'gluten')).toBe(false);
  });

  it('correctly matches soy and egg derivatives against respective tags', () => {
    expect(matchesAllergen('Soy Lecithin', 'soy')).toBe(true);
    expect(matchesAllergen('Organic Tofu', 'soy')).toBe(true);
    expect(matchesAllergen('Egg Albumen', 'eggs')).toBe(true);
    expect(matchesAllergen('Dried Egg Whites', 'egg')).toBe(true);
    expect(matchesAllergen('Olive Oil', 'soy')).toBe(false);
  });

  it('supports custom allergen keywords gracefully', () => {
    expect(matchesAllergen('Yellow Mustard Seed', 'mustard')).toBe(true);
    expect(matchesAllergen('Celery Salt', 'celery')).toBe(true);
    expect(matchesAllergen('Toasted Sesame Oil', 'sesame')).toBe(true);
  });
});

describe('Scan Route Serialization & Enrichment (enrichIngredientsWithAllergensAndCitations)', () => {
  it('enriches extracted ingredients with allergen conflict and regulatory citation directly', () => {
    const ingredients = [
      {
        name: 'Almonds',
        normalisedName: 'Almonds',
        origin: 'natural',
        category: 'whole_food',
        pros: ['Healthy fats'],
        cons: [],
        longTermEffects: { positive: [], negative: [] },
        riskLevel: 'low' as const,
        counter: { needed: false, nutrients: [], suggestions: [] },
        didYouKnow: 'Almonds are stone fruits related to peaches.',
      },
      {
        name: 'Organic Honey',
        normalisedName: 'Honey',
        origin: 'natural',
        category: 'sweetener',
        pros: ['Natural sweetener'],
        cons: ['High in fructose'],
        longTermEffects: { positive: [], negative: [] },
        riskLevel: 'low' as const,
        counter: { needed: false, nutrients: [], suggestions: [] },
        didYouKnow: 'Honey never spoils.',
      },
    ];

    const userAllergens = ['tree_nuts'];
    const dbIngredients: DbIngredientWithCitation[] = [
      {
        name: 'Almonds',
        aliases: ['Prunus dulcis'],
        citation: {
          regulatoryBody: 'USDA',
          summary: 'Recognized as tree nut allergen under FALCPA.',
          citationUrl: 'https://www.fda.gov/food/food-allergensgluten-free-guidance-documents-regulatory-information',
        },
      },
    ];

    const { enrichedIngredients, allergenAlert } = enrichIngredientsWithAllergensAndCitations(
      ingredients,
      userAllergens,
      dbIngredients
    );

    const fullResult = {
      overallScore: 8.5,
      summary: 'Clean snack with allergen warning for tree nuts.',
      scoreBreakdown: {
        highConcernCount: 0,
        moderateConcernCount: 0,
        lowConcernCount: 1,
        biggestConcern: 'None',
        easiestFix: 'None',
      },
      ingredients: enrichedIngredients,
      allergenAlert,
    };

    const validated = ScanResultSchema.parse(fullResult);
    expect(validated.allergenAlert?.hasConflict).toBe(true);
    expect(validated.allergenAlert?.conflictingAllergens).toEqual(['Almonds']);
    expect(validated.ingredients[0].allergenConflict).toBe(true);
    expect(validated.ingredients[0].citation?.regulatoryBody).toBe('USDA');
    expect(validated.ingredients[1].allergenConflict).toBe(false);
    expect(validated.ingredients[1].citation).toBeUndefined();
  });

  it('resolves citations via ingredient aliases (e.g. E-number or chemical alias)', () => {
    const ingredients = [
      {
        name: 'E171',
        normalisedName: 'E171',
        origin: 'synthetic',
        category: 'colorant',
        pros: [],
        cons: ['Genotoxicity concern'],
        longTermEffects: { positive: [], negative: [] },
        riskLevel: 'high' as const,
        counter: { needed: true, nutrients: [], suggestions: [] },
        didYouKnow: 'Banned in the EU.',
      },
    ];

    const dbIngredients: DbIngredientWithCitation[] = [
      {
        name: 'Titanium Dioxide',
        aliases: ['E171', 'CI 77891'],
        citation: {
          regulatoryBody: 'EFSA',
          summary: 'Titanium dioxide (E171) is no longer considered safe when used as a food additive.',
          citationUrl: 'https://www.efsa.europa.eu/en/efsajournal/pub/6585',
        },
      },
    ];

    const { enrichedIngredients, allergenAlert } = enrichIngredientsWithAllergensAndCitations(
      ingredients,
      [],
      dbIngredients
    );

    expect(enrichedIngredients[0].citation?.regulatoryBody).toBe('EFSA');
    expect(enrichedIngredients[0].citation?.summary).toContain('Titanium dioxide');
    expect(allergenAlert.hasConflict).toBe(false);
  });

  it('detects multiple simultaneous allergen conflicts accurately', () => {
    const ingredients = [
      {
        name: 'Micellar Casein',
        normalisedName: 'Casein',
        origin: 'dairy',
        category: 'dairy',
        pros: ['Slow-digesting protein'],
        cons: [],
        longTermEffects: { positive: [], negative: [] },
        riskLevel: 'low' as const,
        counter: { needed: false, nutrients: [], suggestions: [] },
        didYouKnow: 'Major protein found in milk.',
      },
      {
        name: 'Peanut Butter',
        normalisedName: 'Peanuts',
        origin: 'natural',
        category: 'whole_food',
        pros: ['Protein'],
        cons: [],
        longTermEffects: { positive: [], negative: [] },
        riskLevel: 'low' as const,
        counter: { needed: false, nutrients: [], suggestions: [] },
        didYouKnow: 'Botanically legumes, not true nuts.',
      },
      {
        name: 'Organic Rolled Oats',
        normalisedName: 'Oats',
        origin: 'natural',
        category: 'grain',
        pros: ['Beta-glucan soluble fiber'],
        cons: [],
        longTermEffects: { positive: [], negative: [] },
        riskLevel: 'low' as const,
        counter: { needed: false, nutrients: [], suggestions: [] },
        didYouKnow: 'Naturally gluten-free grain.',
      },
    ];

    const userAllergens = ['dairy', 'peanuts'];
    const { enrichedIngredients, allergenAlert } = enrichIngredientsWithAllergensAndCitations(
      ingredients,
      userAllergens,
      []
    );

    expect(allergenAlert.hasConflict).toBe(true);
    expect(allergenAlert.conflictingAllergens).toEqual(['Micellar Casein', 'Peanut Butter']);
    expect(enrichedIngredients[0].allergenConflict).toBe(true);
    expect(enrichedIngredients[1].allergenConflict).toBe(true);
    expect(enrichedIngredients[2].allergenConflict).toBe(false);
  });

  it('handles empty allergen profile safely with hasConflict false', () => {
    const ingredients = [
      {
        name: 'Organic Cocoa Beans',
        normalisedName: 'Cocoa Beans',
        origin: 'natural',
        category: 'whole_food',
        pros: ['Antioxidants'],
        cons: [],
        longTermEffects: { positive: [], negative: [] },
        riskLevel: 'low' as const,
        counter: { needed: false, nutrients: [], suggestions: [] },
        didYouKnow: 'Rich in polyphenols.',
      },
    ];

    const { enrichedIngredients, allergenAlert } = enrichIngredientsWithAllergensAndCitations(
      ingredients,
      [],
      []
    );

    expect(allergenAlert.hasConflict).toBe(false);
    expect(allergenAlert.conflictingAllergens).toEqual([]);
    expect(enrichedIngredients[0].allergenConflict).toBe(false);
  });
});
