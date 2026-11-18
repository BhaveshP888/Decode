import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  IngredientCitationCard,
  isSafeHttpUrl,
} from "@/components/dashboard";

describe("IngredientCitationCard & Regulatory Citation URL Safety", () => {
  it("validates http and https URLs while rejecting javascript, data, and relative URLs", () => {
    expect(isSafeHttpUrl("https://www.efsa.europa.eu/en/efsajournal/pub/4433")).toBe(true);
    expect(isSafeHttpUrl("http://www.fda.gov/food/food-additives")).toBe(true);
    expect(isSafeHttpUrl("  https://example.org/monograph  ")).toBe(true);

    expect(isSafeHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeHttpUrl("JAVASCRIPT:alert(1)")).toBe(false);
    expect(isSafeHttpUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isSafeHttpUrl("vbscript:msgbox(1)")).toBe(false);
    expect(isSafeHttpUrl("/relative/path")).toBe(false);
    expect(isSafeHttpUrl("")).toBe(false);
  });

  it("renders regulatoryBody, summary, and safe external link for valid https URL", () => {
    const html = renderToStaticMarkup(
      React.createElement(IngredientCitationCard, {
        citation: {
          regulatoryBody: "EFSA",
          summary: "Acceptable Daily Intake (ADI) of 5 mg/kg body weight per day.",
          citationUrl: "https://www.efsa.europa.eu/en/efsajournal/pub/4433",
        },
      })
    );

    expect(html).toContain("Regulatory Monograph");
    expect(html).toContain("EFSA");
    expect(html).toContain("Acceptable Daily Intake (ADI) of 5 mg/kg body weight per day.");
    expect(html).toContain('href="https://www.efsa.europa.eu/en/efsajournal/pub/4433"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("View official monograph");
  });

  it("renders regulatoryBody and summary without anchor tag when citationUrl uses unsafe protocol", () => {
    const html = renderToStaticMarkup(
      React.createElement(IngredientCitationCard, {
        citation: {
          regulatoryBody: "FDA",
          summary: "Evaluated for safe use in food formulations.",
          citationUrl: "javascript:alert('xss')",
        },
      })
    );

    expect(html).toContain("FDA");
    expect(html).toContain("Evaluated for safe use in food formulations.");
    expect(html).not.toContain("<a ");
    expect(html).not.toContain("javascript:");
  });
});
