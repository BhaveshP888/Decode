import { NextRequest, NextResponse } from 'next/server'

interface OpenFoodFactsResponse {
  status: number
  product?: {
    product_name?: string
    product_name_en?: string
    ingredients_text?: string
    ingredients_text_en?: string
    image_url?: string
    brands?: string
    categories?: string
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const barcode = searchParams.get('code')?.trim()

  if (!barcode || !/^\d{4,20}$/.test(barcode)) {
    return NextResponse.json(
      { error: 'Valid numeric barcode between 4 and 20 digits is required.' },
      { status: 400 },
    )
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 6000)

    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`,
      {
        headers: {
          'User-Agent': 'Decode - IngredientAnalyzer/1.0 (https://decode-dusky.vercel.app)',
        },
        signal: controller.signal,
      },
    )

    clearTimeout(timeoutId)

    if (!res.ok) {
      return NextResponse.json({
        found: false,
        barcode,
        message: 'Product not found in OpenFoodFacts database.',
      })
    }

    const data = (await res.json()) as OpenFoodFactsResponse

    if (data.status === 1 && data.product) {
      const productName =
        data.product.product_name ||
        data.product.product_name_en ||
        data.product.brands ||
        `Product #${barcode}`
      const ingredientsText =
        data.product.ingredients_text || data.product.ingredients_text_en || ''

      return NextResponse.json({
        found: true,
        barcode,
        productName,
        ingredientsText,
        imageUrl: data.product.image_url ?? null,
        brands: data.product.brands ?? null,
        hasIngredients: Boolean(ingredientsText.trim()),
      })
    }

    return NextResponse.json({
      found: false,
      barcode,
      message: 'Product barcode was not recognized. Please snap or upload a photo of the label.',
    })
  } catch {
    return NextResponse.json(
      {
        found: false,
        barcode,
        message: 'Unable to reach barcode catalog. Please snap a photo of the label.',
      },
      { status: 200 },
    )
  }
}
