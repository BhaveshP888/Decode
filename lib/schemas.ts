import { z } from "zod";

export const ToxicologyCitationSchema = z.object({
  regulatoryBody: z.string(),
  summary: z.string(),
  citationUrl: z.string(),
});

export const IngredientAnalysisSchema = z.object({
  name: z.string().min(1, "Ingredient name is required"),
  normalisedName: z.string().min(1, "Normalized ingredient name is required"),
  origin: z.string().optional().default(""),
  category: z.string().optional().default(""),
  pros: z.array(z.string()).default([]),
  cons: z.array(z.string()).default([]),
  longTermEffects: z
    .object({
      positive: z.array(z.string()).default([]),
      negative: z.array(z.string()).default([]),
    })
    .default({ positive: [], negative: [] }),
  riskLevel: z.enum(["low", "moderate", "high"]).default("low"),
  counter: z
    .object({
      needed: z.boolean().default(false),
      nutrients: z.array(z.string()).default([]),
      suggestions: z.array(z.string()).default([]),
    })
    .default({ needed: false, nutrients: [], suggestions: [] }),
  didYouKnow: z.string().optional().default(""),
  allergenConflict: z.boolean().optional(),
  citation: ToxicologyCitationSchema.optional(),
});

export const ScanResultSchema = z.object({
  overallScore: z.number().min(0).max(10),
  summary: z.string().default(""),
  scoreBreakdown: z.object({
    highConcernCount: z.number().int().min(0).default(0),
    moderateConcernCount: z.number().int().min(0).default(0),
    lowConcernCount: z.number().int().min(0).default(0),
    biggestConcern: z.string().default("None"),
    easiestFix: z.string().default("None"),
  }),
  ingredients: z.array(IngredientAnalysisSchema).default([]),
  allergenAlert: z
    .object({
      hasConflict: z.boolean(),
      conflictingAllergens: z.array(z.string()),
    })
    .optional(),
});

export const UserProfileSchema = z.object({
  allergens: z.array(z.string()).default([]),
  dietaryRegimes: z.array(z.string()).default([]),
  healthConditions: z.array(z.string()).default([]),
});

export const HouseholdMemberSchema = z.object({
  name: z.string().min(1, "Name is required"),
  allergens: z.array(z.string()).default([]),
  dietaryRegimes: z.array(z.string()).default([]),
  healthConditions: z.array(z.string()).default([]),
});

export const CleanerSwapResultSchema = z.object({
  id: z.string(),
  productName: z.string(),
  category: z.string(),
  purityScore: z.number(),
  eliminatedAdditives: z.array(z.string()),
  deltaScore: z.number(),
});

export const EducationalInteractionSchema = z.object({
  drugName: z.string(),
  foodOrSubstance: z.string(),
  mechanism: z.string(),
  clinicalObservation: z.string(),
  advisoryDisclaimer: z.string(),
});

export const HealthGuruIntentSchema = z.object({
  isPermitted: z.boolean(),
  reason: z.string().optional(),
});

export const ProductComparisonItemSchema = z.object({
  index: z.number().int().min(0),
  name: z.string(),
  overallScore: z.number().min(0).max(10),
  additiveCount: z.number().int().min(0).default(0),
  highConcernCount: z.number().int().min(0).default(0),
  moderateConcernCount: z.number().int().min(0).default(0),
  lowConcernCount: z.number().int().min(0).default(0),
  keyConcerns: z.array(z.string()).default([]),
  keyPros: z.array(z.string()).default([]),
  verdictNote: z.string().default(""),
});

export const ComparisonPointSchema = z.object({
  category: z.string(),
  findings: z.array(z.string()).default([]),
});

export const ComparisonResultSchema = z.object({
  winnerIndex: z.number().int().min(0),
  winnerName: z.string(),
  verdictHeadline: z.string(),
  verdictSummary: z.string(),
  products: z.array(ProductComparisonItemSchema).min(2).max(4),
  comparisonPoints: z.array(ComparisonPointSchema).default([]),
  bottomLineRecommendation: z.string().default(""),
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

export type ToxicologyCitation = z.infer<typeof ToxicologyCitationSchema>;
export type IngredientAnalysis = z.infer<typeof IngredientAnalysisSchema>;
export type ScanResult = z.infer<typeof ScanResultSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type HouseholdMember = z.infer<typeof HouseholdMemberSchema>;
export type CleanerSwapResult = z.infer<typeof CleanerSwapResultSchema>;
export type EducationalInteraction = z.infer<typeof EducationalInteractionSchema>;
export type HealthGuruIntent = z.infer<typeof HealthGuruIntentSchema>;
export type ProductComparisonItem = z.infer<typeof ProductComparisonItemSchema>;
export type ComparisonPoint = z.infer<typeof ComparisonPointSchema>;
export type ComparisonResult = z.infer<typeof ComparisonResultSchema>;
export type WeeklyPlan = z.infer<typeof WeeklyPlanSchema>;
