import { NextRequest, NextResponse } from 'next/server';
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  tool,
  toUIMessageStream,
} from 'ai';
import { z } from 'zod';
import {
  CHAT_MODEL_ID,
  FALLBACK_CHAT_MODEL_ID,
  chatModel,
  fallbackChatModel,
  formatChatStreamError,
  isRetryableModelAvailabilityError,
} from '@/lib/ai';
import { prisma } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { validateHealthDomain, OUT_OF_DOMAIN_REFUSAL } from '@/lib/guardrails/intent';
import {
  GURU_SYSTEM_INSTRUCTION,
  ProductContextSchema,
  buildConversationMessages,
  createOutOfDomainUIMessageResponse,
  ensureChatSessionAndSaveUserTurn,
  executeCleanSwapsSearch,
  executePersonalCompatibility,
  executeScanHistory,
  executeToxicologySearch,
  extractMessageText,
  persistAssistantMessage,
  type InputChatMessage,
} from '@/lib/guru';

export const maxDuration = 60;

const PRIMARY_FIRST_CHUNK_TIMEOUT_MS = 10_000;

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

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
    }

    if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
      return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
    }

    const body = rawBody as {
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

    const lastUserIndex = rawMessages.map((m) => m.role).lastIndexOf('user');
    const priorMessages = lastUserIndex > 0 ? rawMessages.slice(Math.max(0, lastUserIndex - 4), lastUserIndex) : [];
    const recentContext = priorMessages
      .map((m) => {
        const text = extractMessageText(m).trim();
        return text ? `${m.role}: ${text.slice(0, 240)}` : '';
      })
      .filter(Boolean)
      .join('\n');

    // LLM-Only Domain Gatekeeper: verify health/food/medicine scope before running tools or streaming
    const domainCheck = await validateHealthDomain(lastUserMessage, {
      recentContext: recentContext || undefined,
    });
    if (!domainCheck.isPermitted) {
      return createOutOfDomainUIMessageResponse(
        domainCheck.responseMessage || OUT_OF_DOMAIN_REFUSAL
      );
    }

    // Ensure ChatSession exists and persist the incoming user turn (non-fatal on DB errors)
    const resolvedSessionId = await ensureChatSessionAndSaveUserTurn(
      user.id,
      user.email,
      sessionId,
      lastUserMessage
    );

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

    const conversationMessages = buildConversationMessages(rawMessages);
    if (conversationMessages.length === 0) {
      return NextResponse.json({ error: 'At least one message is required.' }, { status: 400 });
    }

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

    const searchToxicologyTool = tool({
      description:
        'Query verified EFSA and FDA toxicological monographs for a specific chemical additive or drug excipient.',
      inputSchema: toxicologySchema,
      execute: async ({ query, ingredientName }: { query: string; ingredientName: string }) => {
        return await executeToxicologySearch(query || ingredientName);
      },
    });

    const cleanSwapsTool = tool({
      description:
        'Find cleaner product alternatives in the same category that avoid harmful additives.',
      inputSchema: cleanSwapsSchema,
      execute: async ({ category }: { category: string }) => {
        return await executeCleanSwapsSearch(user.id, category);
      },
    });

    const personalCompatibilityTool = tool({
      description:
        "Check if a list of ingredients conflicts with the user's saved allergen and health profile.",
      inputSchema: compatibilitySchema,
      execute: async ({ ingredients }: { ingredients: string[] }) => {
        return await executePersonalCompatibility(user.id, ingredients);
      },
    });

    const guruTools = {
      getUserScanHistory: scanHistoryTool,
      searchIngredientToxicology: searchToxicologyTool,
      findCleanSwaps: cleanSwapsTool,
      checkPersonalCompatibility: personalCompatibilityTool,
    };

    const runGuruStream = (
      model: typeof chatModel,
      options: {
        maxRetries: number;
        thinkingLevel: 'minimal' | 'low';
        abortSignal?: AbortSignal;
      }
    ) =>
      streamText({
        model,
        instructions: systemInstruction,
        messages: conversationMessages,
        maxRetries: options.maxRetries,
        abortSignal: options.abortSignal,
        stopWhen: isStepCount(3),
        tools: guruTools,
        providerOptions: {
          google: {
            thinkingConfig: {
              thinkingLevel: options.thinkingLevel,
            },
          },
        },
        onError: ({ error }) => {
          console.error('Health Guru stream error:', error);
        },
        onFinish: async ({ text, toolCalls }) => {
          // Asynchronous persistence to PostgreSQL ChatMessage
          if (text.trim().length > 0) {
            await persistAssistantMessage(resolvedSessionId, text, toolCalls);
          }
        },
      });

    const stream = createUIMessageStream({
      onError: formatChatStreamError,
      execute: async ({ writer }) => {
        let primaryError: unknown = null;
        let hasEmittedContent = false;
        let sentStart = false;
        let primaryTimedOut = false;

        const primaryAbort = new AbortController();
        const startupTimer = setTimeout(() => {
          if (!hasEmittedContent) {
            primaryTimedOut = true;
            primaryAbort.abort();
          }
        }, PRIMARY_FIRST_CHUNK_TIMEOUT_MS);

        const triggerFallback = () => {
          console.warn(
            `Primary model ${CHAT_MODEL_ID} ${primaryTimedOut ? 'timed out waiting for first token' : 'unavailable'}; falling back to ${FALLBACK_CHAT_MODEL_ID}.`
          );
          const fallbackResult = runGuruStream(fallbackChatModel, {
            maxRetries: 2,
            thinkingLevel: 'minimal',
          });
          writer.merge(
            toUIMessageStream({
              stream: fallbackResult.stream,
              tools: guruTools,
              sendStart: !sentStart,
              onError: formatChatStreamError,
            })
          );
        };

        const primaryResult = runGuruStream(chatModel, {
          maxRetries: 0,
          thinkingLevel: 'low',
          abortSignal: primaryAbort.signal,
        });
        const primaryUIStream = toUIMessageStream({
          stream: primaryResult.stream,
          tools: guruTools,
          onError: (err) => {
            primaryError = err;
            return formatChatStreamError(err);
          },
        });

        const reader = primaryUIStream.getReader();
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) {
              if (!hasEmittedContent && primaryTimedOut) {
                triggerFallback();
              }
              break;
            }

            if (
              (value.type === 'error' || value.type === 'abort') &&
              !hasEmittedContent &&
              (primaryTimedOut || isRetryableModelAvailabilityError(primaryError))
            ) {
              clearTimeout(startupTimer);
              triggerFallback();
              return;
            }

            if (value.type === 'start') {
              sentStart = true;
            } else if (
              value.type === 'text-delta' ||
              value.type === 'tool-input-start' ||
              value.type === 'tool-input-available'
            ) {
              hasEmittedContent = true;
              clearTimeout(startupTimer);
            } else if (value.type === 'finish' && !hasEmittedContent && primaryTimedOut) {
              clearTimeout(startupTimer);
              triggerFallback();
              return;
            }

            writer.write(value);
          }
        } catch (readError: unknown) {
          clearTimeout(startupTimer);
          if (
            !hasEmittedContent &&
            (primaryTimedOut || isRetryableModelAvailabilityError(readError))
          ) {
            triggerFallback();
            return;
          }
          throw readError;
        } finally {
          clearTimeout(startupTimer);
          reader.releaseLock();
        }
      },
    });

    const responseHeaders = resolvedSessionId
      ? { 'X-Chat-Session-Id': resolvedSessionId }
      : undefined;
    return createUIMessageStreamResponse({
      stream,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Health Guru endpoint error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
