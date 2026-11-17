import { NextRequest, NextResponse } from 'next/server';
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  tool,
} from 'ai';
import { z } from 'zod';
import { chatModel } from '@/lib/ai';
import { prisma } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { validateHealthDomain, OUT_OF_DOMAIN_REFUSAL } from '@/lib/guardrails/intent';
import { findCleanerSwaps, searchToxicologyVector, generateTextEmbedding } from '@/lib/db/vectors';

export const GURU_SYSTEM_INSTRUCTION = `You are Decode's personal Health Guru, an expert nutritional, food science, and pharmaceutical wellness advisor.
You help users understand food ingredients, dietary choices, and pharmaceutical drug information (mechanisms, common side effects, inactive pill excipients, and food-drug interactions).
CRITICAL RULES:
1. Never dispense clinical medical prescriptions, alter drug dosages, or diagnose clinical diseases.
2. For all pharmaceutical or food-drug interaction inquiries, explain the biochemical mechanism clearly and ALWAYS conclude with: "Consult your prescribing physician or pharmacist before modifying any medication schedule."
3. Reject non-health queries. Keep responses concise, objective, and evidence-grounded.`;

export interface InputChatMessagePart {
  type: string;
  text?: string;
}

export interface InputChatMessage {
  role: string;
  content?: string;
  parts?: InputChatMessagePart[];
}

const ProductContextSchema = z.object({
  productName: z.string().optional(),
  purityScore: z.number().optional(),
  summary: z.string().optional(),
  ingredients: z
    .array(
      z.object({
        name: z.string(),
        normalisedName: z.string().optional(),
        riskLevel: z.enum(['low', 'moderate', 'high']).optional(),
        allergenConflict: z.boolean().optional(),
      })
    )
    .optional(),
  allergenAlert: z
    .object({
      hasConflict: z.boolean(),
      conflictingAllergens: z.array(z.string()),
    })
    .optional(),
});

export function extractMessageText(message: InputChatMessage | undefined): string {
  if (!message) return '';
  if (typeof message.content === 'string') return message.content;
  if (Array.isArray(message.parts)) {
    return message.parts
      .filter(
        (part): part is { type: 'text'; text: string } =>
          part.type === 'text' && typeof part.text === 'string'
      )
      .map((part) => part.text)
      .join('');
  }
  return '';
}

export function buildSanitizedMessages(
  messages: InputChatMessage[],
  systemInstruction: string = GURU_SYSTEM_INSTRUCTION
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  return [
    { role: 'system', content: systemInstruction },
    ...messages.slice(-6).map((m) => ({
      role: (m.role === 'user' || m.role === 'assistant' ? m.role : 'user') as 'user' | 'assistant',
      content: extractMessageText(m),
    })),
  ];
}

export function createOutOfDomainResponse(refusalText: string = OUT_OF_DOMAIN_REFUSAL): Response {
  return new Response(`0:${JSON.stringify(refusalText + '\n')}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

export function createOutOfDomainUIMessageResponse(
  refusalText: string = OUT_OF_DOMAIN_REFUSAL
): Response {
  const partId = 'out-of-domain-refusal';
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      writer.write({ type: 'start' });
      writer.write({ type: 'text-start', id: partId });
      writer.write({ type: 'text-delta', id: partId, delta: refusalText });
      writer.write({ type: 'text-end', id: partId });
      writer.write({ type: 'finish' });
    },
  });
  return createUIMessageStreamResponse({ stream });
}

export function evaluateAllergenCompatibility(
  userAllergens: string[],
  ingredients: string[]
): { hasConflict: boolean; matchedConflicts: string[] } {
  if (!userAllergens.length || !ingredients.length) {
    return { hasConflict: false, matchedConflicts: [] };
  }
  const matched = ingredients.filter((ing) =>
    userAllergens.some((allergen) =>
      ing.toLowerCase().includes(allergen.toLowerCase())
    )
  );
  return {
    hasConflict: matched.length > 0,
    matchedConflicts: matched,
  };
}

export async function executeScanHistory(userId: string, limitDays: number = 30) {
  const since = new Date(Date.now() - limitDays * 24 * 60 * 60 * 1000);
  return await prisma.scan.findMany({
    where: { userId, createdAt: { gte: since } },
    select: { productName: true, overallScore: true, summary: true, createdAt: true },
    take: 10,
    orderBy: { createdAt: 'desc' },
  });
}

export async function executeToxicologySearch(query: string) {
  const embedding = await generateTextEmbedding(query);
  return await searchToxicologyVector({ queryEmbedding: embedding, limit: 2 });
}

export async function executeCleanSwapsSearch(userId: string, category: string) {
  const profile = await prisma.userProfile.findUnique({ where: { userId } });
  const userAllergens = profile?.allergens || [];
  const embedding = await generateTextEmbedding(category);
  return await findCleanerSwaps({ targetEmbedding: embedding, category, userAllergens, limit: 3 });
}

export async function executePersonalCompatibility(userId: string, ingredients: string[]) {
  const profile = await prisma.userProfile.findUnique({ where: { userId } });
  const userAllergens = profile?.allergens || [];
  return evaluateAllergenCompatibility(userAllergens, ingredients);
}

export async function persistAssistantMessage(
  sessionId: string | undefined,
  text: string,
  toolCalls?: unknown
) {
  if (!sessionId) return null;
  try {
    return await prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'assistant',
        content: text,
        toolCalls: toolCalls ? JSON.parse(JSON.stringify(toolCalls)) : undefined,
      },
    });
  } catch (e) {
    console.error('Failed to persist chat turn:', e);
    return null;
  }
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

    const sessions = await prisma.chatSession.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      take: 25,
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            role: true,
            content: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json({ sessions });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to load Health Guru sessions:', message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = (await req.json()) as {
      messages?: unknown;
      sessionId?: unknown;
      productContext?: unknown;
    };
    const rawMessages: InputChatMessage[] = Array.isArray(body.messages)
      ? (body.messages as InputChatMessage[])
      : [];
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId : undefined;
    const lastUserMessage = extractMessageText(
      [...rawMessages].reverse().find((m) => m.role === 'user')
    );

    // Tier 1: Fast Intent Gatekeeper
    const domainCheck = validateHealthDomain(lastUserMessage);
    if (!domainCheck.isPermitted) {
      return createOutOfDomainUIMessageResponse(
        domainCheck.responseMessage || OUT_OF_DOMAIN_REFUSAL
      );
    }

    let systemInstruction = GURU_SYSTEM_INSTRUCTION;
    const parsedContext = ProductContextSchema.safeParse(body.productContext);
    if (parsedContext.success) {
      const ctx = parsedContext.data;
      const contextLines: string[] = [];
      if (ctx.productName) contextLines.push(`Product: ${ctx.productName}`);
      if (typeof ctx.purityScore === 'number') {
        contextLines.push(`Biochemical Purity Score: ${ctx.purityScore}/10`);
      }
      if (ctx.allergenAlert?.hasConflict && ctx.allergenAlert.conflictingAllergens.length > 0) {
        contextLines.push(
          `FLAGGED USER ALLERGEN CONFLICTS: ${ctx.allergenAlert.conflictingAllergens.join(', ')}`
        );
      }
      if (ctx.ingredients && ctx.ingredients.length > 0) {
        const ingredientSummary = ctx.ingredients
          .slice(0, 30)
          .map((ing) => `${ing.name}${ing.riskLevel ? ` (${ing.riskLevel} risk)` : ''}`)
          .join(', ');
        contextLines.push(`Scanned Ingredients: ${ingredientSummary}`);
      }
      if (ctx.summary) {
        contextLines.push(`Scan Summary: ${ctx.summary}`);
      }
      if (contextLines.length > 0) {
        systemInstruction = `${GURU_SYSTEM_INSTRUCTION}\n\nACTIVE SCANNED PRODUCT CONTEXT:\n${contextLines.join('\n')}`;
      }
    }

    const sanitizedMessages = buildSanitizedMessages(rawMessages, systemInstruction);

    const scanHistorySchema = z.object({ limitDays: z.number().default(30) });
    const toxicologySchema = z.object({ ingredientName: z.string(), query: z.string() });
    const cleanSwapsSchema = z.object({ category: z.string() });
    const compatibilitySchema = z.object({ ingredients: z.array(z.string()) });

    const scanHistoryTool = tool({
      description: "Query the user's scan history and consumed products from the last 30 days.",
      inputSchema: scanHistorySchema,
      execute: async ({ limitDays }: { limitDays: number }) => {
        return await executeScanHistory(user.id, limitDays);
      },
    });
    Object.assign(scanHistoryTool, { parameters: scanHistorySchema });

    const searchToxicologyTool = tool({
      description:
        'Query verified EFSA and FDA toxicological monographs for a specific chemical additive or drug excipient.',
      inputSchema: toxicologySchema,
      execute: async ({ query, ingredientName }: { query: string; ingredientName: string }) => {
        return await executeToxicologySearch(query || ingredientName);
      },
    });
    Object.assign(searchToxicologyTool, { parameters: toxicologySchema });

    const cleanSwapsTool = tool({
      description:
        'Find cleaner product alternatives in the same category that avoid harmful additives.',
      inputSchema: cleanSwapsSchema,
      execute: async ({ category }: { category: string }) => {
        return await executeCleanSwapsSearch(user.id, category);
      },
    });
    Object.assign(cleanSwapsTool, { parameters: cleanSwapsSchema });

    const personalCompatibilityTool = tool({
      description:
        "Check if a list of ingredients conflicts with the user's saved allergen and health profile.",
      inputSchema: compatibilitySchema,
      execute: async ({ ingredients }: { ingredients: string[] }) => {
        return await executePersonalCompatibility(user.id, ingredients);
      },
    });
    Object.assign(personalCompatibilityTool, { parameters: compatibilitySchema });

    const result = streamText({
      model: chatModel,
      messages: sanitizedMessages,
      stopWhen: isStepCount(3),
      ...({ maxSteps: 3 } as Record<string, unknown>),
      tools: {
        getUserScanHistory: scanHistoryTool,
        searchIngredientToxicology: searchToxicologyTool,
        findCleanSwaps: cleanSwapsTool,
        checkPersonalCompatibility: personalCompatibilityTool,
      },
      onFinish: async ({ text, toolCalls }: { text: string; toolCalls?: unknown }) => {
        // Asynchronous persistence to PostgreSQL ChatMessage
        await persistAssistantMessage(sessionId, text, toolCalls);
      },
    } as Parameters<typeof streamText>[0]);

    const streamResult = result as typeof result & { toDataStreamResponse?: () => Response };
    if (typeof streamResult.toDataStreamResponse === 'function') {
      return streamResult.toDataStreamResponse();
    }
    return streamResult.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Health Guru endpoint error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
