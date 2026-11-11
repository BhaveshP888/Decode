"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  ChartLineUp,
  CaretDown,
  Info,
  X,
  Camera,
  Barcode,
  Flask,
  ArrowRight,
  Clock,
  Warning,
  CheckCircle,
} from "@phosphor-icons/react";

// --- Types ---

interface ScanIngredient {
  name: string;
  normalisedName: string;
  origin?: string;
  category?: string;
  pros?: string[];
  cons?: string[];
  longTermEffects?: {
    positive?: string[];
    negative?: string[];
  };
  riskLevel?: "low" | "moderate" | "high";
  counter?: {
    needed?: boolean;
    nutrients?: string[];
    suggestions?: string[];
  };
  didYouKnow?: string;
}

interface ScanResult {
  overallScore: number;
  summary: string;
  scoreBreakdown: {
    highConcernCount: number;
    moderateConcernCount: number;
    lowConcernCount: number;
    biggestConcern: string;
    easiestFix: string;
  };
  ingredients: ScanIngredient[];
}

export interface DBScan {
  id: string;
  productName: string | null;
  inputType: string;
  rawInput: string;
  overallScore: number;
  summary: string;
  createdAt: Date | string;
  reportJson: unknown;
  ingredients: {
    ingredient: {
      id: string;
      name: string;
      aliases: string[];
      origin: string;
      category: string;
      pros: string[];
      cons: string[];
      longTermPos: string[];
      longTermNeg: string[];
      riskLevel: string;
      counterNeeded: boolean;
      counterNutrients: string[];
      counterSuggestions: string[];
      didYouKnow: string;
    };
  }[];
}

interface HistoryClientProps {
  scans: DBScan[];
}

// --- Relative Date Helper ---

function formatRelativeDate(dateInput: Date | string): string {
  const date = new Date(dateInput);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

// --- Circular Safety Dial Sub-Component ---

function ModalSafetyDial({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 10) * circumference;

  const color =
    score >= 7 ? "#34d399" : score >= 4 ? "#fbbf24" : "#f87171";

  const tier =
    score >= 7
      ? { label: "Clean Profile", bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" }
      : score >= 4
      ? { label: "Moderate Caution", bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" }
      : { label: "High Concern", bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/20" };

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="relative w-36 h-36 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 128 128">
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="transparent"
            stroke="rgba(255, 255, 255, 0.06)"
            strokeWidth="9"
          />
          <motion.circle
            cx="64"
            cy="64"
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-0.5">
            Safety Score
          </span>
          <div className="flex items-baseline gap-0.5">
            <span className="text-4xl font-heading font-bold text-white tracking-tight">
              {score.toFixed(1)}
            </span>
            <span className="text-sm text-zinc-500 font-medium">/10</span>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${tier.bg} ${tier.text} ${tier.border}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          {tier.label}
        </span>
      </div>
    </div>
  );
}

// --- Main History Client Component ---

export default function HistoryClient({ scans }: HistoryClientProps) {
  const [selectedReport, setSelectedReport] = useState<ScanResult | null>(null);
  const [selectedProductName, setSelectedProductName] = useState<string>("");
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let active = true;
    requestAnimationFrame(() => {
      if (active) setMounted(true);
    });
    return () => {
      active = false;
      setMounted(false);
    };
  }, []);

  // Keyboard navigation for modal dismissal
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setSelectedReport(null);
    }
  }, []);

  useEffect(() => {
    if (selectedReport) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [selectedReport, handleKeyDown]);

  const reconstructReport = (scan: DBScan): ScanResult => {
    const ingredients = scan.ingredients.map((si) => {
      const ing = si.ingredient;
      return {
        name: ing.aliases[0] || ing.name,
        normalisedName: ing.name,
        origin: ing.origin,
        category: ing.category,
        pros: ing.pros,
        cons: ing.cons,
        longTermEffects: {
          positive: ing.longTermPos,
          negative: ing.longTermNeg,
        },
        riskLevel: ing.riskLevel as "low" | "moderate" | "high",
        counter: {
          needed: ing.counterNeeded,
          nutrients: ing.counterNutrients,
          suggestions: ing.counterSuggestions,
        },
        didYouKnow: ing.didYouKnow,
      };
    });

    const highConcernCount = ingredients.filter((i) => i.riskLevel === "high").length;
    const moderateConcernCount = ingredients.filter((i) => i.riskLevel === "moderate").length;
    const lowConcernCount = ingredients.filter((i) => i.riskLevel === "low").length;
    const biggestConcern =
      ingredients.find((i) => i.riskLevel === "high")?.name ||
      ingredients.find((i) => i.riskLevel === "moderate")?.name ||
      "";

    return {
      overallScore: scan.overallScore,
      summary: scan.summary,
      scoreBreakdown: {
        highConcernCount,
        moderateConcernCount,
        lowConcernCount,
        biggestConcern,
        easiestFix: "",
      },
      ingredients,
    };
  };

  const handleOpenReport = (scan: DBScan) => {
    let report: ScanResult;

    if (scan.reportJson) {
      try {
        const parsed =
          typeof scan.reportJson === "string"
            ? JSON.parse(scan.reportJson)
            : scan.reportJson;

        if (parsed && parsed.ingredients) {
          report = parsed as ScanResult;
        } else {
          throw new Error("Missing ingredients in cached report");
        }
      } catch {
        report = reconstructReport(scan);
      }
    } else {
      report = reconstructReport(scan);
    }

    setSelectedReport(report);
    setSelectedProductName(scan.productName || scan.rawInput.substring(0, 40) + "...");
    setExpandedIdx(null);
  };

  const getRiskBorder = (risk: string) => {
    switch (risk) {
      case "low":
        return "border-l-4 border-l-emerald-500/70";
      case "moderate":
        return "border-l-4 border-l-amber-500/70";
      case "high":
        return "border-l-4 border-l-rose-500/70";
      default:
        return "border-l-4 border-l-zinc-500/70";
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/25";
      case "moderate":
        return "bg-amber-500/10 text-amber-400 border-amber-500/25";
      case "high":
        return "bg-rose-500/10 text-rose-400 border-rose-500/25";
      default:
        return "bg-zinc-500/10 text-zinc-400 border-zinc-500/25";
    }
  };

  const renderModalityBadge = (type: string) => {
    switch (type) {
      case "photo":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            <Camera size={11} weight="bold" />
            <span>Photo OCR</span>
          </span>
        );
      case "barcode":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
            <Barcode size={11} weight="bold" />
            <span>Barcode</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/5">
            <Flask size={11} weight="bold" />
            <span>Text Input</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-3.5">
      {scans.map((scan) => {
        const isClean = scan.overallScore >= 7.0;
        const isMod = scan.overallScore >= 4.0;
        const scoreColor = isClean
          ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/25"
          : isMod
          ? "text-amber-400 bg-amber-500/10 border-amber-500/25"
          : "text-rose-400 bg-rose-500/10 border-rose-500/25";

        return (
          <div
            key={scan.id}
            className="p-4 sm:p-5 rounded-2xl bg-[#0b0c0e]/60 border border-white/[0.06] hover:border-white/[0.12] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {renderModalityBadge(scan.inputType)}
                <span className="text-[11px] text-zinc-500 flex items-center gap-1 font-medium">
                  <Clock size={11} />
                  <span>{formatRelativeDate(scan.createdAt)}</span>
                </span>
              </div>

              <h4 className="font-heading font-semibold text-zinc-100 text-sm sm:text-base truncate leading-tight">
                {scan.productName || scan.rawInput.substring(0, 45) + "..."}
              </h4>

              <p className="text-xs sm:text-sm text-zinc-400 line-clamp-2 leading-relaxed">
                {scan.summary}
              </p>

              <div className="flex items-center gap-3 pt-0.5">
                <span className="text-xs text-zinc-500">
                  {scan.ingredients.length} compounds identified
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between sm:flex-col sm:items-end gap-3 pt-3 sm:pt-0 border-t border-white/[0.06] sm:border-t-0 shrink-0">
              <div className={`px-3 py-1 rounded-xl border text-xs font-heading font-bold ${scoreColor}`}>
                Score: {scan.overallScore.toFixed(1)}/10
              </div>

              <button
                type="button"
                onClick={() => handleOpenReport(scan)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] text-xs font-semibold text-zinc-200 hover:text-white transition-all active:scale-[0.98] border border-white/[0.08] cursor-pointer"
              >
                <span>Inspect Report</span>
                <ArrowRight size={12} className="text-emerald-400" />
              </button>
            </div>
          </div>
        );
      })}

      {scans.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 text-center text-zinc-500 space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#1a1d22] border border-white/5 flex items-center justify-center text-zinc-400">
            <Flask size={22} className="text-emerald-400" />
          </div>
          <h4 className="text-sm font-semibold text-zinc-300">No Past Scans Found</h4>
          <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
            When you scan products on the dashboard, comprehensive health reports will be archived here.
          </p>
        </div>
      )}

      {/* Historical Report Inspection Modal */}
      {mounted &&
        typeof window !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {selectedReport && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
                {/* Backdrop Blur */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectedReport(null)}
                  className="absolute inset-0 bg-[#0b0c0e]/85 backdrop-blur-xl"
                />

                {/* Dialog Body */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 12 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="relative w-full max-w-4xl bg-[#131518] border border-white/[0.08] rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] z-10"
                >
                  {/* Dialog Top Bar */}
                  <div className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-white/[0.07] bg-[#16181d]/70">
                    <div className="flex items-center gap-2.5 min-w-0 pr-4">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                        <Image src="/icon.png" alt="Decode Logo" width={28} height={28} className="object-cover" />
                      </div>
                      <h3 className="font-heading font-semibold text-zinc-100 text-sm sm:text-base truncate">
                        {selectedProductName}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedReport(null)}
                      aria-label="Close dialog"
                      className="w-9 h-9 rounded-full bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
                    >
                      <X size={17} />
                    </button>
                  </div>

                  {/* Scrollable Report Viewport */}
                  <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
                    {/* Score & Summary Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                      {/* Safety Score Radial Dial */}
                      <div className="md:col-span-4 rounded-3xl border border-white/[0.07] bg-[#0b0c0e]/60 flex flex-col items-center justify-center">
                        <ModalSafetyDial score={selectedReport.overallScore} />
                      </div>

                      {/* Summary & Tally Card */}
                      <div className="md:col-span-8 rounded-3xl border border-white/[0.07] bg-[#0b0c0e]/60 p-5 sm:p-6 flex flex-col justify-between space-y-4">
                        <div className="space-y-2">
                          <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                            <ChartLineUp size={14} className="text-emerald-400" />
                            <span>Biochemical Summary</span>
                          </h4>
                          <p className="text-zinc-200 text-sm leading-relaxed">
                            {selectedReport.summary}
                          </p>
                        </div>

                        {/* Concern Count Breakdown */}
                        <div className="grid grid-cols-3 gap-2.5 border-t border-white/[0.07] pt-3 text-center">
                          <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                            <span className="block text-xl font-heading font-bold text-rose-400">
                              {selectedReport.scoreBreakdown?.highConcernCount ?? 0}
                            </span>
                            <span className="text-[10px] text-zinc-400 uppercase tracking-wide">
                              High Risk
                            </span>
                          </div>

                          <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                            <span className="block text-xl font-heading font-bold text-amber-400">
                              {selectedReport.scoreBreakdown?.moderateConcernCount ?? 0}
                            </span>
                            <span className="text-[10px] text-zinc-400 uppercase tracking-wide">
                              Moderate
                            </span>
                          </div>

                          <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                            <span className="block text-xl font-heading font-bold text-emerald-400">
                              {selectedReport.scoreBreakdown?.lowConcernCount ?? 0}
                            </span>
                            <span className="text-[10px] text-zinc-400 uppercase tracking-wide">
                              Clean
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Ingredient Accordion */}
                    <div className="rounded-3xl border border-white/[0.07] bg-[#0b0c0e]/60 overflow-hidden">
                      <div className="p-4 sm:p-5 border-b border-white/[0.07] bg-[#16181d]/50 flex items-center justify-between">
                        <h4 className="font-heading font-semibold text-zinc-100 text-sm flex items-center gap-2">
                          <ShieldCheck size={16} className="text-emerald-400" />
                          <span>Detailed Ingredient Profiles</span>
                        </h4>
                        <span className="text-xs text-zinc-500 font-mono">
                          {selectedReport.ingredients?.length ?? 0} ITEMS
                        </span>
                      </div>

                      <div className="p-4 space-y-2.5">
                        {selectedReport.ingredients?.map((ing, i) => {
                          const isExpanded = expandedIdx === i;
                          return (
                            <div
                              key={i}
                              className={`rounded-2xl bg-[#131518]/70 border border-white/[0.06] transition-all overflow-hidden ${getRiskBorder(
                                ing.riskLevel || "low"
                              )}`}
                            >
                              <button
                                type="button"
                                onClick={() => setExpandedIdx(isExpanded ? null : i)}
                                className="w-full text-left p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                              >
                                <div className="min-w-0 flex-1">
                                  <h5 className="font-heading font-semibold text-zinc-100 text-sm truncate">
                                    {ing.name}
                                  </h5>
                                  <div className="text-xs text-zinc-400 capitalize mt-0.5 flex flex-wrap items-center gap-2">
                                    <span className="text-zinc-300">{ing.normalisedName}</span>
                                    <span>•</span>
                                    <span className="text-zinc-500">{ing.category || "General"}</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                  <Badge
                                    className={`${getRiskColor(
                                      ing.riskLevel || "low"
                                    )} border text-[10px] tracking-wider uppercase font-semibold px-2 py-0.5 rounded-full`}
                                  >
                                    {ing.riskLevel}
                                  </Badge>
                                  <motion.div
                                    animate={{ rotate: isExpanded ? 180 : 0 }}
                                    transition={{ duration: 0.2 }}
                                  >
                                    <CaretDown size={14} className="text-zinc-400" />
                                  </motion.div>
                                </div>
                              </button>

                              <AnimatePresence initial={false}>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.25, ease: "easeInOut" }}
                                    className="border-t border-white/[0.06] bg-[#0e1014]/80 p-4 sm:p-5 space-y-3.5 text-xs sm:text-sm"
                                  >
                                    {/* Pros & Cons */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                      {ing.pros && ing.pros.length > 0 && (
                                        <div className="space-y-1 p-3 rounded-2xl bg-emerald-500/[0.04] border border-emerald-500/15">
                                          <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                                            <CheckCircle size={12} weight="bold" />
                                            <span>Pros / Purpose</span>
                                          </span>
                                          <ul className="list-disc list-inside text-zinc-300 space-y-0.5 pl-1 text-xs">
                                            {ing.pros.map((pro, idx) => (
                                              <li key={idx}>{pro}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}

                                      {ing.cons && ing.cons.length > 0 && (
                                        <div className="space-y-1 p-3 rounded-2xl bg-rose-500/[0.04] border border-rose-500/15">
                                          <span className="text-[10px] font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1">
                                            <Warning size={12} weight="bold" />
                                            <span>Cons / Concerns</span>
                                          </span>
                                          <ul className="list-disc list-inside text-zinc-300 space-y-0.5 pl-1 text-xs">
                                            {ing.cons.map((con, idx) => (
                                              <li key={idx}>{con}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>

                                    {/* Active Counters */}
                                    {ing.counter?.needed &&
                                      (ing.counter.nutrients?.length || ing.counter.suggestions?.length) && (
                                        <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/15 space-y-1.5">
                                          <span className="text-[10px] font-semibold text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                                            <Info size={13} weight="bold" />
                                            <span>Mitigating Nutrition</span>
                                          </span>
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                            {ing.counter.nutrients && ing.counter.nutrients.length > 0 && (
                                              <div>
                                                <span className="text-zinc-500 block">Nutrients:</span>
                                                <span className="text-zinc-200 font-medium">
                                                  {ing.counter.nutrients.join(", ")}
                                                </span>
                                              </div>
                                            )}
                                            {ing.counter.suggestions && ing.counter.suggestions.length > 0 && (
                                              <div>
                                                <span className="text-zinc-500 block">Dietary Switches:</span>
                                                <span className="text-zinc-200 font-medium">
                                                  {ing.counter.suggestions.join(", ")}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}

                                    {/* Did You Know */}
                                    {ing.didYouKnow && (
                                      <div className="text-xs text-zinc-300 italic bg-[#0b0c0e] p-3 rounded-xl border-l-2 border-emerald-400 pl-3 leading-relaxed">
                                        💡 {ing.didYouKnow}
                                      </div>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
