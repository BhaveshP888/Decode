import { describe, expect, it } from 'bun:test';
import { google, chatModel, embeddingModel } from '@/lib/ai';

describe('AI SDK Configuration', () => {
  it('exports configured Vercel AI SDK instances', () => {
    expect(google).toBeDefined();
    expect(chatModel).toBeDefined();
    expect(embeddingModel).toBeDefined();
    expect(chatModel.modelId).toBe('gemini-2.5-flash');
    expect(embeddingModel.modelId).toBe('text-embedding-004');
  });
});
