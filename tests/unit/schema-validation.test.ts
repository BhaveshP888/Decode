import { describe, expect, it } from 'bun:test';
import { Prisma } from '@prisma/client';

describe('Prisma Schema Definitions', () => {
  it('exports model types for UserProfile, ProductEmbedding, and ChatSession', () => {
    // Verifies Prisma client generates types for new models
    const dmmf = Prisma.dmmf;
    const modelNames = dmmf.datamodel.models.map((m) => m.name);
    expect(modelNames).toContain('UserProfile');
    expect(modelNames).toContain('HouseholdMember');
    expect(modelNames).toContain('ProductEmbedding');
    expect(modelNames).toContain('ToxicologyMonograph');
    expect(modelNames).toContain('ChatSession');
    expect(modelNames).toContain('ChatMessage');
  });
});
