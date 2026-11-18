"use client";

import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import {
  ShieldCheck,
  Users,
  Warning,
  WarningOctagon,
  X,
} from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import type { AllergenAlert } from "@/components/bento-scan-header";

export type SafetyStatus = "safe" | "caution" | "danger";

export interface HouseholdProfileMember {
  id: string;
  name: string;
  role?: string;
  allergens: string[];
  dietaryRegimes: string[];
  healthConditions: string[];
}

export interface ScanIngredientSummary {
  name: string;
  normalisedName?: string;
  category?: string;
  riskLevel?: "low" | "moderate" | "high";
  allergenConflict?: boolean;
}

export interface HouseholdMemberEvaluation {
  member: HouseholdProfileMember;
  status: SafetyStatus;
  conflictingAllergens: string[];
  dietaryWarnings: string[];
  healthNotes: string[];
}

export interface HouseholdStatusBarProps {
  members: HouseholdProfileMember[];
  ingredients?: ScanIngredientSummary[];
  allergenAlert?: AllergenAlert;
  overallScore?: number;
  className?: string;
}

const CLIENT_ALLERGEN_PATTERNS: Record<string, RegExp> = {
  tree_nuts:
    /\b(almonds?|walnuts?|cashews?|pecans?|pistachios?|macadamias?|hazelnuts?|brazil nuts?|chestnuts?|pine nuts?|tree nuts?)\b/i,
  tree_nut:
    /\b(almonds?|walnuts?|cashews?|pecans?|pistachios?|macadamias?|hazelnuts?|brazil nuts?|chestnuts?|pine nuts?|tree nuts?)\b/i,
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
  shellfish:
    /\b(shellfish|crustaceans?|shrimps?|prawns?|crabs?|lobsters?|clams?|mussels?|oysters?|scallops?|crawfish)\b/i,
  fish: /\b(fish|cod|salmon|tuna|anchov(?:y|ies)|tilapia|bass|trout|halibut|haddock)\b/i,
  sesame: /\b(sesame|tahini)\b/i,
  sulfites: /\b(sulfites?|sulphites?|sulfur dioxide|sulphur dioxide)\b/i,
  sulfite: /\b(sulfites?|sulphites?|sulfur dioxide|sulphur dioxide)\b/i,
};

const DIETARY_REGIME_PATTERNS: Record<string, { pattern: RegExp; label: string }> = {
  vegan: {
    pattern:
      /\b(milk|dairy|whey|casein|butter|cheese|cream|yogurt|ghee|eggs?|honey|gelatin|collagen|carmine|shellac|beef|pork|chicken|fish|anchov(?:y|ies)|lard|tallow)\b/i,
    label: "Vegan restriction",
  },
  vegetarian: {
    pattern:
      /\b(gelatin|collagen|carmine|beef|pork|chicken|turkey|lamb|fish|anchov(?:y|ies)|shrimp|prawn|lard|tallow|rennet)\b/i,
    label: "Vegetarian restriction",
  },
  gluten_free: {
    pattern: /\b(gluten|wheat|barley|rye|spelt|kamut|semolina|malt|triticale)\b/i,
    label: "Gluten-Free restriction",
  },
  dairy_free: {
    pattern: /\b(milk|dairy|lactose|casein|whey|butter|cheese|cream|yogurt|curd|ghee)\b/i,
    label: "Dairy-Free restriction",
  },
  keto: {
    pattern:
      /\b(sugar|high fructose corn syrup|corn syrup|dextrose|maltodextrin|cane sugar|sucrose|fructose|honey|agave|molasses|wheat flour)\b/i,
    label: "Keto / Low-Carb restriction",
  },
  low_sugar: {
    pattern:
      /\b(sugar|high fructose corn syrup|corn syrup|dextrose|sucrose|fructose|honey|agave|molasses|invert sugar)\b/i,
    label: "Low-Sugar restriction",
  },
  clean_label: {
    pattern:
      /\b(red 40|yellow 5|yellow 6|blue 1|bht|bha|tbhq|sodium benzoate|potassium sorbate|aspartame|sucralose|acesulfame|titanium dioxide|polysorbate|carrageenan|artificial flavor)\b/i,
    label: "Clean-Label preference",
  },
};

const HEALTH_CONDITION_PATTERNS: Record<string, { pattern: RegExp; label: string }> = {
  diabetes: {
    pattern:
      /\b(sugar|high fructose corn syrup|corn syrup|dextrose|maltodextrin|sucrose|fructose|glucose syrup|invert sugar)\b/i,
    label: "Glycemic caution (Diabetes)",
  },
  prediabetes: {
    pattern:
      /\b(sugar|high fructose corn syrup|corn syrup|dextrose|maltodextrin|sucrose|fructose|glucose syrup)\b/i,
    label: "Glycemic caution (Prediabetes)",
  },
  hypertension: {
    pattern: /\b(sodium|salt|monosodium glutamate|msg|sodium nitrite|sodium benzoate)\b/i,
    label: "Sodium caution (Hypertension)",
  },
  celiac: {
    pattern: /\b(gluten|wheat|barley|rye|spelt|kamut|semolina|malt|triticale)\b/i,
    label: "Gluten avoidance (Celiac)",
  },
  lactose_intolerance: {
    pattern: /\b(milk|dairy|lactose|whey|cream|yogurt|curd|cheese)\b/i,
    label: "Lactose sensitivity",
  },
};

function normalizeTagKey(tag: string): string {
  return tag.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function matchesClientAllergen(ingredientText: string, allergenTag: string): boolean {
  const normalizedTag = normalizeTagKey(allergenTag);
  const pattern = CLIENT_ALLERGEN_PATTERNS[normalizedTag];

  if (pattern) {
    if (["dairy", "milk", "lactose"].includes(normalizedTag)) {
      if (
        /\b(almond|soy|oat|coconut|rice|cashew|hemp)\s+milk\b/i.test(ingredientText) &&
        !/\b(cow|dairy|whole|skim|dry|powder)\s+milk\b/i.test(ingredientText)
      ) {
        const stripped = ingredientText.replace(
          /\b(almond|soy|oat|coconut|rice|cashew|hemp)\s+milk\b/gi,
          ""
        );
        return pattern.test(stripped);
      }
    }
    if (pattern.test(ingredientText)) {
      return true;
    }
  }

  const cleanedTag = allergenTag.trim().toLowerCase();
  return cleanedTag.length > 2 && ingredientText.toLowerCase().includes(cleanedTag);
}

function matchesNonPlantDairy(ingredientText: string, pattern: RegExp): boolean {
  if (
    /\b(almond|soy|oat|coconut|rice|cashew|hemp)\s+milk\b/i.test(ingredientText) &&
    !/\b(cow|dairy|whole|skim|dry|powder)\s+milk\b/i.test(ingredientText)
  ) {
    const stripped = ingredientText.replace(
      /\b(almond|soy|oat|coconut|rice|cashew|hemp)\s+milk\b/gi,
      ""
    );
    return pattern.test(stripped);
  }
  return pattern.test(ingredientText);
}

export function evaluateHouseholdMembers(
  members: HouseholdProfileMember[],
  ingredients: ScanIngredientSummary[] = [],
  allergenAlert?: AllergenAlert,
  overallScore?: number
): HouseholdMemberEvaluation[] {
  return members.map((member) => {
    const conflictingAllergens: string[] = [];
    const dietaryWarnings: string[] = [];
    const healthNotes: string[] = [];

    const addUnique = (list: string[], value: string) => {
      if (!list.includes(value)) {
        list.push(value);
      }
    };

    // Keep primary Self profile synchronized with server-verified allergenAlert
    if (member.id === "self" && allergenAlert?.hasConflict) {
      for (const allergen of allergenAlert.conflictingAllergens) {
        addUnique(conflictingAllergens, allergen);
      }
    }

    for (const ing of ingredients) {
      const candidateText = `${ing.name} ${ing.normalisedName ?? ""}`.trim();

      for (const allergen of member.allergens) {
        if (matchesClientAllergen(candidateText, allergen)) {
          addUnique(conflictingAllergens, ing.name);
        }
      }

      for (const regime of member.dietaryRegimes) {
        const key = normalizeTagKey(regime);
        const rule = DIETARY_REGIME_PATTERNS[key];
        if (!rule) continue;

        const isDairyRule = key === "vegan" || key === "dairy_free";
        const matched = isDairyRule
          ? matchesNonPlantDairy(candidateText, rule.pattern)
          : rule.pattern.test(candidateText);

        if (matched) {
          addUnique(dietaryWarnings, `${ing.name} (${rule.label})`);
        } else if (key === "clean_label" && ing.riskLevel === "high") {
          addUnique(dietaryWarnings, `${ing.name} (High-concern additive)`);
        }
      }

      for (const condition of member.healthConditions) {
        const key = normalizeTagKey(condition);
        const rule = HEALTH_CONDITION_PATTERNS[key];
        if (!rule) continue;

        const isLactoseRule = key === "lactose_intolerance";
        const matched = isLactoseRule
          ? matchesNonPlantDairy(candidateText, rule.pattern)
          : rule.pattern.test(candidateText);

        if (matched) {
          addUnique(healthNotes, `${ing.name} (${rule.label})`);
        }
      }
    }

    let status: SafetyStatus = "safe";
    if (conflictingAllergens.length > 0) {
      status = "danger";
    } else if (
      dietaryWarnings.length > 0 ||
      healthNotes.length > 0 ||
      (typeof overallScore === "number" && overallScore < 4)
    ) {
      status = "caution";
    }

    return {
      member,
      status,
      conflictingAllergens,
      dietaryWarnings,
      healthNotes,
    };
  });
}

function getStatusStyles(status: SafetyStatus) {
  switch (status) {
    case "danger":
      return {
        label: "Conflict",
        chipClasses:
          "border-red-500/40 bg-red-500/15 text-red-200 hover:bg-red-500/25 focus-visible:ring-red-500/40",
        dotClasses: "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.75)]",
        badgeClasses: "bg-red-500/15 text-red-300 border-red-500/30",
        avatarClasses: "bg-red-500/25 text-red-100 border-red-400/40",
      };
    case "caution":
      return {
        label: "Caution",
        chipClasses:
          "border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 focus-visible:ring-amber-500/40",
        dotClasses: "bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.65)]",
        badgeClasses: "bg-amber-500/15 text-amber-300 border-amber-500/30",
        avatarClasses: "bg-amber-500/20 text-amber-100 border-amber-400/35",
      };
    case "safe":
      return {
        label: "Safe",
        chipClasses:
          "border-emerald-500/25 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 focus-visible:ring-emerald-500/40",
        dotClasses: "bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.65)]",
        badgeClasses: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
        avatarClasses: "bg-emerald-500/20 text-emerald-100 border-emerald-400/35",
      };
  }
}

function formatTag(tag: string): string {
  return tag.replace(/_/g, " ");
}

export function HouseholdStatusBar({
  members,
  ingredients = [],
  allergenAlert,
  overallScore,
  className,
}: HouseholdStatusBarProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  if (members.length === 0) {
    return null;
  }

  const evaluations = evaluateHouseholdMembers(
    members,
    ingredients,
    allergenAlert,
    overallScore
  );

  const selectedEvaluation =
    evaluations.find((entry) => entry.member.id === selectedMemberId) ?? null;

  return (
    <div
      className={cn(
        "w-full rounded-2xl border border-white/5 bg-zinc-900/40 backdrop-blur-md px-4 py-3.5 sm:px-5 flex flex-wrap items-center justify-between gap-3",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <Users size={16} className="text-zinc-400" aria-hidden="true" />
        <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
          Household Status
        </span>
      </div>

      <ul className="flex flex-wrap items-center gap-2 list-none m-0 p-0" aria-label="Household members">
        {evaluations.map((evaluation) => {
          const styles = getStatusStyles(evaluation.status);
          const initial = evaluation.member.name.trim().charAt(0).toUpperCase() || "U";

          return (
            <li key={evaluation.member.id}>
              <button
                type="button"
                aria-haspopup="dialog"
                onClick={() => setSelectedMemberId(evaluation.member.id)}
                aria-label={`Inspect ${evaluation.member.name} compatibility: ${styles.label}`}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border pl-1.5 pr-3 py-1 text-xs font-medium transition-all cursor-pointer outline-none focus-visible:ring-2",
                  styles.chipClasses
                )}
              >
                <span
                  className={cn(
                    "w-6 h-6 rounded-full border text-[11px] font-bold flex items-center justify-center shrink-0",
                    styles.avatarClasses
                  )}
                  aria-hidden="true"
                >
                  {initial}
                </span>
                <span className="font-semibold text-zinc-100">{evaluation.member.name}</span>
                <span className="inline-flex items-center gap-1 text-[11px]">
                  <span
                    className={cn("w-2 h-2 rounded-full shrink-0", styles.dotClasses)}
                    aria-hidden="true"
                  />
                  <span>{styles.label}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <Dialog.Root
        open={selectedEvaluation !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSelectedMemberId(null);
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm transition-opacity" />
          <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-zinc-950 p-6 text-zinc-100 shadow-2xl outline-none">
            {selectedEvaluation && (
              <MemberBreakdownContent evaluation={selectedEvaluation} />
            )}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function MemberBreakdownContent({
  evaluation,
}: {
  evaluation: HouseholdMemberEvaluation;
}) {
  const { member, status, conflictingAllergens, dietaryWarnings, healthNotes } = evaluation;
  const styles = getStatusStyles(status);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <Dialog.Title className="text-lg font-bold tracking-tight text-white">
              {member.name}
            </Dialog.Title>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider",
                styles.badgeClasses
              )}
            >
              {status === "danger" && <WarningOctagon size={12} weight="fill" />}
              {status === "caution" && <Warning size={12} weight="fill" />}
              {status === "safe" && <ShieldCheck size={12} weight="fill" />}
              <span>{styles.label}</span>
            </span>
          </div>
          <Dialog.Description className="text-xs text-zinc-400">
            Allergen &amp; dietary compatibility breakdown for this product scan.
          </Dialog.Description>
        </div>

        <Dialog.Close
          aria-label="Close member breakdown"
          className="rounded-lg border border-white/10 bg-zinc-900 p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
        >
          <X size={16} />
        </Dialog.Close>
      </div>

      {/* Allergen Conflicts */}
      <div className="space-y-2">
        <h4 className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
          Allergen Screening
        </h4>
        {conflictingAllergens.length > 0 ? (
          <div className="rounded-xl border border-red-500/40 bg-red-950/40 p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-300">
              <WarningOctagon size={15} weight="fill" />
              <span>Conflicting Allergens Detected</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {conflictingAllergens.map((item) => (
                <span
                  key={item}
                  className="rounded-full bg-red-600/30 border border-red-500/40 px-2.5 py-0.5 text-xs font-semibold text-red-100"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3 text-xs text-emerald-300 flex items-center gap-2">
            <ShieldCheck size={15} weight="fill" />
            <span>No conflicting allergens detected for this profile.</span>
          </div>
        )}
      </div>

      {/* Dietary & Health Warnings */}
      {(dietaryWarnings.length > 0 || healthNotes.length > 0) && (
        <div className="space-y-2">
          <h4 className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
            Dietary &amp; Health Cautions
          </h4>
          <ul className="rounded-xl border border-amber-500/25 bg-amber-950/20 p-3.5 space-y-1.5 text-xs text-amber-200 list-disc list-inside">
            {dietaryWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
            {healthNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tracked Profile Attributes */}
      <div className="border-t border-white/5 pt-4 space-y-3">
        <h4 className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
          Tracked Profile Filters
        </h4>
        <div className="grid grid-cols-1 gap-2.5 text-xs">
          <div>
            <span className="text-zinc-500 block mb-1">Allergens</span>
            {member.allergens.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {member.allergens.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md border border-white/10 bg-zinc-900 px-2 py-0.5 text-zinc-300 capitalize"
                  >
                    {formatTag(tag)}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-zinc-500 italic">None configured</span>
            )}
          </div>

          <div>
            <span className="text-zinc-500 block mb-1">Dietary Regimes</span>
            {member.dietaryRegimes.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {member.dietaryRegimes.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md border border-white/10 bg-zinc-900 px-2 py-0.5 text-zinc-300 capitalize"
                  >
                    {formatTag(tag)}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-zinc-500 italic">None configured</span>
            )}
          </div>

          {member.healthConditions.length > 0 && (
            <div>
              <span className="text-zinc-500 block mb-1">Health Conditions</span>
              <div className="flex flex-wrap gap-1.5">
                {member.healthConditions.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md border border-white/10 bg-zinc-900 px-2 py-0.5 text-zinc-300 capitalize"
                  >
                    {formatTag(tag)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
