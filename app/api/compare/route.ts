import { NextRequest, NextResponse } from 'next/server'
import { ai } from '@/lib/ai'
import { prisma } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'
import { Prisma } from '@prisma/client'

const MAX_DAILY_COMPARISONS = 2

function parseLLMJSON(text: string) {
  const cleaned = text.replace(/```(?:json)?\n?/g, '').trim()
  return JSON.parse(cleaned)
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const usedToday = await prisma.comparison.count({
      where: {
        userId: user.id,
        createdAt: { gte: oneDayAgo },
      },
    })

    const recentComparisons = await prisma.comparison.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    return NextResponse.json({
      usedToday,
      totalAllowed: MAX_DAILY_COMPARISONS,
      remainingToday: Math.max(0, MAX_DAILY_COMPARISONS - usedToday),
      recentComparisons,
    })
  } catch (error: unknown) {
    console.error('Error fetching comparison status:', error)
    return NextResponse.json({ error: 'Failed to fetch comparison status' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Please sign in to compare products.' }, { status: 401 })
    }

    const { products } = (await req.json()) as {
      products: Array<{ name: string; ingredients: string }>
    }

    if (!Array.isArray(products) || products.length < 2 || products.length > 4) {
      return NextResponse.json(
        { error: 'Comparison requires between 2 and 4 products.' },
        { status: 400 },
      )
    }

    for (let i = 0; i < products.length; i++) {
      const p = products[i]
      if (!p.name?.trim()) {
        return NextResponse.json(
          { error: `Product #${i + 1} is missing a name.` },
          { status: 400 },
        )
      }
      if (!p.ingredients?.trim()) {
        return NextResponse.json(
          { error: `Product #${i + 1} ("${p.name}") is missing ingredients.` },
          { status: 400 },
        )
      }
      if (p.ingredients.length > 6000) {
        return NextResponse.json(
          { error: `Product #${i + 1} ingredients text exceeds 6,000 characters limit.` },
          { status: 400 },
        )
      }
    }

    // ── 24-Hour Rate Limiting Protection ──
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const usedToday = await prisma.comparison.count({
      where: {
        userId: user.id,
        createdAt: { gte: oneDayAgo },
      },
    })

    if (usedToday >= MAX_DAILY_COMPARISONS) {
      return NextResponse.json(
        {
          error:
            'You have reached the daily limit of 2 product comparisons per 24 hours. This protects API resources. Please try again tomorrow.',
          limitReached: true,
          remainingToday: 0,
        },
        { status: 429 },
      )
    }

    // ── Prepare Multi-Product Comparison Prompt ──
    const productDescriptions = products
      .map(
        (p, idx) =>
          `[PRODUCT ${idx + 1}: ${p.name.trim()}]\nIngredients:\n${p.ingredients.trim()}`,
      )
      .join('\n\n')

    const prompt = `You are a biochemical ingredient analyst and consumer advocate.
Compare the following ${products.length} products side-by-side. Analyze their ingredient purity, health safety scores (0-10), additive toxicity, processing levels, and determine which product is the healthiest choice ("The Winner").

${productDescriptions}

Return a single JSON object matching this exact schema:
{
  "winnerIndex": <0-based index of the cleanest product among the input items>,
  "winnerName": "<name of the winning product>",
  "verdictHeadline": "<One bold sentence summarizing the outcome, e.g., 'Brand A offers significantly cleaner sweeteners without emulsifiers.'>",
  "verdictSummary": "<2-3 paragraph detailed breakdown comparing the options, explaining why the winner was chosen, and detailing trade-offs>",
  "products": [
    {
      "index": <0-based index matching input>,
      "name": "<product name>",
      "overallScore": <number 0-10, where 10 is purest/safest>,
      "additiveCount": <total count of synthetic/additive ingredients>,
      "highConcernCount": <count of high-risk additives>,
      "moderateConcernCount": <count of moderate-risk additives>,
      "lowConcernCount": <count of low-risk ingredients>,
      "keyConcerns": ["<concern 1>", "<concern 2>"],
      "keyPros": ["<pro 1>", "<pro 2>"],
      "verdictNote": "<1 sentence takeaway for this specific product>"
    }
  ],
  "comparisonPoints": [
    {
      "category": "<e.g. 'Preservatives & Gums', 'Sweetener Profile', 'Artificial Colorants', 'Processing & Clean Label'>",
      "findings": ["<finding for product 1>", "<finding for product 2>"]
    }
  ],
  "bottomLineRecommendation": "<Clear practical advice for the consumer>"
}

Return ONLY the JSON object. No markdown formatting, no code fences.`

    const interaction = await ai.interactions.create({
      model: 'gemini-3.5-flash',
      input: prompt,
      response_format: {
        type: 'text',
        mime_type: 'application/json',
        schema: {
          type: 'object',
          properties: {
            winnerIndex: { type: 'integer' },
            winnerName: { type: 'string' },
            verdictHeadline: { type: 'string' },
            verdictSummary: { type: 'string' },
            products: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  index: { type: 'integer' },
                  name: { type: 'string' },
                  overallScore: { type: 'number' },
                  additiveCount: { type: 'integer' },
                  highConcernCount: { type: 'integer' },
                  moderateConcernCount: { type: 'integer' },
                  lowConcernCount: { type: 'integer' },
                  keyConcerns: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  keyPros: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  verdictNote: { type: 'string' },
                },
                required: [
                  'index',
                  'name',
                  'overallScore',
                  'additiveCount',
                  'highConcernCount',
                  'moderateConcernCount',
                  'lowConcernCount',
                  'keyConcerns',
                  'keyPros',
                  'verdictNote',
                ],
              },
            },
            comparisonPoints: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  category: { type: 'string' },
                  findings: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                },
                required: ['category', 'findings'],
              },
            },
            bottomLineRecommendation: { type: 'string' },
          },
          required: [
            'winnerIndex',
            'winnerName',
            'verdictHeadline',
            'verdictSummary',
            'products',
            'comparisonPoints',
            'bottomLineRecommendation',
          ],
        },
      },
    })

    const lastStep = interaction.steps.at(-1) as { content?: Array<{ text?: string }> } | undefined
    const rawText = lastStep?.content?.[0]?.text ?? ''

    let comparisonResult
    try {
      comparisonResult = parseLLMJSON(rawText)
    } catch {
      console.error('Failed to parse AI comparison response:', rawText.slice(0, 300))
      return NextResponse.json(
        { error: 'AI returned an unparseable comparison. Please try again.' },
        { status: 502 },
      )
    }

    // ── Save Comparison to Database ──
    const savedRecord = await prisma.comparison.create({
      data: {
        userId: user.id,
        productNames: products.map(p => p.name.trim()),
        verdict: comparisonResult.verdictHeadline ?? '',
        winnerIndex: comparisonResult.winnerIndex ?? 0,
        reportJson: comparisonResult as unknown as Prisma.InputJsonValue,
      },
    })

    const newRemaining = Math.max(0, MAX_DAILY_COMPARISONS - (usedToday + 1))

    return NextResponse.json({
      ...comparisonResult,
      id: savedRecord.id,
      remainingToday: newRemaining,
      totalAllowed: MAX_DAILY_COMPARISONS,
    })
  } catch (error: unknown) {
    console.error('Comparison error:', error)
    if ((error as { status?: number })?.status === 429) {
      return NextResponse.json(
        { error: 'AI quota exceeded. Please wait a moment and try again.' },
        { status: 429 },
      )
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
