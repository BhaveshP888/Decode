"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  ChartLineUp,
  CaretDown,
  Info,
  X,
} from "@phosphor-icons/react";
import { History } from "lucide-react";

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

interface DBScan {
  id: string;
  productName: string | null;
  inputType: string;
  rawInput: string;
  overallScore: number;
  summary: string;
  createdAt: Date | string;
  reportJson: any;
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

export default function HistoryClient({ scans }: HistoryClientProps) {
  const [selectedReport, setSelectedReport] = useState<ScanResult | null>(null);
  const [selectedProductName, setSelectedProductName] = useState<string>("");
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "moderate":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "high":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    }
  };

  const getRiskBorder = (risk: string) => {
    switch (risk) {
      case "low":
        return "border-l-4 border-l-emerald-500/70";
      case "moderate":
        return "border-l-4 border-l-amber-500/70";
      case "high":
        return "border-l-4 border-l-red-500/70";
      default:
        return "border-l-4 border-l-zinc-500/70";
    }
  };

  const handleOpenReport = (scan: DBScan) => {
    let report: ScanResult;

    if (scan.reportJson) {
      try {
        const parsed = typeof scan.reportJson === "string" 
          ? JSON.parse(scan.reportJson) 
          : scan.reportJson;
        
        if (parsed && parsed.ingredients) {
          report = parsed as ScanResult;
        } else {
          throw new Error("Missing ingredients in cached report");
        }
      } catch (e) {
        report = reconstructReport(scan);
      }
    } else {
      report = reconstructReport(scan);
    }

    setSelectedReport(report);
    setSelectedProductName(scan.productName || scan.rawInput.substring(0, 40) + "...");
    setExpandedIdx(null);
  };

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

  return (
    <div className="space-y-4">
      {scans.map((scan) => (
        <div
          key={scan.id}
          className="p-5 rounded-xl bg-zinc-950/50 border border-zinc-800/50 hover:border-zinc-700 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex justify-between items-start">
              <h4 className="font-semibold text-zinc-100 truncate pr-4 text-sm leading-tight">
                {scan.productName || scan.rawInput.substring(0, 40) + "..."}
              </h4>
              <span className="text-xs text-zinc-500 whitespace-nowrap md:hidden">
                {new Date(scan.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="border-zinc-700 text-zinc-300 bg-zinc-900 text-xs">
                Score: {scan.overallScore}/10
              </Badge>
              <span className="text-xs text-zinc-500">
                {scan.ingredients.length} ingredients
              </span>
            </div>
            <p className="text-sm text-zinc-400 line-clamp-2 leading-relaxed">
              {scan.summary}
            </p>
          </div>

          <div className="flex items-center justify-between md:flex-col md:items-end gap-3 pt-2 md:pt-0 border-t border-zinc-850 md:border-t-0">
            <span className="text-xs text-zinc-500 whitespace-nowrap hidden md:inline">
              {new Date(scan.createdAt).toLocaleDateString()}
            </span>
            <button
              onClick={() => handleOpenReport(scan)}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition-colors flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/10 cursor-pointer"
            >
              <span>View Report</span>
            </button>
          </div>
        </div>
      ))}

      {scans.length === 0 && (
        <div className="flex flex-col items-center justify-center h-40 text-zinc-500 space-y-2">
          <History size={32} className="opacity-20" />
          <p className="text-sm">No scans yet.</p>
        </div>
      )}

      {/* Report Modal */}
      {mounted && typeof window !== "undefined" && createPortal(
        <AnimatePresence>
          {selectedReport && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedReport(null)}
              className="absolute inset-0 bg-zinc-950/80 backdrop-blur-md"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.3 }}
              className="relative w-full max-w-5xl md:max-w-6xl bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] z-10"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-zinc-900/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center overflow-hidden">
                    <img src="/icon.png" alt="Decode Logo" className="w-full h-full object-cover" />
                  </div>
                  <h3 className="font-semibold text-zinc-100 text-sm md:text-base truncate max-w-lg">
                    {selectedProductName}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="w-8 h-8 rounded-lg hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable Report Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6 pb-2">
                  {/* Bento Score & Summary Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                    {/* Score Card */}
                    <div className="md:col-span-4 rounded-2xl border border-white/5 bg-zinc-900/40 backdrop-blur-md p-6 flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
                        Safety Score
                      </span>
                      <div className="text-6xl font-bold text-white tracking-tighter mt-2 mb-3">
                        {selectedReport.overallScore}
                        <span className="text-xl text-zinc-600">/10</span>
                      </div>
                      {/* Score Gauge */}
                      <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-white/5">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${selectedReport.overallScore * 10}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className={`h-full rounded-full ${
                            selectedReport.overallScore >= 7
                              ? "bg-emerald-500"
                              : selectedReport.overallScore >= 4
                              ? "bg-amber-500"
                              : "bg-red-500"
                          }`}
                        />
                      </div>
                    </div>

                    {/* Summary Card */}
                    <div className="md:col-span-8 rounded-2xl border border-white/5 bg-zinc-900/40 backdrop-blur-md p-6 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                          <ChartLineUp size={14} className="text-emerald-400" />
                          <span>Analysis Summary</span>
                        </h4>
                        <p className="text-zinc-300 text-sm leading-relaxed">
                          {selectedReport.summary}
                        </p>
                      </div>

                      <div className="flex gap-4 border-t border-white/5 pt-3">
                        <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-400">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 border border-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
                          {selectedReport.scoreBreakdown?.highConcernCount ?? 0} High
                        </span>
                        <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-400">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 border border-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
                          {selectedReport.scoreBreakdown?.moderateConcernCount ?? 0} Moderate
                        </span>
                        <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-400">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                          {selectedReport.scoreBreakdown?.lowConcernCount ?? 0} Low
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Breakdown Card */}
                  <div className="rounded-2xl border border-white/5 bg-zinc-900/40 backdrop-blur-md overflow-hidden">
                    <div className="p-6 border-b border-white/5 bg-zinc-900/20 flex items-center justify-between">
                      <h3 className="font-semibold text-zinc-100 text-sm flex items-center gap-2">
                        <ShieldCheck size={16} className="text-emerald-400" />
                        <span>Detailed Ingredient Breakdown</span>
                      </h3>
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
                            className={`rounded-xl bg-zinc-950/40 border border-white/5 transition-all overflow-hidden ${getRiskBorder(
                              ing.riskLevel || "low"
                            )}`}
                          >
                            {/* Accordion Header */}
                            <button
                              onClick={() => setExpandedIdx(isExpanded ? null : i)}
                              className="w-full text-left p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                            >
                              <div className="min-w-0 flex-1">
                                <h4 className="font-semibold text-zinc-100 text-sm truncate">
                                  {ing.name}
                                </h4>
                                <div className="text-xs text-zinc-500 capitalize mt-1 flex items-center gap-2">
                                  <span>{ing.normalisedName}</span>
                                  <span>•</span>
                                  <span className="truncate">{ing.category}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <Badge
                                  className={`${getRiskColor(
                                    ing.riskLevel || "low"
                                  )} border text-[10px] tracking-wider uppercase font-semibold`}
                                >
                                  {ing.riskLevel}
                                </Badge>
                                <motion.div
                                  animate={{ rotate: isExpanded ? 180 : 0 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <CaretDown size={14} className="text-zinc-500" />
                                </motion.div>
                              </div>
                            </button>

                            {/* Accordion Body */}
                            <AnimatePresence initial={false}>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0 }}
                                  animate={{ height: "auto" }}
                                  exit={{ height: 0 }}
                                  transition={{ duration: 0.25, ease: "easeInOut" }}
                                  className="border-t border-white/5 bg-zinc-950/40"
                                >
                                  <div className="p-4 space-y-4 text-xs md:text-sm">
                                    {/* Origin & Category Details */}
                                    <div className="grid grid-cols-2 gap-4 border-b border-white/5 pb-3">
                                      <div>
                                        <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">
                                          Origin
                                        </span>
                                        <span className="text-zinc-300 font-medium capitalize">
                                          {ing.origin || "Unknown"}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">
                                          Category
                                        </span>
                                        <span className="text-zinc-300 font-medium capitalize">
                                          {ing.category || "Unclassified"}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Pros & Cons */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {ing.pros && ing.pros.length > 0 && (
                                        <div className="space-y-1.5">
                                          <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                                            Pros / Purpose
                                          </span>
                                          <ul className="list-disc list-inside text-zinc-400 space-y-1 pl-1">
                                            {ing.pros.map((pro, idx) => (
                                              <li key={idx}>{pro}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                      {ing.cons && ing.cons.length > 0 && (
                                        <div className="space-y-1.5">
                                          <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">
                                            Cons / Concerns
                                          </span>
                                          <ul className="list-disc list-inside text-zinc-400 space-y-1 pl-1">
                                            {ing.cons.map((con, idx) => (
                                              <li key={idx}>{con}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>

                                    {/* Long-term Effects */}
                                    {((ing.longTermEffects?.positive &&
                                      ing.longTermEffects.positive.length > 0) ||
                                      (ing.longTermEffects?.negative &&
                                        ing.longTermEffects.negative.length > 0)) && (
                                      <div className="space-y-2 border-t border-white/5 pt-3">
                                        <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">
                                          Long-term Exposure Profile
                                        </span>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
                                          {ing.longTermEffects?.positive &&
                                            ing.longTermEffects.positive.length > 0 && (
                                              <div>
                                                <span className="text-[10px] text-emerald-500 font-semibold mb-1 block">
                                                  Positives
                                                </span>
                                                <p className="text-zinc-400 leading-relaxed pl-1">
                                                  {ing.longTermEffects.positive.join(", ")}
                                                </p>
                                              </div>
                                            )}
                                          {ing.longTermEffects?.negative &&
                                            ing.longTermEffects.negative.length > 0 && (
                                              <div>
                                                <span className="text-[10px] text-red-500 font-semibold mb-1 block">
                                                  Negatives
                                                </span>
                                                <p className="text-zinc-400 leading-relaxed pl-1">
                                                  {ing.longTermEffects.negative.join(", ")}
                                                </p>
                                              </div>
                                            )}
                                        </div>
                                      </div>
                                    )}

                                    {/* Counters */}
                                    {ing.counter?.needed &&
                                      (ing.counter.nutrients?.length ||
                                        ing.counter.suggestions?.length) && (
                                        <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/10 space-y-2">
                                          <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                                            <Info size={12} />
                                            <span>Active Mitigating Actions</span>
                                          </span>
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                                            {ing.counter.nutrients &&
                                              ing.counter.nutrients.length > 0 && (
                                                <div>
                                                  <span className="text-[10px] text-zinc-500 font-semibold block mb-0.5">
                                                    Counteractive Nutrients
                                                  </span>
                                                  <span className="text-zinc-300 font-medium">
                                                    {ing.counter.nutrients.join(", ")}
                                                  </span>
                                                </div>
                                              )}
                                            {ing.counter.suggestions &&
                                              ing.counter.suggestions.length > 0 && (
                                                <div>
                                                  <span className="text-[10px] text-zinc-500 font-semibold block mb-0.5">
                                                    Dietary Switches
                                                  </span>
                                                  <span className="text-zinc-300 font-medium">
                                                    {ing.counter.suggestions.join(", ")}
                                                  </span>
                                                </div>
                                              )}
                                          </div>
                                        </div>
                                      )}

                                    {/* Did You Know */}
                                    {ing.didYouKnow && (
                                      <div className="text-xs text-zinc-400 italic bg-zinc-950 p-3 rounded-lg border-l-2 border-emerald-500 pl-3 leading-relaxed mt-2">
                                        {ing.didYouKnow}
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
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
