import { NextResponse } from "next/server";
import { ai } from "@/lib/ai";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

function parseLLMJSON(text: string) {
  try {
    const cleaned = text.replace(/```(?:json)?\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("Failed to parse LLM JSON:", text);
    throw e;
  }
}

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
    
    Return a valid JSON object matching this structure:
    {
      "weekOf": "string (e.g. Week of Oct 12)",
      "topConcerns": ["string"],
      "nutrientsToIncrease": [
        { "nutrient": "string", "reason": "string", "foodSources": ["string"] }
      ],
      "simpleSwaps": [
        { "avoid": "string", "replaceWith": "string" }
      ],
      "message": "string"
    }`;

    const interaction = await ai.interactions.create({
      model: "gemini-3.5-flash",
      input: prompt,
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: {
          type: "object",
          properties: {
            weekOf: { type: "string" },
            topConcerns: {
              type: "array",
              items: { type: "string" }
            },
            nutrientsToIncrease: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  nutrient: { type: "string" },
                  reason: { type: "string" },
                  foodSources: {
                    type: "array",
                    items: { type: "string" }
                  }
                },
                required: ["nutrient", "reason", "foodSources"]
              }
            },
            simpleSwaps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  avoid: { type: "string" },
                  replaceWith: { type: "string" }
                },
                required: ["avoid", "replaceWith"]
              }
            },
            message: { type: "string" }
          },
          required: ["weekOf", "topConcerns", "nutrientsToIncrease", "simpleSwaps", "message"]
        }
      }
    });

    const lastStep = interaction.steps.at(-1) as { content?: Array<{ text?: string }> } | undefined;
    const content = lastStep?.content?.[0]?.text;
    const planData = content ? parseLLMJSON(content) : null;

    if (!planData) {
      throw new Error("Failed to generate plan");
    }

    return NextResponse.json(planData);
  } catch (error: unknown) {
    console.error("Error generating weekly plan:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
