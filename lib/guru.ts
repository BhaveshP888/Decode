import {
  createUIMessageStream,
  createUIMessageStreamResponse,
} from 'ai';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { OUT_OF_DOMAIN_REFUSAL } from '@/lib/guardrails/intent';
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

export const ProductContextSchema = z.object({
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
