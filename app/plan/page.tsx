"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Apple, ArrowRightLeft, CalendarDays, Loader2 } from "lucide-react";
import Navbar from "@/components/navbar";

interface NutrientItem {
  nutrient: string;
  reason: string;
  foodSources: string[];
}

interface SimpleSwap {
  avoid: string;
  replaceWith: string;
}

interface Plan {
  weekOf?: string;
  message?: string;
  nutrientsToIncrease?: NutrientItem[];
  simpleSwaps?: SimpleSwap[];
  topConcerns?: string[];
}

export default function WeeklyPlanPage() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchPlan = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/weekly-plan");
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate plan");
      }
      const data = await res.json();
      setPlan(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-emerald-500/30">
      <Navbar />
      <div className="max-w-4xl mx-auto p-4 sm:p-6 md:p-12 space-y-8">
        
        <header className="space-y-4">
          <div className="inline-flex items-center space-x-2 bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-sm font-medium border border-emerald-500/20">
            <CalendarDays className="w-4 h-4" />
            <span>Weekly Counter-Plan</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">Your Action Plan</h1>
          <p className="text-zinc-400 text-lg max-w-2xl">
            We&apos;ve analyzed your exposure history. Here is a customized plan to counter the additives and risks you&apos;ve accumulated this week.
          </p>
          
          {!plan && !loading && (
            <Button onClick={fetchPlan} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_0_15px_-3px_rgba(16,185,129,0.4)]">
              Generate My Plan
            </Button>
          )}
        </header>

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4 text-emerald-500">
            <Loader2 className="w-12 h-12 animate-spin" />
            <p className="text-zinc-400 animate-pulse">Analyzing your exposure history and consulting Decode AI...</p>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {plan && !loading && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800">
              <h2 className="text-2xl font-semibold mb-2">{plan.weekOf || "This Week's Focus"}</h2>
              <p className="text-zinc-400">{plan.message}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-zinc-100 flex items-center gap-2">
                    <Apple className="w-5 h-5 text-emerald-400" />
                    Nutrients to Add
                  </CardTitle>
                  <CardDescription className="text-zinc-400">Foods to help counter your exposures</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {plan.nutrientsToIncrease?.map((item: NutrientItem, i: number) => (
                    <div key={i} className="p-4 rounded-xl bg-zinc-950/50 border border-zinc-800/50">
                      <h4 className="font-semibold text-emerald-400">{item.nutrient}</h4>
                      <p className="text-sm text-zinc-400 mb-2">{item.reason}</p>
                      <div className="text-xs text-zinc-500">
                        <strong className="text-zinc-300">Sources:</strong> {item.foodSources?.join(", ")}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-zinc-100 flex items-center gap-2">
                    <ArrowRightLeft className="w-5 h-5 text-indigo-400" />
                    Simple Swaps
                  </CardTitle>
                  <CardDescription className="text-zinc-400">Better alternatives for your usual items</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {plan.simpleSwaps?.map((swap: SimpleSwap, i: number) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-zinc-950/50 border border-zinc-800/50">
                      <div className="text-red-400 line-through text-sm w-5/12 truncate">{swap.avoid}</div>
                      <ArrowRightLeft className="w-4 h-4 text-zinc-600 flex-shrink-0 mx-2" />
                      <div className="text-emerald-400 text-sm font-medium w-5/12 text-right truncate">{swap.replaceWith}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-zinc-100 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  Top Concerns to Watch
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {plan.topConcerns?.map((concern: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1.5 flex-shrink-0" />
                      <span>{concern}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

          </div>
        )}
      </div>
    </div>
  );
}
