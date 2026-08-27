import { NextRequest, NextResponse } from 'next/server'
import { ai } from '@/lib/ai'
import { prisma } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'
import { Prisma } from '@prisma/client'

interface ScanIngredient {
  name: string
  normalisedName: string
  origin?: string
  category?: string
  pros?: string[]
  cons?: string[]
  longTermEffects?: {
    positive?: string[]
    negative?: string[]
  }
  riskLevel?: 'low' | 'moderate' | 'high'
  counter?: {
    needed?: boolean
    nutrients?: string[]
    suggestions?: string[]
  }
  didYouKnow?: string
}

interface ScanResult {
  overallScore: number
  summary: string
  scoreBreakdown: {
    highConcernCount: number
    moderateConcernCount: number
    lowConcernCount: number
    biggestConcern: string
    easiestFix: string
  }
  ingredients: ScanIngredient[]
}

/**
 * Strips markdown code fences (```json ... ```) that Gemini sometimes wraps
 * around JSON output, then parses the result.
 */
function parseLLMJSON(text: string): ScanResult {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
  return JSON.parse(cleaned) as ScanResult
}

export async function POST(req: NextRequest) {
  try {
    const { rawInput, inputType, image, mimeType, productName } = await req.json()

    if (!rawInput?.trim() && !image) {
      return NextResponse.json({ error: 'No text or image provided for scan.' }, { status: 400 })
    }

    if (rawInput && rawInput.length > 10000) {
      return NextResponse.json(
        { error: 'Input is too long. The maximum allowed size is 10,000 characters.' },
        { status: 400 }
      )
    }

    if (inputType && !['text', 'product_name', 'photo'].includes(inputType)) {
      return NextResponse.json({ error: 'Invalid input type' }, { status: 400 })
    }

    let interactionInput: string | Array<{ type: 'text'; text: string } | { type: 'image'; data: string; mime_type: string }>

    const baseSystemPrompt = `You are an expert ingredient analyst for packaged foods, drinks, and medicines.
Analyze the provided ingredients and return a single JSON object with this exact structure:

{
  "overallScore": <number 0-10, where 10 is safest>,
  "summary": "<2-3 sentence plain-English summary of the overall risk profile>",
  "scoreBreakdown": {
    "highConcernCount": <number>,
    "moderateConcernCount": <number>,
    "lowConcernCount": <number>,
    "biggestConcern": "<name of the most concerning ingredient>",
    "easiestFix": "<what the consumer could do or avoid>"
  },
  "ingredients": [
    {
      "name": "<original name as written>",
      "normalisedName": "<canonical scientific/common name>",
      "origin": "<'natural', 'synthetic', or 'petroleum-derived'>",
      "category": "<e.g. 'preservative', 'sweetener', 'colorant', 'emulsifier', etc.>",
      "pros": ["<benefit 1>"],
      "cons": ["<concern 1>", "<concern 2>"],
      "longTermEffects": {
        "positive": ["<long-term positive effect>"],
        "negative": ["<long-term negative effect>"]
      },
      "riskLevel": "<'low', 'moderate', or 'high'>",
      "counter": {
        "needed": <true or false>,
        "nutrients": ["<nutrient that counters this>"],
        "suggestions": ["<food or habit suggestion>"]
      },
      "didYouKnow": "<one interesting or surprising fact>"
    }
  ]
}

Return ONLY the JSON object. No markdown, no explanation, no code fences.`

    if (image && (inputType === 'photo' || !rawInput)) {
      const cleanBase64 = String(image).replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, '').trim()
      const validMime = mimeType && ['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)
        ? mimeType
        : 'image/jpeg'

      interactionInput = [
        {
          type: 'text',
          text: `${baseSystemPrompt}

Examine the product packaging image carefully. Extract all visible ingredients, additives, allergens, and dietary warnings, then produce the requested JSON report.
${rawInput ? `Additional context: ${rawInput}` : ''}`
        },
        {
          type: 'image',
          data: cleanBase64,
          mime_type: validMime
        }
      ]
    } else {
      interactionInput = `${baseSystemPrompt}

Ingredient list to analyse:
${rawInput}`
    }

    const interaction = await ai.interactions.create({
      model: 'gemini-3.5-flash',
      input: interactionInput as Parameters<typeof ai.interactions.create>[0]['input'],
      response_format: {
        type: 'text',
        mime_type: 'application/json',
        schema: {
          type: "object",
          properties: {
            overallScore: { type: "number" },
            summary: { type: "string" },
            scoreBreakdown: {
              type: "object",
              properties: {
                highConcernCount: { type: "integer" },
                moderateConcernCount: { type: "integer" },
                lowConcernCount: { type: "integer" },
                biggestConcern: { type: "string" },
                easiestFix: { type: "string" }
              },
              required: ["highConcernCount", "moderateConcernCount", "lowConcernCount", "biggestConcern", "easiestFix"]
            },
            ingredients: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  normalisedName: { type: "string" },
                  origin: { type: "string" },
                  category: { type: "string" },
                  pros: {
                    type: "array",
                    items: { type: "string" }
                  },
                  cons: {
                    type: "array",
                    items: { type: "string" }
                  },
                  longTermEffects: {
                    type: "object",
                    properties: {
                      positive: {
                        type: "array",
                        items: { type: "string" }
                      },
                      negative: {
                        type: "array",
                        items: { type: "string" }
                      }
                    },
                    required: ["positive", "negative"]
                  },
                  riskLevel: {
                    type: "string",
                    enum: ["low", "moderate", "high"]
                  },
                  counter: {
                    type: "object",
                    properties: {
                      needed: { type: "boolean" },
                      nutrients: {
                        type: "array",
                        items: { type: "string" }
                      },
                      suggestions: {
                        type: "array",
                        items: { type: "string" }
                      }
                    },
                    required: ["needed", "nutrients", "suggestions"]
                  },
                  didYouKnow: { type: "string" }
                },
                required: ["name", "normalisedName", "origin", "category", "pros", "cons", "longTermEffects", "riskLevel", "counter", "didYouKnow"]
              }
            }
          },
          required: ["overallScore", "summary", "scoreBreakdown", "ingredients"]
        }
      }
    })

    const lastStep = interaction.steps.at(-1) as { content?: Array<{ text?: string }> } | undefined
    const rawText = lastStep?.content?.[0]?.text ?? ''

    let result: ScanResult
    try {
      result = parseLLMJSON(rawText)
    } catch {
      console.error('Failed to parse AI response:', rawText.slice(0, 300))
      return NextResponse.json(
        { error: 'AI returned an unparseable response. Please try again.' },
        { status: 502 },
      )
    }

    // ── Persist to DB if user is authenticated (awaited to prevent Vercel context termination) ──
    try {
      const fallbackInput = rawInput || (productName ? `Photo scan of ${productName}` : 'Photo scan label')
      await persistScan(fallbackInput, inputType ?? 'text', result, productName)
    } catch (err) {
      console.warn('Non-fatal: failed to persist scan', err)
    }

    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error('Scan error:', error)

    if ((error as { status?: number })?.status === 429) {
      return NextResponse.json(
        { error: 'AI quota exceeded. Please wait a moment and try again.' },
        { status: 429 },
      )
    }

    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

/**
 * Fire-and-forget: cache ingredients and log the scan for authenticated users.
 * Never blocks or throws to the caller.
 */
async function persistScan(
  rawInput: string,
  inputType: string,
  result: ScanResult,
  productName?: string,
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email || !result.ingredients?.length) return

  // Upsert user row
  await prisma.user.upsert({
    where: { id: user.id },
    create: { id: user.id, email: user.email },
    update: {},
  })

  // Upsert each ingredient into the cache
  const dbIngredients = await Promise.all(
    result.ingredients.map((ing: ScanIngredient) =>
      prisma.ingredient.upsert({
        where: { name: ing.normalisedName },
        create: {
          name: ing.normalisedName,
          aliases: [ing.name],
          origin: ing.origin ?? '',
          category: ing.category ?? '',
          pros: ing.pros ?? [],
          cons: ing.cons ?? [],
          longTermPos: ing.longTermEffects?.positive ?? [],
          longTermNeg: ing.longTermEffects?.negative ?? [],
          riskLevel: ing.riskLevel ?? 'low',
          counterNeeded: ing.counter?.needed ?? false,
          counterNutrients: ing.counter?.nutrients ?? [],
          counterSuggestions: ing.counter?.suggestions ?? [],
          didYouKnow: ing.didYouKnow ?? '',
        },
        update: { hitCount: { increment: 1 } },
      }),
    ),
  )

  // Create the scan record
  const scan = await prisma.scan.create({
    data: {
      userId: user.id,
      productName: productName ?? null,
      inputType: inputType ?? 'text',
      rawInput,
      overallScore: result.overallScore ?? 0,
      summary: result.summary ?? '',
      reportJson: result as unknown as Prisma.InputJsonValue,
    },
  })

  // Link ingredients to the scan and track exposure
  await Promise.all(
    dbIngredients.map(async ing => {
      await prisma.scanIngredient.create({
        data: { scanId: scan.id, ingredientId: ing.id },
      })

      const existing = await prisma.exposureTracking.findFirst({
        where: { userId: user.id, ingredientId: ing.id },
      })

      if (existing) {
        await prisma.exposureTracking.update({
          where: { id: existing.id },
          data: { exposureCount: { increment: 1 }, lastSeenAt: new Date() },
        })
      } else {
        await prisma.exposureTracking.create({
          data: {
            userId: user.id,
            ingredientId: ing.id,
            trend: 'stable',
            lastSeenAt: new Date(),
            products: [],
          },
        })
      }
    }),
  )
}
