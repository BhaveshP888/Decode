import { prisma } from '@/lib/db';
import { EMBEDDING_DIMENSIONS, embeddingModel } from '@/lib/ai';
import { embed } from 'ai';

export async function generateTextEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: embeddingModel,
    value: text.replace(/\n/g, ' ').trim(),
    dimensions: EMBEDDING_DIMENSIONS,
  });
  return embedding;
}

export async function findCleanerSwaps({
  targetEmbedding,
  category,
  userAllergens,
  limit = 3,
}: {
  targetEmbedding: number[];
  category: string;
  userAllergens: string[];
  limit?: number;
}) {
  const embeddingString = JSON.stringify(targetEmbedding);
  const safeAllergens = userAllergens.length > 0 ? userAllergens : ['__none__'];

  return await prisma.$queryRaw<Array<{
    id: string;
    productName: string;
    purityScore: number;
    allergens: string[];
    metadata: unknown;
    distance: number;
  }>>`
    SELECT 
      id,
      "productName",
      "purityScore",
      allergens,
      metadata,
      embedding <=> ${embeddingString}::vector AS distance
    FROM "ProductEmbedding"
    WHERE category = ${category}
      AND "purityScore" >= 8.5
      AND NOT (allergens && ${safeAllergens}::text[])
    ORDER BY distance ASC
    LIMIT ${limit};
  `;
}

export async function searchToxicologyVector({
  queryEmbedding,
  limit = 2,
  minSimilarity = 0.82,
}: {
  queryEmbedding: number[];
  limit?: number;
  minSimilarity?: number;
}) {
  const embeddingString = JSON.stringify(queryEmbedding);

  return await prisma.$queryRaw<Array<{
    id: string;
    ingredientName: string;
    regulatoryBody: string;
    summary: string;
    citationUrl: string;
    similarity: number;
  }>>`
    SELECT 
      id,
      "ingredientName",
      "regulatoryBody",
      summary,
      "citationUrl",
      1 - (embedding <=> ${embeddingString}::vector) AS similarity
    FROM "ToxicologyMonograph"
    WHERE 1 - (embedding <=> ${embeddingString}::vector) >= ${minSimilarity}
    ORDER BY similarity DESC
    LIMIT ${limit};
  `;
}

export async function upsertProductEmbedding({
  id,
  productName,
  category,
  purityScore,
  allergens,
  embedding,
  metadata,
}: {
  id: string;
  productName: string;
  category: string;
  purityScore: number;
  allergens: string[];
  embedding: number[];
  metadata: Record<string, unknown>;
}) {
  const embeddingString = JSON.stringify(embedding);
  const metadataString = JSON.stringify(metadata);

  await prisma.$executeRaw`
    INSERT INTO "ProductEmbedding" (id, "productName", category, "purityScore", allergens, embedding, metadata, "createdAt")
    VALUES (${id}, ${productName}, ${category}, ${purityScore}, ${allergens}::text[], ${embeddingString}::vector, ${metadataString}::jsonb, NOW())
    ON CONFLICT (id) DO UPDATE SET
      "productName" = ${productName},
      category = ${category},
      "purityScore" = ${purityScore},
      allergens = ${allergens}::text[],
      embedding = ${embeddingString}::vector,
      metadata = ${metadataString}::jsonb;
  `;
}
