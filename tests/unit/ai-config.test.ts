import { describe, expect, it } from 'bun:test';
import { APICallError, RetryError } from 'ai';
import {
  EMBEDDING_DIMENSIONS,
  chatModel,
  embeddingModel,
  fallbackChatModel,
  formatChatStreamError,
  google,
  isRetryableModelAvailabilityError,
} from '@/lib/ai';

describe('AI SDK Configuration', () => {
  it('exports configured Vercel AI SDK instances using current Gemini models', () => {
    expect(google).toBeDefined();
    expect(chatModel).toBeDefined();
    expect(fallbackChatModel).toBeDefined();
    expect(embeddingModel).toBeDefined();
    expect(chatModel.modelId).toBe('gemini-3.8-flash');
    expect(fallbackChatModel.modelId).toBe('gemini-3.5-flash-lite');
    expect(embeddingModel.modelId).toBe('gemini-embedding-2');
    expect(EMBEDDING_DIMENSIONS).toBe(768);
  });

  it('identifies 503 high-demand and 429 rate-limit RetryErrors as retryable availability errors', () => {
    const api503 = new APICallError({
      message: 'This model is currently experiencing high demand.',
      url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:streamGenerateContent',
      requestBodyValues: {},
      statusCode: 503,
      isRetryable: true,
    });
    const retryErr = new RetryError({
      message: 'Failed after 2 attempts.',
      reason: 'maxRetriesExceeded',
      errors: [api503],
    });

    expect(isRetryableModelAvailabilityError(api503)).toBe(true);
    expect(isRetryableModelAvailabilityError(retryErr)).toBe(true);
    expect(formatChatStreamError(retryErr)).toContain('high demand');
  });

  it('formats non-retryable auth errors without leaking raw internals', () => {
    const api401 = new APICallError({
      message: 'API key not valid',
      url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:streamGenerateContent',
      requestBodyValues: {},
      statusCode: 401,
      isRetryable: false,
    });

    expect(isRetryableModelAvailabilityError(api401)).toBe(false);
    expect(formatChatStreamError(api401)).toContain('authentication failed');
  });
});
