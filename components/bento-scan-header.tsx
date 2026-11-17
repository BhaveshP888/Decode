"use client";

import { ShieldCheck, WarningOctagon } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";

export interface AllergenAlert {
  hasConflict: boolean;
  conflictingAllergens: string[];
}

export interface BentoScanHeaderProps {
  purityScore: number;
  productName?: string;
  allergenAlert?: AllergenAlert;
  className?: string;
}

interface ScoreTierStyle {
  label: string;
  badgeClasses: string;
  accentText: string;
  barClasses: string;
  glowClasses: string;
}

function getScoreTier(score: number): ScoreTierStyle {
  if (score >= 7) {
    return {
      label: "Clean Profile",
      badgeClasses: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      accentText: "text-emerald-400",
      barClasses: "bg-emerald-500",
      glowClasses: "shadow-[0_0_28px_-10px_rgba(16,185,129,0.35)]",
    };
  }
  if (score >= 4) {
    return {
      label: "Moderate Concern",
      badgeClasses: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      accentText: "text-amber-400",
      barClasses: "bg-amber-500",
      glowClasses: "shadow-[0_0_28px_-10px_rgba(245,158,11,0.35)]",
    };
  }
  return {
    label: "High Concern",
    badgeClasses: "bg-red-500/15 text-red-300 border-red-500/30",
    accentText: "text-red-400",
    barClasses: "bg-red-500",
    glowClasses: "shadow-[0_0_28px_-10px_rgba(239,68,68,0.35)]",
  };
}

export function BentoScanHeader({
  purityScore,
  productName,
  allergenAlert,
  className,
}: BentoScanHeaderProps) {
  const clampedScore = Math.max(0, Math.min(10, purityScore));
  const hasConflict = allergenAlert?.hasConflict === true;
  const conflictingAllergens = allergenAlert?.conflictingAllergens ?? [];
  const displayProductName = productName?.trim() || "Scanned Product";

  if (hasConflict) {
    return (
      <section
        aria-label="Allergen safety alert header"
        className={cn(
          "w-full rounded-2xl border-2 border-red-500/80 bg-red-950/50 backdrop-blur-md overflow-hidden shadow-[0_0_36px_-8px_rgba(239,68,68,0.45)]",
          className
        )}
      >
        {/* Full-Width High-Contrast Allergen Danger Banner */}
        <div
          role="alert"
          aria-live="assertive"
          className="w-full bg-red-600 px-5 py-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-950/40 border border-white/20 flex items-center justify-center shrink-0">
              <WarningOctagon
                size={24}
                weight="fill"
                className="text-white"
                aria-hidden="true"
              />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs sm:text-sm font-extrabold uppercase tracking-widest text-white">
                ALLERGEN CONFLICT
              </p>
              <p className="text-xs sm:text-sm text-red-50/95 font-medium">
                This product contains ingredients flagged in your safety profile. Do not consume without verification.
              </p>
            </div>
          </div>

          {conflictingAllergens.length > 0 && (
            <div
              className="flex flex-wrap items-center gap-1.5 sm:justify-end"
              aria-label="Conflicting allergens"
            >
              {conflictingAllergens.map((allergen) => (
                <span
                  key={allergen}
                  className="inline-flex items-center rounded-full bg-red-950/75 border border-white/25 px-3 py-1 text-xs font-bold tracking-wide text-white shadow-sm"
                >
                  {allergen}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Product Context & Demoted Objective Purity Pill */}
        <div className="px-5 py-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-950/70">
          <div className="min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-red-300/80 block">
              Flagged Product
            </span>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white truncate">
              {displayProductName}
            </h2>
          </div>

          {/* Intentionally Demoted Secondary Pill */}
          <div
            data-testid="demoted-purity-pill"
            className="inline-flex items-center self-start sm:self-center rounded-full border border-zinc-700/80 bg-zinc-900/90 px-3.5 py-1.5 text-xs font-medium text-zinc-400"
          >
            {`Biochemical Purity: ${purityScore} (Unsafe for User Profile)`}
          </div>
        </div>
      </section>
    );
  }

  const tier = getScoreTier(clampedScore);

  return (
    <section
      aria-label="Product purity score header"
      className={cn(
        "w-full rounded-2xl border border-white/10 bg-zinc-900/40 backdrop-blur-md p-5 sm:p-6",
        tier.glowClasses,
        className
      )}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
        {/* Product Title & Safety Clearance */}
        <div className="space-y-2 min-w-0 flex-1">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-300">
            <ShieldCheck size={15} weight="fill" aria-hidden="true" />
            <span>No Profile Allergen Conflicts</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white truncate">
            {displayProductName}
          </h2>

          <div className="w-full max-w-md pt-1">
            <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-white/5">
              <div
                style={{ width: `${clampedScore * 10}%` }}
                className={cn("h-full rounded-full transition-all duration-500", tier.barClasses)}
              />
            </div>
          </div>
        </div>

        {/* Prominent Objective Purity Score Badge */}
        <div className="flex items-center gap-4 shrink-0 self-start md:self-center">
          <div
            className={cn(
              "rounded-2xl border px-5 py-3.5 flex items-center gap-4",
              tier.badgeClasses
            )}
          >
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-widest opacity-80">
                Biochemical Purity
              </span>
              <span className={cn("text-xs font-semibold mt-0.5", tier.accentText)}>
                {tier.label}
              </span>
            </div>
            <div className="text-4xl sm:text-5xl font-bold tracking-tighter text-white leading-none">
              {purityScore}
              <span className="text-base sm:text-lg text-zinc-400 font-medium">/10</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
