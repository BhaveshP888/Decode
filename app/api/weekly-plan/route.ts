import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { chatModel } from "@/lib/ai";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { WeeklyPlanSchema } from "@/lib/schemas";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user's exposures
    const exposures = await prisma.exposureTracking.findMany({
      where: { userId: user.id },
      include: {
        ingredient: true
      },
      orderBy: { exposureCount: 'desc' },
      take: 20 // Top 20 exposures
    });

    if (exposures.length === 0) {
      return NextResponse.json({ error: "Not enough data to generate a plan" }, { status: 400 });
    }

    // Format data for AI
    const exposureData = exposures.map(exp => ({
      name: exp.ingredient.name,
      riskLevel: exp.ingredient.riskLevel,
      count: exp.exposureCount,
      counterNutrients: exp.ingredient.counterNutrients,
    }));

    const prompt = `Based on the following ingredient exposure profile for a user over the past week, generate a counter-plan to mitigate the negative effects.
Focus on adding specific foods, nutrients, and simple swaps to their diet.
IMPORTANT: If you see pharmaceutical ingredients or medicines, DO NOT suggest medical advice. Stick to general wellness and nutritional counters for food additives.

Exposure Data: ${JSON.stringify(exposureData)}

Provide:
- weekOf: label for the current week (e.g. "Week of Oct 12")
- topConcerns: key recurring additive or ingredient concerns
- nutrientsToIncrease: list of nutrients with reasons and foodSources
- simpleSwaps: list of avoid / replaceWith practical swaps
- message: concise encouraging weekly summary`;

    const { object: rawData } = await generateObject({
      model: chatModel,
      schema: WeeklyPlanSchema,
      prompt,
    });

    const validation = WeeklyPlanSchema.safeParse(rawData);

    if (!validation.success) {
      console.error("Weekly plan schema validation failed:", validation.error.format());
      return NextResponse.json({ error: "Failed to generate valid plan format" }, { status: 502 });
    }

    return NextResponse.json(validation.data);
  } catch (error: unknown) {
    console.error("Error generating weekly plan:", error);

    const isQuota =
      (error as { status?: number; statusCode?: number })?.status === 429 ||
      (error as { status?: number; statusCode?: number })?.statusCode === 429 ||
      (error instanceof Error && error.message.toLowerCase().includes("quota"));

    if (isQuota) {
      return NextResponse.json(
        { error: "AI quota exceeded. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
