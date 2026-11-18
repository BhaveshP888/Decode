import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { BentoScanHeader } from "@/components/bento-scan-header";
import {
  HouseholdStatusBar,
  evaluateHouseholdMembers,
  type HouseholdProfileMember,
} from "@/components/household-status-bar";

describe("BentoScanHeader Visual Precedence", () => {
  it("renders allergen danger banner and demotes purity score when conflict exists", () => {
    const html = renderToStaticMarkup(
      React.createElement(BentoScanHeader, {
        purityScore: 9.5,
        productName: "Organic Almond Butter",
        allergenAlert: { hasConflict: true, conflictingAllergens: ["Almond"] },
      })
    );

    expect(html).toContain("ALLERGEN CONFLICT");
    expect(html).toContain("Almond");
    expect(html).toContain("Organic Almond Butter");
    expect(html).toContain("Biochemical Purity: 9.5 (Unsafe for User Profile)");
    expect(html).toContain('role="alert"');

    // Danger banner must precede the demoted purity score pill in DOM order
    const alertIndex = html.indexOf("ALLERGEN CONFLICT");
    const demotedIndex = html.indexOf("Biochemical Purity: 9.5 (Unsafe for User Profile)");
    expect(alertIndex).toBeGreaterThan(-1);
    expect(demotedIndex).toBeGreaterThan(alertIndex);
  });

  it("displays all violating allergens when multiple conflicts are present", () => {
    const html = renderToStaticMarkup(
      React.createElement(BentoScanHeader, {
        purityScore: 8.2,
        productName: "Protein Trail Mix",
        allergenAlert: {
          hasConflict: true,
          conflictingAllergens: ["Peanuts", "Whey Protein"],
        },
      })
    );

    expect(html).toContain("ALLERGEN CONFLICT");
    expect(html).toContain("Peanuts");
    expect(html).toContain("Whey Protein");
    expect(html).toContain("Biochemical Purity: 8.2 (Unsafe for User Profile)");
  });

  it("renders prominent green purity score presentation when hasConflict is false", () => {
    const html = renderToStaticMarkup(
      React.createElement(BentoScanHeader, {
        purityScore: 9.5,
        productName: "Organic Rolled Oats",
        allergenAlert: { hasConflict: false, conflictingAllergens: [] },
      })
    );

    expect(html).not.toContain("ALLERGEN CONFLICT");
    expect(html).not.toContain("Unsafe for User Profile");
    expect(html).toContain("Organic Rolled Oats");
    expect(html).toContain("9.5");
    expect(html).toContain("/10");
    expect(html).toContain("emerald");
  });

  it("renders standard amber and red purity tiers when allergenAlert is omitted", () => {
    const amberHtml = renderToStaticMarkup(
      React.createElement(BentoScanHeader, {
        purityScore: 5.5,
        productName: "Flavored Granola",
      })
    );

    expect(amberHtml).not.toContain("ALLERGEN CONFLICT");
    expect(amberHtml).toContain("5.5");
    expect(amberHtml).toContain("amber");

    const redHtml = renderToStaticMarkup(
      React.createElement(BentoScanHeader, {
        purityScore: 2.5,
        productName: "Artificial Soda",
      })
    );

    expect(redHtml).not.toContain("ALLERGEN CONFLICT");
    expect(redHtml).toContain("2.5");
    expect(redHtml).toContain("red");
  });
});

describe("HouseholdStatusBar & Member Compatibility", () => {
  const sampleMembers: HouseholdProfileMember[] = [
    {
      id: "self",
      name: "Self",
      role: "Self",
      allergens: ["peanuts"],
      dietaryRegimes: [],
      healthConditions: [],
    },
    {
      id: "partner",
      name: "Partner",
      role: "Partner",
      allergens: [],
      dietaryRegimes: ["vegan"],
      healthConditions: [],
    },
    {
      id: "child",
      name: "Child",
      role: "Child",
      allergens: ["tree_nuts"],
      dietaryRegimes: [],
      healthConditions: [],
    },
  ];

  const sampleIngredients = [
    { name: "Roasted Almonds", normalisedName: "almond", riskLevel: "low" as const },
    { name: "Organic Honey", normalisedName: "honey", riskLevel: "low" as const },
  ];

  it("classifies household members into safe, caution, and danger statuses", () => {
    const evaluations = evaluateHouseholdMembers(sampleMembers, sampleIngredients, {
      hasConflict: false,
      conflictingAllergens: [],
    });

    expect(evaluations).toHaveLength(3);
    expect(evaluations[0].status).toBe("safe");
    expect(evaluations[1].status).toBe("caution");
    expect(evaluations[1].dietaryWarnings.length).toBeGreaterThan(0);
    expect(evaluations[2].status).toBe("danger");
    expect(evaluations[2].conflictingAllergens).toContain("Roasted Almonds");
  });

  it("renders interactive avatar chips for each household member", () => {
    const html = renderToStaticMarkup(
      React.createElement(HouseholdStatusBar, {
        members: sampleMembers,
        ingredients: sampleIngredients,
        allergenAlert: { hasConflict: false, conflictingAllergens: [] },
        overallScore: 8.8,
      })
    );

    expect(html).toContain("Self");
    expect(html).toContain("Partner");
    expect(html).toContain("Child");
    expect(html).toContain("Safe");
    expect(html).toContain("Caution");
    expect(html).toContain("Conflict");
  });
});
