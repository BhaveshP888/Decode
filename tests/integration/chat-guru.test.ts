// tests/integration/chat-guru.test.ts
import { describe, expect, it } from 'bun:test';
import { validateHealthDomain, OUT_OF_DOMAIN_REFUSAL } from '@/lib/guardrails/intent';
import {
  GURU_SYSTEM_INSTRUCTION,
  buildChatSessionTitle,
  buildSanitizedMessages,
  createOutOfDomainResponse,
  ensureChatSessionAndSaveUserTurn,
  evaluateAllergenCompatibility,
  type ChatPersistenceClient,
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

  it('evaluateAllergenCompatibility matches canonical Decode allergen tags and respects plant-milk exemptions', () => {
    const result = evaluateAllergenCompatibility(
      ['tree_nuts', 'dairy', 'gluten'],
      ['Almonds', 'Whey Protein', 'Oat Milk', 'Wheat Flour']
    );

    expect(result.hasConflict).toBe(true);
    expect(result.matchedConflicts).toEqual(['Almonds', 'Whey Protein', 'Wheat Flour']);
    expect(result.matchedConflicts).not.toContain('Oat Milk');

    const caseinResult = evaluateAllergenCompatibility(['dairy'], ['Sodium Casein', 'Soy Milk']);
    expect(caseinResult.hasConflict).toBe(true);
    expect(caseinResult.matchedConflicts).toEqual(['Sodium Casein']);
  });

  it('buildChatSessionTitle normalizes whitespace, truncates long prompts to <=60 chars, and provides fallback', () => {
    expect(buildChatSessionTitle('')).toBe('Health Consultation');
    expect(buildChatSessionTitle('   \n\t  ')).toBe('Health Consultation');
    expect(buildChatSessionTitle('  Is   sodium   benzoate safe? ')).toBe('Is sodium benzoate safe?');

    const longPrompt =
      'Can you explain how grapefruit juice interacts with atorvastatin and other statin medications over time?';
    const title = buildChatSessionTitle(longPrompt);
    expect(title.length).toBeLessThanOrEqual(60);
    expect(title.endsWith('…')).toBe(true);
  });

  it('ensureChatSessionAndSaveUserTurn creates a new session and persists user message when sessionId is omitted', async () => {
    const calls: string[] = [];
    let createdTitle = '';
    const savedMessages: Array<{ sessionId: string; role: string; content: string }> = [];

    const mockDb: ChatPersistenceClient = {
      user: {
        upsert: async (args) => {
          calls.push(`user.upsert:${args.where.id}:${args.create.email}`);
          return { id: args.where.id };
        },
      },
      chatSession: {
        findFirst: async () => {
          calls.push('chatSession.findFirst');
          return null;
        },
        create: async (args) => {
          calls.push(`chatSession.create:${args.data.userId}`);
          createdTitle = args.data.title;
          return { id: 'session_new_1' };
        },
        update: async () => {
          calls.push('chatSession.update');
          return {};
        },
      },
      chatMessage: {
        create: async (args) => {
          calls.push(`chatMessage.create:${args.data.role}`);
          savedMessages.push(args.data);
          return { id: 'msg_1' };
        },
      },
    };

    const resolvedId = await ensureChatSessionAndSaveUserTurn(
      'user_123',
      'user@example.com',
      undefined,
      'Does sodium benzoate interact with ascorbic acid in soft drinks?',
      mockDb
    );

    expect(resolvedId).toBe('session_new_1');
    expect(createdTitle.length).toBeLessThanOrEqual(60);
    expect(createdTitle.endsWith('…')).toBe(true);
    expect(savedMessages).toEqual([
      {
        sessionId: 'session_new_1',
        role: 'user',
        content: 'Does sodium benzoate interact with ascorbic acid in soft drinks?',
      },
    ]);
    expect(calls).toEqual([
      'user.upsert:user_123:user@example.com',
      'chatSession.create:user_123',
      'chatMessage.create:user',
    ]);
  });

  it('ensureChatSessionAndSaveUserTurn reuses owned sessionId and creates new session when sessionId is unowned', async () => {
    const calls: string[] = [];

    const ownedDb: ChatPersistenceClient = {
      user: { upsert: async () => ({}) },
      chatSession: {
        findFirst: async ({ where }) => {
          calls.push(`findFirst:${where.id}:${where.userId}`);
          return where.id === 'session_owned' && where.userId === 'user_1'
            ? { id: 'session_owned' }
            : null;
        },
        create: async () => {
          calls.push('create');
          return { id: 'session_fallback' };
        },
        update: async ({ where }) => {
          calls.push(`update:${where.id}`);
          return {};
        },
      },
      chatMessage: {
        create: async ({ data }) => {
          calls.push(`msg:${data.sessionId}:${data.role}`);
          return {};
        },
      },
    };

    const reusedId = await ensureChatSessionAndSaveUserTurn(
      'user_1',
      null,
      'session_owned',
      'Follow-up question on ibuprofen',
      ownedDb
    );
    expect(reusedId).toBe('session_owned');
    expect(calls).toEqual([
      'findFirst:session_owned:user_1',
      'update:session_owned',
      'msg:session_owned:user',
    ]);

    calls.length = 0;
    const unownedResolvedId = await ensureChatSessionAndSaveUserTurn(
      'user_1',
      null,
      'someone_elses_session',
      'Question on dairy allergens',
      ownedDb
    );
    expect(unownedResolvedId).toBe('session_fallback');
    expect(calls).toEqual([
      'findFirst:someone_elses_session:user_1',
      'create',
      'msg:session_fallback:user',
    ]);
  });

  it('ensureChatSessionAndSaveUserTurn degrades non-fatally when DB fails', async () => {
    const failingDb: ChatPersistenceClient = {
      user: {
        upsert: async () => {
          throw new Error('DB connection lost');
        },
      },
      chatSession: {
        findFirst: async () => null,
        create: async () => ({ id: 'never' }),
        update: async () => ({}),
      },
      chatMessage: {
        create: async () => ({}),
      },
    };

    const resolvedId = await ensureChatSessionAndSaveUserTurn(
      'user_1',
      'a@b.com',
      undefined,
      'Is vitamin D safe?',
      failingDb
    );
    expect(resolvedId).toBeUndefined();
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
