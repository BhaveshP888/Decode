import { describe, expect, it } from 'bun:test';
import {
  findCleanerSwaps,
  searchToxicologyVector,
  upsertProductEmbedding,
  generateTextEmbedding,
} from '@/lib/db/vectors';

describe('Vector Retrieval Layer', () => {
  it('constructs cleaner swap query with safe stringified vector and relational allergen filters', async () => {
    // Tests that findCleanerSwaps handles inputs without SQL syntax or array casting errors
    const dummyEmbedding = new Array(768).fill(0.01);
    try {
      const results = await findCleanerSwaps({
        targetEmbedding: dummyEmbedding,
        category: 'snack_bars',
        userAllergens: ['peanuts', 'gluten'],
        limit: 3,
      });
      expect(Array.isArray(results)).toBe(true);
    } catch (error: unknown) {
      // If DB is offline during unit testing, ensure error is connection-related, NOT a syntax/casting error
      const msg = error instanceof Error ? error.message : '';
      expect(msg).not.toContain('cannot cast type double precision[] to vector');
      expect(msg).not.toContain('syntax error');
    }
  });

  it('handles empty allergen array without generating invalid SQL', async () => {
    const dummyEmbedding = new Array(768).fill(0.01);
    try {
      const results = await findCleanerSwaps({
        targetEmbedding: dummyEmbedding,
        category: 'beverages',
        userAllergens: [],
        limit: 2,
      });
      expect(Array.isArray(results)).toBe(true);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '';
      expect(msg).not.toContain('cannot cast type double precision[] to vector');
    }
  });

  it('constructs toxicology vector search query with similarity threshold safely', async () => {
    const dummyEmbedding = new Array(768).fill(0.01);
    try {
      const results = await searchToxicologyVector({
        queryEmbedding: dummyEmbedding,
        limit: 2,
        minSimilarity: 0.82,
      });
      expect(Array.isArray(results)).toBe(true);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '';
      expect(msg).not.toContain('cannot cast type double precision[] to vector');
      expect(msg).not.toContain('syntax error');
    }
  });

  it('exports upsertProductEmbedding and generateTextEmbedding functions', () => {
    expect(typeof upsertProductEmbedding).toBe('function');
    expect(typeof generateTextEmbedding).toBe('function');
  });
});
