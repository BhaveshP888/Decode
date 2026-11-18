import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { APICallError, NoSuchToolError, InvalidToolInputError, RetryError } from 'ai';

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINIAI_API_KEY;

if (!apiKey) {
  console.warn('Neither GOOGLE_GENERATIVE_AI_API_KEY nor GEMINIAI_API_KEY is defined in environment variables.');
}

export const CHAT_MODEL_ID = 'gemini-3.8-flash' as const;
export const FALLBACK_CHAT_MODEL_ID = 'gemini-3.5-flash-lite' as const;
export const GUARDRAIL_MODEL_ID = 'gemini-3.1-flash-lite' as const;
export const DECISION_GUARDRAIL_MODEL_ID = 'baseten/mammoth-1' as const;
export const EMBEDDING_MODEL_ID = 'gemini-embedding-2' as const;
export const EMBEDDING_DIMENSIONS = 768 as const;

export function hasAiGatewayAuth(): boolean {
  return Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN);
}

export const google = createGoogleGenerativeAI({ apiKey });
export const chatModel = google(CHAT_MODEL_ID);
export const fallbackChatModel = google(FALLBACK_CHAT_MODEL_ID);
export const guardrailModel = google(GUARDRAIL_MODEL_ID);
export const embeddingModel = google.embeddingModel(EMBEDDING_MODEL_ID);

function extractRootError(error: unknown): unknown {
  if (RetryError.isInstance(error) && error.lastError) {
    return error.lastError;
  }
  return error;
}

export function isRetryableModelAvailabilityError(error: unknown): boolean {
  const root = extractRootError(error);
  if (APICallError.isInstance(root)) {
    if (root.statusCode === 503 || root.statusCode === 429 || root.statusCode === 500) {
      return true;
    }
    if (root.isRetryable) {
      return true;
    }
  }
  const message = root instanceof Error ? root.message : String(root ?? '');
  return /\b(503|429|UNAVAILABLE|high demand|overloaded|rate limit|quota)\b/i.test(message);
}

export function formatChatStreamError(error: unknown): string {
  if (NoSuchToolError.isInstance(error)) {
    return 'Health Guru attempted to invoke an unsupported tool. Please rephrase your question.';
  }
  if (InvalidToolInputError.isInstance(error)) {
    return 'Health Guru encountered an invalid tool request. Please try asking again.';
  }

  const root = extractRootError(error);
  if (APICallError.isInstance(root)) {
    if (root.statusCode === 503) {
      return 'Gemini is temporarily experiencing high demand. Please retry in a few seconds.';
    }
    if (root.statusCode === 429) {
      return 'AI rate limit reached. Please wait a moment and try again.';
    }
    if (root.statusCode === 401 || root.statusCode === 403) {
      return 'AI service authentication failed. Please verify the Gemini API key configuration.';
    }
  }

  const message = root instanceof Error ? root.message : '';
  if (/high demand|UNAVAILABLE|503/i.test(message)) {
    return 'Gemini is temporarily experiencing high demand. Please retry in a few seconds.';
  }
  if (/rate limit|quota|429/i.test(message)) {
    return 'AI rate limit reached. Please wait a moment and try again.';
  }

  return 'Unable to complete this consultation right now. Please try again in a moment.';
}
