"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import Navbar from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Scales,
  Trophy,
  Plus,
  Trash,
  Warning,
  CheckCircle,
  Sparkle,
  ShieldCheck,
  ChartLineUp,
  Clock,
  CaretRight,
} from "@phosphor-icons/react";

interface ProductInput {
  id: string;
  name: string;
  ingredients: string;
}

interface ProductAnalysis {
  index: number;
  name: string;
  overallScore: number;
  additiveCount: number;
  highConcernCount: number;
  moderateConcernCount: number;
  lowConcernCount: number;
  keyConcerns: string[];
  keyPros: string[];
  verdictNote: string;
}

interface ComparisonPoint {
  category: string;
  findings: string[];
}

interface ComparisonReport {
  winnerIndex: number;
  winnerName: string;
  verdictHeadline: string;
  verdictSummary: string;
  products: ProductAnalysis[];
  comparisonPoints: ComparisonPoint[];
  bottomLineRecommendation: string;
  remainingToday?: number;
  totalAllowed?: number;
}

interface SavedComparison {
  id: string;
  productNames: string[];
  verdict: string;
  winnerIndex: number | null;
  createdAt: string;
  reportJson: unknown;
}

const PRESETS = [
  {
    title: "Oat Milk vs Almond Milk",
    products: [
      {
        id: "p1",
        name: "Commercial Oat Milk",
        ingredients:
          "Oat Base (Water, Oats 10%), Rapeseed Oil, Dipotassium Phosphate, Calcium Carbonate, Tricalcium Phosphate, Sea Salt, Gellan Gum, Vitamin D2, Riboflavin, Vitamin B12",
      },
      {
        id: "p2",
        name: "Commercial Almond Milk",
        ingredients:
          "Almond Base (Water, Almonds 2.5%), Cane Sugar, Calcium Carbonate, Sea Salt, Potassium Citrate, Sunflower Lecithin, Gellan Gum, Locust Bean Gum, Vitamin E Acetate, Vitamin A Palmitate",
      },
    ],
  },
  {
    title: "Coke Zero vs Diet Coke",
    products: [
      {
        id: "p1",
        name: "Coca-Cola Zero Sugar",
        ingredients:
          "Carbonated Water, Caramel Color (E150d), Phosphoric Acid, Aspartame, Potassium Benzoate, Natural Flavors, Potassium Citrate, Acesulfame Potassium, Caffeine",
      },
      {
        id: "p2",
        name: "Diet Coke",
        ingredients:
          "Carbonated Water, Caramel Color (E150d), Aspartame, Phosphoric Acid, Potassium Benzoate, Natural Flavors, Citric Acid, Caffeine",
      },
    ],
  },
];

export default function ComparePage() {
  const [products, setProducts] = useState<ProductInput[]>([
    { id: "1", name: "", ingredients: "" },
    { id: "2", name: "", ingredients: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ComparisonReport | null>(null);
  const [error, setError] = useState("");
  const [remainingToday, setRemainingToday] = useState<number | null>(null);
  const [recentComparisons, setRecentComparisons] = useState<SavedComparison[]>([]);

  // Fetch initial comparison quota & recent history
  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch("/api/compare");
        if (res.ok) {
          const data = await res.json();
          setRemainingToday(data.remainingToday ?? 2);
          if (Array.isArray(data.recentComparisons)) {
            setRecentComparisons(data.recentComparisons);
          }
        }
      } catch {
        // Non-fatal
      }
    }
    fetchStatus();
  }, []);

  const addSlot = () => {
    if (products.length >= 4) return;
    setProducts((prev) => [
      ...prev,
      { id: String(Date.now()), name: "", ingredients: "" },
    ]);
  };

  const removeSlot = (idx: number) => {
    if (products.length <= 2) return;
    setProducts((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateProduct = (idx: number, field: "name" | "ingredients", val: string) => {
    setProducts((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, [field]: val } : p)),
    );
  };

  const loadPreset = (presetIdx: number) => {
    const preset = PRESETS[presetIdx];
    if (preset) {
      setProducts(
        preset.products.map((p, i) => ({
          id: String(i + 1),
          name: p.name,
          ingredients: p.ingredients,
        })),
      );
      setReport(null);
      setError("");
    }
  };

  const handleCompare = async () => {
    const invalidSlot = products.findIndex(
      (p) => !p.name.trim() || !p.ingredients.trim(),
    );
    if (invalidSlot !== -1) {
      setError(`Please provide both a Product Name and Ingredients for Product #${invalidSlot + 1}.`);
      return;
    }

    setLoading(true);
    setError("");
    setReport(null);

    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          products: products.map((p) => ({
            name: p.name.trim(),
            ingredients: p.ingredients.trim(),
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to compare products");
      }

      setReport(data);
      if (typeof data.remainingToday === "number") {
        setRemainingToday(data.remainingToday);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-zinc-50 font-sans selection:bg-emerald-500/30">
      <Navbar />

      <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-12 space-y-10">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs font-semibold tracking-wide">
              <Scales size={14} weight="bold" />
              <span>Decode Versus</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white leading-none">
              Side-by-side <span className="text-emerald-400">Comparison.</span>
            </h1>
            <p className="text-zinc-400 text-sm md:text-base leading-relaxed">
              Compare 2 to 4 products simultaneously to uncover the cleanest label, lowest additive burden, and highest nutritional integrity.
            </p>
          </div>

          {/* Daily Quota Indicator */}
          <div className="rounded-2xl border border-white/5 bg-zinc-900/40 backdrop-blur-md px-5 py-4 flex items-center gap-4 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-white/10 flex items-center justify-center text-emerald-400">
              <Clock size={20} />
            </div>
            <div>
              <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider">
                Daily Limit
              </div>
              <div className="text-sm font-semibold text-white">
                {remainingToday !== null ? (
                  <>
                    <span className="text-emerald-400">{remainingToday}</span> / 2 remaining today
                  </>
                ) : (
                  "2 / 2 remaining"
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Preset Quick Starters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-zinc-500 font-medium">Quick comparison presets:</span>
          {PRESETS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => loadPreset(idx)}
              className="px-3 py-1.5 rounded-full bg-zinc-900/80 hover:bg-zinc-850 border border-white/10 text-zinc-300 hover:text-white transition-all text-xs font-medium cursor-pointer"
            >
              {preset.title}
            </button>
          ))}
        </div>

        {/* Comparison Slot Cards Grid */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {products.map((p, idx) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.05 }}
                className="rounded-2xl border border-white/10 bg-zinc-900/40 backdrop-blur-md p-5 space-y-4 relative group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-zinc-950 border border-white/10 text-xs font-bold text-emerald-400 flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                      Product #{idx + 1}
                    </span>
                  </div>

                  {products.length > 2 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSlot(idx)}
                      className="h-8 w-8 p-0 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                    >
                      <Trash size={14} />
                    </Button>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                      Product Name / Brand
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Silk Almond Milk"
                      value={p.name}
                      onChange={(e) => updateProduct(idx, "name", e.target.value)}
                      className="w-full h-10 px-3.5 bg-zinc-950/60 border border-zinc-800/80 rounded-xl text-xs sm:text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500/30 focus:ring-1 focus:ring-emerald-500/20"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                      Ingredients List
                    </label>
                    <Textarea
                      placeholder="e.g. Water, Almonds, Cane Sugar, Gellan Gum..."
                      value={p.ingredients}
                      onChange={(e) => updateProduct(idx, "ingredients", e.target.value)}
                      className="min-h-[110px] max-h-[260px] bg-zinc-950/60 border-zinc-800/80 text-zinc-300 placeholder:text-zinc-700 text-xs sm:text-sm rounded-xl resize-none p-3.5"
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div>
              {products.length < 4 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addSlot}
                  className="rounded-full bg-zinc-900 border-white/10 hover:bg-zinc-800 text-zinc-300 text-xs gap-1.5"
                >
                  <Plus size={14} weight="bold" />
                  <span>Add Another Product ({products.length}/4)</span>
                </Button>
              )}
            </div>

            <Button
              onClick={handleCompare}
              disabled={loading || (remainingToday !== null && remainingToday <= 0)}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl h-12 px-8 font-semibold transition-all active:scale-[0.98] shadow-[0_0_25px_-5px_rgba(16,185,129,0.3)] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Evaluating Chemical Profiles...</span>
                </>
              ) : (
                <>
                  <Sparkle size={16} weight="bold" />
                  <span>Compare Products</span>
                </>
              )}
            </Button>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
              >
                <Alert className="bg-red-500/10 border-red-500/20 text-red-400 rounded-xl">
                  <Warning size={16} />
                  <AlertTitle className="font-semibold text-sm">Comparison Notice</AlertTitle>
                  <AlertDescription className="text-xs mt-1">{error}</AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Comparison Results ───────────────────────────────── */}
        <AnimatePresence mode="wait">
          {report && (
            <motion.div
              key="comparison-report"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-8 pt-4"
            >
              {/* Winner Trophy Hero Card */}
              <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-emerald-500/10 via-zinc-900/40 to-zinc-900/60 p-6 sm:p-8 relative overflow-hidden backdrop-blur-xl">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                  <div className="space-y-2 max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                      <Trophy size={14} weight="fill" />
                      <span>Winner: {report.winnerName}</span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                      {report.verdictHeadline}
                    </h3>
                    <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed whitespace-pre-line pt-1">
                      {report.verdictSummary}
                    </p>
                  </div>

                  <div className="text-center bg-zinc-950/80 border border-emerald-500/30 rounded-2xl p-6 shrink-0 w-full md:w-48 shadow-lg">
                    <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest block">
                      Winning Score
                    </span>
                    <div className="text-5xl font-bold text-emerald-400 tracking-tighter my-1">
                      {report.products[report.winnerIndex]?.overallScore ?? 0}
                      <span className="text-base text-zinc-600">/10</span>
                    </div>
                    <span className="text-[11px] text-zinc-400 font-medium">
                      Cleanest Composition
                    </span>
                  </div>
                </div>
              </div>

              {/* Side-by-Side Product Scorecards */}
              <div>
                <h4 className="text-sm font-bold text-zinc-200 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <ChartLineUp size={16} className="text-emerald-400" />
                  <span>Side-by-side Product Breakdown</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {report.products.map((prod, i) => {
                    const isWinner = i === report.winnerIndex;
                    return (
                      <div
                        key={i}
                        className={`rounded-2xl border p-5 flex flex-col justify-between space-y-4 transition-all ${
                          isWinner
                            ? "border-emerald-500/40 bg-emerald-950/10 shadow-[0_0_20px_-5px_rgba(16,185,129,0.15)]"
                            : "border-white/5 bg-zinc-900/40"
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-sm text-white truncate">
                              {prod.name}
                            </span>
                            {isWinner && (
                              <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px]">
                                Winner
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-3xl font-bold text-white tracking-tight">
                              {prod.overallScore}
                              <span className="text-xs text-zinc-500">/10</span>
                            </div>
                            <div className="flex-1 h-1.5 bg-zinc-950 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${prod.overallScore * 10}%` }}
                                className={`h-full ${
                                  prod.overallScore >= 7
                                    ? "bg-emerald-500"
                                    : prod.overallScore >= 4
                                    ? "bg-amber-500"
                                    : "bg-red-500"
                                }`}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-zinc-400 border-t border-white/5 pt-2">
                            <span>Additives:</span>
                            <span className="font-semibold text-zinc-200">
                              {prod.additiveCount}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-zinc-400">
                            <span>High Concerns:</span>
                            <span className="font-semibold text-red-400">
                              {prod.highConcernCount}
                            </span>
                          </div>

                          {/* Key Pros */}
                          {prod.keyPros?.length > 0 && (
                            <div className="space-y-1 text-[11px]">
                              <span className="font-semibold text-emerald-400 uppercase tracking-wider block">
                                Positives
                              </span>
                              <ul className="list-disc list-inside text-zinc-400 space-y-0.5 pl-0.5">
                                {prod.keyPros.slice(0, 2).map((pro, idx) => (
                                  <li key={idx} className="line-clamp-2">
                                    {pro}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Key Concerns */}
                          {prod.keyConcerns?.length > 0 && (
                            <div className="space-y-1 text-[11px]">
                              <span className="font-semibold text-red-400 uppercase tracking-wider block">
                                Watchouts
                              </span>
                              <ul className="list-disc list-inside text-zinc-400 space-y-0.5 pl-0.5">
                                {prod.keyConcerns.slice(0, 2).map((con, idx) => (
                                  <li key={idx} className="line-clamp-2">
                                    {con}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        <div className="border-t border-white/5 pt-3">
                          <p className="text-[11px] text-zinc-400 italic">
                            &quot;{prod.verdictNote}&quot;
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Categorical Comparison Table */}
              {report.comparisonPoints?.length > 0 && (
                <div className="rounded-2xl border border-white/5 bg-zinc-900/40 backdrop-blur-md overflow-hidden">
                  <div className="p-6 border-b border-white/5 bg-zinc-900/20">
                    <h4 className="font-semibold text-zinc-100 text-sm flex items-center gap-2">
                      <ShieldCheck size={16} className="text-emerald-400" />
                      <span>Category-by-Category Analysis</span>
                    </h4>
                  </div>

                  <div className="divide-y divide-white/5">
                    {report.comparisonPoints.map((point, idx) => (
                      <div key={idx} className="p-5 space-y-3">
                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                          {point.category}
                        </span>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs text-zinc-300">
                          {point.findings?.map((finding, fIdx) => (
                            <div
                              key={fIdx}
                              className="p-3 rounded-xl bg-zinc-950/40 border border-white/5 space-y-1"
                            >
                              <span className="text-[10px] font-semibold text-zinc-500 block">
                                {report.products[fIdx]?.name || `Product ${fIdx + 1}`}
                              </span>
                              <p className="leading-relaxed">{finding}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom Line Advice */}
              <div className="rounded-2xl border border-white/5 bg-zinc-900/40 p-6 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle size={20} weight="fill" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-white">
                    Bottom-Line Recommendation
                  </h4>
                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                    {report.bottomLineRecommendation}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recent Comparisons Section */}
        {recentComparisons.length > 0 && (
          <div className="border-t border-white/5 pt-8 space-y-4">
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <Clock size={14} className="text-emerald-400" />
              <span>Past Comparisons</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentComparisons.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    if (c.reportJson && typeof c.reportJson === "object") {
                      setReport(c.reportJson as ComparisonReport);
                      window.scrollTo({ top: 400, behavior: "smooth" });
                    }
                  }}
                  className="rounded-xl border border-white/5 bg-zinc-900/40 hover:border-white/10 hover:bg-zinc-900/60 p-4 transition-all cursor-pointer flex items-center justify-between gap-4 group"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white truncate">
                        {c.productNames.join(" vs ")}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 line-clamp-1">
                      {c.verdict || "View comparison outcome"}
                    </p>
                    <span className="text-[10px] text-zinc-600">
                      {new Date(c.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-zinc-950 border border-white/5 flex items-center justify-center text-zinc-500 group-hover:text-emerald-400 group-hover:border-emerald-500/20 transition-colors shrink-0">
                    <CaretRight size={13} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
