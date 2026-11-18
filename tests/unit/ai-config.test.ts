import { describe, expect, it } from 'bun:test';
import {
  EMBEDDING_DIMENSIONS,
  chatModel,
  embeddingModel,
  google,
} from '@/lib/ai';

describe('AI SDK Configuration', () => {
  it('exports configured Vercel AI SDK instances using current Gemini models', () => {
    expect(google).toBeDefined();
    expect(chatModel).toBeDefined();
    expect(embeddingModel).toBeDefined();
    expect(chatModel.modelId).toBe('gemini-3.8-flash');
    expect(embeddingModel.modelId).toBe('gemini-embedding-2');
    expect(EMBEDDING_DIMENSIONS).toBe(768);
  });
});
