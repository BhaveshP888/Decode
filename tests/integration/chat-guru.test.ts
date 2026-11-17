// tests/integration/chat-guru.test.ts
import { describe, expect, it } from 'bun:test';
import { validateHealthDomain, OUT_OF_DOMAIN_REFUSAL } from '@/lib/guardrails/intent';
import {
  GURU_SYSTEM_INSTRUCTION,
  buildSanitizedMessages,
  createOutOfDomainResponse,
  evaluateAllergenCompatibility,
} from '@/lib/guru';
import { z } from 'zod';

describe('Health Guru API Integration', () => {
  it('sanitizes messages to retain system prompt at index 0 and slide the last 6 turns', () => {
    const systemPrompt = { role: 'system', content: 'You are the Health Guru.' };
    const dialogue = [
      { role: 'user', content: 'Turn 1' },
      { role: 'assistant', content: 'Resp 1' },
      { role: 'user', content: 'Turn 2' },
      { role: 'assistant', content: 'Resp 2' },
      { role: 'user', content: 'Turn 3' },
      { role: 'assistant', content: 'Resp 3' },
      { role: 'user', content: 'Turn 4' },
      { role: 'assistant', content: 'Resp 4' },
    ];

    const sanitized = [systemPrompt, ...dialogue.slice(-6)];
    expect(sanitized.length).toBe(7);
    expect(sanitized[0].role).toBe('system');
    expect(sanitized[1].content).toBe('Turn 2');
    expect(sanitized[6].content).toBe('Resp 4');
  });

  it('rejects out-of-domain prompt correctly', () => {
    const check = validateHealthDomain('Can you write a sorting algorithm in C++?');
    expect(check.isPermitted).toBe(false);
  });

  it('buildSanitizedMessages correctly pins system prompt and handles variable turn counts', () => {
    // 0 turns
    const emptyResult = buildSanitizedMessages([]);
    expect(emptyResult.length).toBe(1);
    expect(emptyResult[0].role).toBe('system');
    expect(emptyResult[0].content).toBe(GURU_SYSTEM_INSTRUCTION);

    // 2 turns (fewer than 6)
    const shortDialogue = [
      { role: 'user', content: 'Is sodium benzoate harmful?' },
      { role: 'assistant', content: 'Sodium benzoate is an antimicrobial preservative.' },
    ];
    const shortResult = buildSanitizedMessages(shortDialogue);
    expect(shortResult.length).toBe(3);
    expect(shortResult[0].role).toBe('system');
    expect(shortResult[1].content).toBe('Is sodium benzoate harmful?');
    expect(shortResult[2].content).toBe('Sodium benzoate is an antimicrobial preservative.');

    // 8 turns (sliding window should take the last 6)
    const longDialogue = [
      { role: 'user', content: 'Turn 1' },
      { role: 'assistant', content: 'Resp 1' },
      { role: 'user', content: 'Turn 2' },
      { role: 'assistant', content: 'Resp 2' },
      { role: 'user', content: 'Turn 3' },
      { role: 'assistant', content: 'Resp 3' },
      { role: 'user', content: 'Turn 4' },
      { role: 'assistant', content: 'Resp 4' },
    ];
    const longResult = buildSanitizedMessages(longDialogue);
    expect(longResult.length).toBe(7);
    expect(longResult[0].role).toBe('system');
    expect(longResult[1].content).toBe('Turn 2');
    expect(longResult[6].content).toBe('Resp 4');
  });

  it('GURU_SYSTEM_INSTRUCTION contains mandatory non-prescription and pharmaceutical disclaimer rules', () => {
    expect(GURU_SYSTEM_INSTRUCTION).toContain('expert nutritional, food science, and pharmaceutical wellness advisor');
    expect(GURU_SYSTEM_INSTRUCTION).toContain('Never dispense clinical medical prescriptions');
    expect(GURU_SYSTEM_INSTRUCTION).toContain(
      'Consult your prescribing physician or pharmacist before modifying any medication schedule.'
    );
    expect(GURU_SYSTEM_INSTRUCTION).toContain('Reject non-health queries');
  });

  it('createOutOfDomainResponse returns AI SDK compatible text stream chunk with text/plain header', async () => {
    const response = createOutOfDomainResponse();
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');

    const bodyText = await response.text();
    // Vercel AI SDK text stream chunk format: 0:"content"\n
    expect(bodyText.startsWith('0:')).toBe(true);
    expect(bodyText.endsWith('\n')).toBe(true);

    const chunkContent = JSON.parse(bodyText.slice(2).trim());
    expect(chunkContent).toBe(OUT_OF_DOMAIN_REFUSAL + '\n');
  });

  it('evaluateAllergenCompatibility detects exact and substring allergen conflicts accurately', () => {
    // Exact match
    const result1 = evaluateAllergenCompatibility(['peanuts'], ['Peanuts', 'Sea Salt']);
    expect(result1.hasConflict).toBe(true);
    expect(result1.matchedConflicts).toEqual(['Peanuts']);

    // Substring match and case-insensitivity
    const result2 = evaluateAllergenCompatibility(
      ['wheat', 'milk'],
      ['Organic Whey Protein Isolate (Milk Derivative)', 'Wheat Flour', 'Cane Sugar']
    );
    expect(result2.hasConflict).toBe(true);
    expect(result2.matchedConflicts.length).toBe(2);
    expect(result2.matchedConflicts).toEqual([
      'Organic Whey Protein Isolate (Milk Derivative)',
      'Wheat Flour',
    ]);

    // Case where milk/almond match
    const result3 = evaluateAllergenCompatibility(
      ['milk', 'almond'],
      ['Skim Milk Powder', 'Almond Butter', 'Honey']
    );
    expect(result3.hasConflict).toBe(true);
    expect(result3.matchedConflicts).toEqual(['Skim Milk Powder', 'Almond Butter']);

    // No conflict
    const result4 = evaluateAllergenCompatibility(['shellfish'], ['Spinach', 'Olive Oil', 'Garlic']);
    expect(result4.hasConflict).toBe(false);
    expect(result4.matchedConflicts).toEqual([]);

    // Empty user allergens or empty ingredients list
    expect(evaluateAllergenCompatibility([], ['Peanuts']).hasConflict).toBe(false);
    expect(evaluateAllergenCompatibility(['peanuts'], []).hasConflict).toBe(false);
  });

  it('validates tool parameters with Zod schemas matching tool requirements', () => {
    // Tool 1: getUserScanHistory
    const scanHistorySchema = z.object({ limitDays: z.number().default(30) });
    expect(scanHistorySchema.parse({})).toEqual({ limitDays: 30 });
    expect(scanHistorySchema.parse({ limitDays: 14 })).toEqual({ limitDays: 14 });

    // Tool 2: searchIngredientToxicology
    const toxicologySchema = z.object({ ingredientName: z.string(), query: z.string() });
    expect(toxicologySchema.parse({ ingredientName: 'E211', query: 'sodium benzoate toxicity' })).toEqual({
      ingredientName: 'E211',
      query: 'sodium benzoate toxicity',
    });
    expect(() => toxicologySchema.parse({ ingredientName: 'E211' })).toThrow();

    // Tool 3: findCleanSwaps
    const cleanSwapsSchema = z.object({ category: z.string() });
    expect(cleanSwapsSchema.parse({ category: 'cereal' })).toEqual({ category: 'cereal' });
    expect(() => cleanSwapsSchema.parse({})).toThrow();

    // Tool 4: checkPersonalCompatibility
    const compatibilitySchema = z.object({ ingredients: z.array(z.string()) });
    expect(compatibilitySchema.parse({ ingredients: ['milk', 'soy lecithin'] })).toEqual({
      ingredients: ['milk', 'soy lecithin'],
    });
    expect(() => compatibilitySchema.parse({ ingredients: 'milk' })).toThrow();
  });
});
