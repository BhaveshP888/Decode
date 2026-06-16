"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase/client";
import {
  Scan,
  Warning,
  ShieldCheck,
  ChartLineUp,
  SignOut,
  CalendarCheck,
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
  const router = useRouter();

  const handleScan = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);

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

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/landing");
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low":      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "moderate": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "high":     return "bg-red-500/10 text-red-400 border-red-500/20";
      default:         return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    }
  };

  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-zinc-50 font-sans selection:bg-emerald-500/30">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 flex items-center justify-between px-6 md:px-12 h-16 border-b border-white/5 bg-zinc-950/80 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Scan size={14} className="text-emerald-400" weight="bold" />
          </div>
          <span className="font-semibold text-white tracking-tight">Decode</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/history")}
            className="text-zinc-400 hover:text-white gap-2"
          >
            <ChartLineUp size={15} />
            Exposure
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/plan")}
            className="text-zinc-400 hover:text-white gap-2"
          >
            <CalendarCheck size={15} />
            Weekly Plan
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-zinc-500 hover:text-white gap-2"
          >
            <SignOut size={15} />
            Sign out
          </Button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto p-6 md:p-12 space-y-8">
        {/* Header */}
        <header className="space-y-2">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-xs font-medium border border-emerald-500/20">
            <Scan size={12} weight="bold" />
            AI Scanner
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-white">
            Know what you consume.
          </h1>
          <p className="text-zinc-400 max-w-xl">
            Paste an ingredient list from any packaged food or medicine. We analyze the risks, origins, and long-term effects.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Input */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="bg-zinc-900/60 border-zinc-800/50">
              <CardHeader>
                <CardTitle className="text-zinc-100 text-base">Ingredient List</CardTitle>
                <CardDescription className="text-zinc-500">
                  Type or paste ingredients separated by commas.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="e.g. Water, Sugar, Sodium Benzoate, Red 40, Natural Flavors..."
                  className="min-h-[220px] bg-zinc-950/80 border-zinc-800 text-zinc-300 placeholder:text-zinc-700 focus-visible:ring-emerald-500/40 rounded-xl resize-none"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
              </CardContent>
              <CardFooter>
                <Button
                  onClick={handleScan}
                  disabled={loading || !input.trim()}
                  suppressHydrationWarning
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl h-11 font-medium transition-all shadow-[0_0_20px_-5px_rgba(52,211,153,0.3)] disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Analyzing…
                    </span>
                  ) : (
                    "Decode Ingredients"
                  )}
                </Button>
              </CardFooter>
            </Card>

            {error && (
              <Alert className="bg-red-500/10 border-red-500/20 text-red-400">
                <Warning size={16} />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Results */}
          <div className="lg:col-span-7">
            {result ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-zinc-900/60 border-zinc-800/50">
                    <CardContent className="p-6 flex flex-col items-center justify-center space-y-1">
                      <div className="text-xs font-medium text-zinc-500">Safety Score</div>
                      <div className="text-5xl font-bold text-white tracking-tighter">
                        {result.overallScore}
                        <span className="text-xl text-zinc-600">/10</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-zinc-900/60 border-zinc-800/50 md:col-span-2">
                    <CardContent className="p-6 space-y-3">
                      <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                        <ChartLineUp size={14} className="text-emerald-400" />
                        Summary
                      </h3>
                      <p className="text-zinc-400 text-sm leading-relaxed">{result.summary}</p>
                      <div className="flex gap-4 pt-1">
                        <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          {result.scoreBreakdown?.highConcernCount ?? 0} High
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          {result.scoreBreakdown?.moderateConcernCount ?? 0} Moderate
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="bg-zinc-900/60 border-zinc-800/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-zinc-100 text-sm flex items-center gap-2">
                      <ShieldCheck size={15} className="text-emerald-400" />
                      Detailed Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[380px] pr-4">
                      <div className="space-y-3">
                        {result.ingredients?.map((ing: ScanIngredient, i: number) => (
                          <div
                            key={i}
                            className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/50 hover:border-zinc-700/50 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-medium text-zinc-100 text-sm">{ing.name}</h4>
                                <div className="text-xs text-zinc-600 capitalize mt-0.5">
                                  {ing.origin} · {ing.category}
                                </div>
                              </div>
                              <Badge className={`${getRiskColor(ing.riskLevel || 'low')} border text-xs`}>
                                {ing.riskLevel}
                              </Badge>
                            </div>

                            {ing.didYouKnow && (
                              <p className="text-xs text-zinc-500 mt-3 italic border-l-2 border-emerald-500/20 pl-3 leading-relaxed">
                                {ing.didYouKnow}
                              </p>
                            )}

                            {ing.cons && ing.cons.length > 0 && (
                              <div className="mt-3 space-y-1">
                                <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">
                                  Concerns
                                </span>
                                <ul className="text-xs text-zinc-500 list-disc list-inside space-y-0.5">
                                  {ing.cons.map((con: string, idx: number) => (
                                    <li key={idx}>{con}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="h-full min-h-[380px] rounded-2xl border border-dashed border-zinc-800 flex flex-col items-center justify-center text-zinc-600 space-y-3 bg-zinc-900/20">
                <Scan size={36} className="opacity-20" />
                <p className="text-sm">Paste ingredients to see the analysis</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
