import { NextRequest, NextResponse } from 'next/server';
import {
  isStepCount,
  streamText,
  tool,
} from 'ai';
import { z } from 'zod';
import { chatModel } from '@/lib/ai';
import { prisma } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { validateHealthDomain, OUT_OF_DOMAIN_REFUSAL } from '@/lib/guardrails/intent';
import {
  GURU_SYSTEM_INSTRUCTION,
  ProductContextSchema,
  buildSanitizedMessages,
  createOutOfDomainUIMessageResponse,
  executeCleanSwapsSearch,
  executePersonalCompatibility,
  executeScanHistory,
  executeToxicologySearch,
  extractMessageText,
  persistAssistantMessage,
  type InputChatMessage,
} from '@/lib/guru';

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
