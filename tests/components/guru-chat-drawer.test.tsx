import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { UIMessage } from "ai";

import {
  EducationalInteractionCard,
  GuruChatDrawer,
  GuruMessageList,
  MEDICAL_ADVISORY_DISCLAIMER,
  extractToolBadgesFromMessage,
  hasPharmaceuticalContent,
} from "@/components/guru-chat-drawer";
import {
  buildSanitizedMessages,
  createOutOfDomainUIMessageResponse,
  extractMessageText,
} from "@/app/api/chat/guru/route";

describe("EducationalInteractionCard", () => {
  it("renders structured pharmaceutical interaction details with prominent medical advisory disclaimer", () => {
    const html = renderToStaticMarkup(
      React.createElement(EducationalInteractionCard, {
        interaction: {
          drugName: "Atorvastatin",
          foodOrSubstance: "Grapefruit Juice",
          mechanism:
            "Furanocoumarins in grapefruit irreversibly inhibit intestinal CYP3A4 enzymes, elevating systemic statin exposure.",
          clinicalObservation:
            "Increased serum drug concentration may heighten the risk of myopathy or rhabdomyolysis.",
          advisoryDisclaimer: MEDICAL_ADVISORY_DISCLAIMER,
        },
      })
    );

    expect(html).toContain("Educational Interaction Reference");
    expect(html).toContain("Atorvastatin");
    expect(html).toContain("Grapefruit Juice");
    expect(html).toContain("Biochemical Mechanism");
    expect(html).toContain("CYP3A4");
    expect(html).toContain("Clinical Observation");
    expect(html).toContain("Medical Advisory Disclaimer");
    expect(html).toContain(MEDICAL_ADVISORY_DISCLAIMER);
    expect(html).toContain('role="note"');
  });

  it("renders unstructured pharmaceutical guidance with fallback advisory disclaimer", () => {
    const html = renderToStaticMarkup(
      React.createElement(EducationalInteractionCard, {
        content:
          "Vitamin K in leafy greens directly antagonizes warfarin's inhibition of vitamin K epoxide reductase.",
      })
    );

    expect(html).toContain("vitamin K epoxide reductase");
    expect(html).toContain("Medical Advisory Disclaimer");
    expect(html).toContain(MEDICAL_ADVISORY_DISCLAIMER);
  });
});

describe("GuruMessageList & Tool Execution Badges", () => {
  it("renders active streaming tool execution badges for all Health Guru tools", () => {
    const message = {
      id: "msg-tools-active",
      role: "assistant",
      parts: [
        {
          type: "tool-searchIngredientToxicology",
          toolCallId: "tc-1",
          state: "input-available",
          input: { ingredientName: "Sodium Benzoate", query: "E211 EFSA monograph" },
        },
        {
          type: "tool-checkPersonalCompatibility",
          toolCallId: "tc-2",
          state: "input-streaming",
          input: { ingredients: ["Sodium Benzoate"] },
        },
        {
          type: "dynamic-tool",
          toolName: "findCleanSwaps",
          toolCallId: "tc-3",
          state: "input-available",
          input: { category: "beverages" },
        },
        {
          type: "tool-getUserScanHistory",
          toolCallId: "tc-4",
          state: "input-available",
          input: { limitDays: 30 },
        },
      ],
    } as unknown as UIMessage;

    const badges = extractToolBadgesFromMessage(message);
    expect(badges).toHaveLength(4);
    expect(badges.map((b) => b.status)).toEqual(["running", "running", "running", "running"]);

    const html = renderToStaticMarkup(
      React.createElement(GuruMessageList, {
        messages: [message],
        isStreaming: true,
      })
    );

    expect(html).toContain("Consulting toxicology monographs...");
    expect(html).toContain("Checking allergy profile...");
    expect(html).toContain("Scanning cleaner swaps...");
    expect(html).toContain("Reviewing scan history...");
    expect(html).toContain("Health Guru is synthesizing evidence...");
  });

  it("renders completed tool badges and wraps pharmaceutical responses in EducationalInteractionCard", () => {
    const pharmaReply =
      "Grapefruit inhibits intestinal CYP3A4 metabolism of simvastatin, raising plasma levels. " +
      MEDICAL_ADVISORY_DISCLAIMER;

    expect(hasPharmaceuticalContent(pharmaReply)).toBe(true);
    expect(hasPharmaceuticalContent("Rolled oats provide soluble beta-glucan fiber.")).toBe(false);

    const messages = [
      {
        id: "u-1",
        role: "user",
        parts: [{ type: "text", text: "Does grapefruit interact with simvastatin?" }],
      },
      {
        id: "a-1",
        role: "assistant",
        parts: [
          {
            type: "tool-searchIngredientToxicology",
            toolCallId: "tc-done-1",
            state: "output-available",
            input: { ingredientName: "Grapefruit", query: "CYP3A4 statin" },
            output: [],
          },
          {
            type: "text",
            text: pharmaReply,
          },
        ],
      },
    ] as unknown as UIMessage[];

    const html = renderToStaticMarkup(
      React.createElement(GuruMessageList, { messages })
    );

    expect(html).toContain("Does grapefruit interact with simvastatin?");
    expect(html).toContain("Toxicology monographs consulted");
    expect(html).toContain('data-testid="educational-interaction-card"');
    expect(html).toContain('data-testid="medical-advisory-disclaimer"');
    expect(html).toContain(MEDICAL_ADVISORY_DISCLAIMER);
  });
});

describe("GuruChatDrawer Rendering", () => {
  it("renders nothing when closed", () => {
    const html = renderToStaticMarkup(
      React.createElement(GuruChatDrawer, {
        isOpen: false,
        onClose: () => {},
      })
    );

    expect(html).toBe("");
  });

  it("renders open slide-over dialog with pre-populated product context and allergen conflict", () => {
    const html = renderToStaticMarkup(
      React.createElement(GuruChatDrawer, {
        isOpen: true,
        onClose: () => {},
        productContext: {
          productName: "Artisan Almond Granola",
          purityScore: 8.4,
          allergenAlert: {
            hasConflict: true,
            conflictingAllergens: ["Almond"],
          },
          ingredients: [
            { name: "Roasted Almonds", riskLevel: "low", allergenConflict: true },
            { name: "Organic Oats", riskLevel: "low" },
          ],
        },
        initialPrompt: "Is Artisan Almond Granola safe for my profile?",
      })
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain("Decode Health Guru");
    expect(html).toContain("Active Scan Context");
    expect(html).toContain("Artisan Almond Granola");
    expect(html).toContain("Purity: 8.4/10");
    expect(html).toContain("Allergen Conflict: Almond");
    expect(html).toContain("Roasted Almonds");
    expect(html).toContain(MEDICAL_ADVISORY_DISCLAIMER);
  });
});

describe("Health Guru AI SDK v7 UIMessage Protocol Compatibility", () => {
  it("extracts text from both AI SDK v7 UIMessage parts and legacy content messages", () => {
    expect(
      extractMessageText({
        role: "user",
        parts: [{ type: "text", text: "Is potassium sorbate safe?" }],
      })
    ).toBe("Is potassium sorbate safe?");

    expect(
      extractMessageText({
        role: "user",
        content: "Legacy message format",
      })
    ).toBe("Legacy message format");

    const sanitized = buildSanitizedMessages([
      { role: "user", parts: [{ type: "text", text: "Check E211 toxicity" }] },
    ]);
    expect(sanitized).toHaveLength(2);
    expect(sanitized[1]).toEqual({ role: "user", content: "Check E211 toxicity" });
  });

  it("returns AI SDK v7 SSE UIMessageStream for out-of-domain refusals", async () => {
    const response = createOutOfDomainUIMessageResponse("Domain refusal test");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/event-stream");
    expect(response.headers.get("x-vercel-ai-ui-message-stream")).toBe("v1");

    const streamBody = await response.text();
    expect(streamBody).toContain('"type":"text-delta"');
    expect(streamBody).toContain("Domain refusal test");
    expect(streamBody).toContain("[DONE]");
  });
});
