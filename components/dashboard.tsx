"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Navbar from "@/components/navbar";
import {
  Scan,
  Warning,
  ShieldCheck,
  ChartLineUp,
  CaretDown,
  Flask,
  Info,
} from "@phosphor-icons/react";

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

export default function Dashboard() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState("");
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInputChange = (val: string) => {
    setInput(val);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleScan = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    setExpandedIdx(null);

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawInput: input, inputType: "text" }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to scan ingredients");
      }

      setResult(await res.json());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };


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

  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-zinc-50 font-sans selection:bg-emerald-500/30">
      <Navbar />

      <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-12 space-y-10">
        {/* Header */}
        <header className="space-y-3">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white max-w-2xl leading-none">
            Know what you <span className="text-emerald-400">consume.</span>
          </h1>
          <p className="text-zinc-400 text-base md:text-lg max-w-xl leading-relaxed">
            Scan and break down ingredient labels from food, drinks, and medicine to expose hidden additives and compound risks.
          </p>
        </header>

        <div className="space-y-8">
          {/* Input Panel */}
          <div className="w-full space-y-5">
            <motion.div
              initial={false}
              animate={{
                borderColor: isFocused ? "rgba(16, 185, 129, 0.3)" : "rgba(63, 63, 70, 0.3)",
                boxShadow: isFocused
                  ? "0 0 20px -5px rgba(16, 185, 129, 0.15)"
                  : "0 0 0px 0px rgba(0,0,0,0)",
              }}
              transition={{ duration: 0.2 }}
              className="rounded-2xl border bg-zinc-900/40 backdrop-blur-md overflow-hidden"
            >
              <div className="p-6 border-b border-white/5 bg-zinc-900/20 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-zinc-100 text-sm">Scan Ingredients</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Paste comma-separated ingredients list</p>
                </div>
                <Flask size={18} className="text-zinc-500" />
              </div>

              <div className="p-6 space-y-4">
                <Textarea
                  ref={textareaRef}
                  placeholder="e.g. Water, Sugar, High Fructose Corn Syrup, Sodium Benzoate, Red 40, Citric Acid..."
                  className="min-h-[120px] max-h-[500px] bg-zinc-950/60 border-zinc-800/80 text-zinc-300 placeholder:text-zinc-700 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500/30 rounded-xl resize-none leading-relaxed text-sm p-4 overflow-hidden"
                  value={input}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  onChange={(e) => handleInputChange(e.target.value)}
                />

                <Button
                  onClick={handleScan}
                  disabled={loading || !input.trim()}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl h-11 font-medium transition-all active:scale-[0.98] shadow-[0_0_20px_-5px_rgba(16,185,129,0.3)] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Decoding Label...</span>
                    </>
                  ) : (
                    <>
                      <Scan size={16} weight="bold" />
                      <span>Decode Ingredients</span>
                    </>
                  )}
                </Button>
              </div>
            </motion.div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  <Alert className="bg-red-500/10 border-red-500/20 text-red-400 rounded-xl">
                    <Warning size={16} />
                    <AlertTitle className="font-semibold text-sm">Scan Failed</AlertTitle>
                    <AlertDescription className="text-xs mt-1">{error}</AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Results Panel */}
          <div className="w-full">
            <AnimatePresence mode="wait">
              {result ? (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-5"
                >
                  {/* Bento Score & Summary Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                    {/* Score Card */}
                    <div className="md:col-span-4 rounded-2xl border border-white/5 bg-zinc-900/40 backdrop-blur-md p-6 flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
                        Safety Score
                      </span>
                      <div className="text-6xl font-bold text-white tracking-tighter mt-2 mb-3">
                        {result.overallScore}
                        <span className="text-xl text-zinc-600">/10</span>
                      </div>
                      {/* Score Gauge */}
                      <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-white/5">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${result.overallScore * 10}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className={`h-full rounded-full ${
                            result.overallScore >= 7
                              ? "bg-emerald-500"
                              : result.overallScore >= 4
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
                        <p className="text-zinc-300 text-sm leading-relaxed">{result.summary}</p>
                      </div>

                      <div className="flex gap-4 border-t border-white/5 pt-3">
                        <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-400">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 border border-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
                          {result.scoreBreakdown?.highConcernCount ?? 0} High
                        </span>
                        <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-400">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 border border-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
                          {result.scoreBreakdown?.moderateConcernCount ?? 0} Moderate
                        </span>
                        <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-400">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                          {result.scoreBreakdown?.lowConcernCount ?? 0} Low
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
                        {result.ingredients?.length ?? 0} ITEMS
                      </span>
                    </div>

                    <div className="p-4">
                      <ScrollArea className="h-[420px] pr-3">
                        <div className="space-y-2.5">
                          {result.ingredients?.map((ing: ScanIngredient, i: number) => {
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
                      </ScrollArea>
                    </div>
                  </div>
                </motion.div>
              ) : (
                /* Clean Empty State */
                <motion.div
                  key="empty-state"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="rounded-2xl border border-white/5 bg-zinc-900/20 backdrop-blur-md p-12 flex flex-col items-center justify-center text-center space-y-4 min-h-[240px]"
                >
                  <div className="w-12 h-12 rounded-full bg-zinc-950 border border-white/5 flex items-center justify-center">
                    <Scan size={20} className="text-zinc-500" />
                  </div>
                  <div className="space-y-1 max-w-sm">
                    <h4 className="text-sm font-medium text-zinc-300">Ready to Scan</h4>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      Enter ingredients above to analyze safety and potential health risks.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
