import { ScanResultSchema } from '@/lib/schemas'
import { z } from 'zod'

export type ScanResult = z.infer<typeof ScanResultSchema>
export type ScanIngredient = ScanResult['ingredients'][number]

export const ALLERGEN_PATTERNS: Record<string, RegExp> = {
  tree_nuts: /\b(almonds?|walnuts?|cashews?|pecans?|pistachios?|macadamias?|hazelnuts?|brazil nuts?|chestnuts?|pine nuts?|tree nuts?)\b/i,
  tree_nut: /\b(almonds?|walnuts?|cashews?|pecans?|pistachios?|macadamias?|hazelnuts?|brazil nuts?|chestnuts?|pine nuts?|tree nuts?)\b/i,
  peanuts: /\b(peanuts?|groundnuts?|arachis)\b/i,
  peanut: /\b(peanuts?|groundnuts?|arachis)\b/i,
  dairy: /\b(milk|dairy|lactose|casein|whey|butter|cheese|cream|yogurt|curd|ghee)\b/i,
  milk: /\b(milk|dairy|lactose|casein|whey|butter|cheese|cream|yogurt|curd|ghee)\b/i,
  lactose: /\b(milk|dairy|lactose|casein|whey|butter|cheese|cream|yogurt|curd|ghee)\b/i,
  gluten: /\b(gluten|wheat|barley|rye|spelt|kamut|semolina|malt|triticale)\b/i,
  wheat: /\b(gluten|wheat|barley|rye|spelt|kamut|semolina|malt|triticale)\b/i,
  soy: /\b(soy|soya|edamame|tofu|tempeh)\b/i,
  soya: /\b(soy|soya|edamame|tofu|tempeh)\b/i,
  eggs: /\b(eggs?|albumen|albumin|lysozyme|mayonnaise|ovalbumin)\b/i,
  egg: /\b(eggs?|albumen|albumin|lysozyme|mayonnaise|ovalbumin)\b/i,
  shellfish: /\b(shellfish|crustaceans?|shrimps?|prawns?|crabs?|lobsters?|clams?|mussels?|oysters?|scallops?|crawfish)\b/i,
  fish: /\b(fish|cod|salmon|tuna|anchov(?:y|ies)|tilapia|bass|trout|halibut|haddock)\b/i,
  sesame: /\b(sesame|tahini)\b/i,
  sulfites: /\b(sulfites?|sulphites?|sulfur dioxide|sulphur dioxide)\b/i,
  sulfite: /\b(sulfites?|sulphites?|sulfur dioxide|sulphur dioxide)\b/i,
}

export function matchesAllergen(ingredientName: string, allergenTag: string): boolean {
  const normalizedTag = allergenTag.trim().toLowerCase().replace(/[\s-]+/g, '_')
  const pattern = ALLERGEN_PATTERNS[normalizedTag]

  if (pattern) {
    if (['dairy', 'milk', 'lactose'].includes(normalizedTag)) {
      // Avoid false positive on plant milks (almond milk, oat milk, soy milk, etc.) when checking dairy
      if (
        /\b(almond|soy|oat|coconut|rice|cashew|hemp)\s+milk\b/i.test(ingredientName) &&
        !/\b(cow|dairy|whole|skim|dry|powder)\s+milk\b/i.test(ingredientName)
      ) {
        const stripped = ingredientName.replace(/\b(almond|soy|oat|coconut|rice|cashew|hemp)\s+milk\b/gi, '')
        return pattern.test(stripped)
      }
    }
    if (pattern.test(ingredientName)) {
      return true
    }
  }

  const cleanedTag = allergenTag.trim().toLowerCase()
  if (cleanedTag.length > 2 && ingredientName.toLowerCase().includes(cleanedTag)) {
    return true
  }
  return false
}

export interface DbIngredientWithCitation {
  name: string
  aliases?: string[]
  citation?: {
    regulatoryBody: string
    summary: string
    citationUrl: string
  } | null
}

export function enrichIngredientsWithAllergensAndCitations(
  ingredients: ScanIngredient[],
  userAllergens: string[],
  dbIngredients: DbIngredientWithCitation[] = []
): {
  enrichedIngredients: ScanIngredient[]
  allergenAlert: {
    hasConflict: boolean
    conflictingAllergens: string[]
  }
} {
  const conflictingAllergens: string[] = []

  // Build citation map storing canonical name and all aliases
  const citationMap = new Map<string, { regulatoryBody: string; summary: string; citationUrl: string }>()
  for (const dbIng of dbIngredients) {
    if (dbIng.citation) {
      const citationData = {
        regulatoryBody: dbIng.citation.regulatoryBody,
        summary: dbIng.citation.summary,
        citationUrl: dbIng.citation.citationUrl,
      }
      citationMap.set(dbIng.name.toLowerCase(), citationData)
      if (Array.isArray(dbIng.aliases)) {
        for (const alias of dbIng.aliases) {
          citationMap.set(alias.toLowerCase(), citationData)
        }
      }
    }
  }

  const enrichedIngredients = ingredients.map((ing) => {
    const isConflict = userAllergens.some((allergen) =>
      matchesAllergen(ing.name, allergen) || matchesAllergen(ing.normalisedName, allergen)
    )

    let allergenConflict = false
    if (isConflict) {
      allergenConflict = true
      if (!conflictingAllergens.includes(ing.name)) {
        conflictingAllergens.push(ing.name)
      }
    }

    const citation =
      citationMap.get(ing.normalisedName.toLowerCase()) ||
      citationMap.get(ing.name.toLowerCase())

    return {
      ...ing,
      allergenConflict,
      ...(citation ? { citation } : {}),
    }
  })

  return {
    enrichedIngredients,
    allergenAlert: {
      hasConflict: conflictingAllergens.length > 0,
      conflictingAllergens,
    },
  }
}
