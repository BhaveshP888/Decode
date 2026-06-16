import { z } from "zod";

export const IngredientAnalysisSchema = z.object({
  name: z.string().describe("Original name from the label"),
  normalisedName: z.string().describe("Standardized scientific or common name"),
  origin: z.string(),
  category: z.enum([
    "natural",
    "synthetic",
    "petroleum-derived",
    "fermented",
    "mineral",
    "animal-derived",
  ]),
  pros: z.array(z.string()),
  cons: z.array(z.string()),
  longTermEffects: z.object({
    positive: z.array(z.string()),
    negative: z.array(z.string()),
  }),
  riskLevel: z.enum(["low", "moderate", "high"]),
  counter: z.object({
    needed: z.boolean(),
    nutrients: z.array(z.string()),
    suggestions: z.array(z.string()),
  }),
  didYouKnow: z.string(),
});

export const ScanResultSchema = z.object({
  ingredients: z.array(IngredientAnalysisSchema),
  overallScore: z.number().min(0).max(10),
  scoreBreakdown: z.object({
    highConcernCount: z.number(),
    moderateConcernCount: z.number(),
    lowConcernCount: z.number(),
    biggestConcern: z.string(),
    easiestFix: z.string(),
  }),
  summary: z.string(),
});

export const WeeklyPlanSchema = z.object({
  weekOf: z.string(),
  topConcerns: z.array(z.string()),
  nutrientsToIncrease: z.array(
    z.object({
      nutrient: z.string(),
      reason: z.string(),
      foodSources: z.array(z.string()),
    })
  ),
  simpleSwaps: z.array(
    z.object({
      avoid: z.string(),
      replaceWith: z.string(),
    })
  ),
  message: z.string(),
});
