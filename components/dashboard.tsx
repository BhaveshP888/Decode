"use client";

import { useState, useRef, useMemo, ChangeEvent, DragEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
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
  Camera,
  Barcode,
  UploadSimple,
  X,
  MagnifyingGlass,
  Info,
  Sparkle,
  ArrowRight,
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

interface BarcodeProduct {
  found: boolean;
  barcode?: string;
  productName?: string;
  ingredientsText?: string;
  imageUrl?: string;
  brands?: string;
  message?: string;
  hasIngredients?: boolean;
}

type ScanMode = "photo" | "barcode" | "text";
type FilterCategory = "all" | "high" | "moderate" | "low";

// Pre-defined quick starter samples for instant testing
const STARTER_SAMPLES = [
  {
    name: "Energy Drink",
    tag: "High Additives",
    ingredients:
      "Carbonated Water, Sugar, High Fructose Corn Syrup, Citric Acid, Taurine, Sodium Citrate, Panax Ginseng Extract, Potassium Sorbate, Sodium Benzoate, Caffeine, Niacinamide, Red 40, Sucralose, Pyridoxine Hydrochloride, Cyanocobalamin",
  },
  {
    name: "Barista Oat Milk",
    tag: "Clean Baseline",
    ingredients:
      "Oat Base (Water, Oats 10%), Low Erucic Acid Rapeseed Oil, Dipotassium Phosphate, Calcium Carbonate, Tricalcium Phosphate, Sea Salt, Dicalcium Phosphate, Riboflavin, Vitamin D2, Vitamin B12",
  },
  {
    name: "Cremora Sandwich Cookies",
    tag: "Ultra Processed",
    ingredients:
      "Unbleached Enriched Flour, Sugar, Palm Oil, Soybean Oil, Cocoa Processed with Alkali, High Fructose Corn Syrup, Baking Soda, Salt, Soy Lecithin, Vanillin Artificial Flavor, Chocolate",
  },
];

// --- Circular Safety Dial Sub-Component ---

function HolisticSafetyDial({ score }: { score: number }) {
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
          {/* Background track */}
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="transparent"
            stroke="rgba(255, 255, 255, 0.06)"
            strokeWidth="9"
          />
          {/* Animated Gauge arc */}
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
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
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

// --- Main Dashboard Component ---

export default function Dashboard() {
  const [mode, setMode] = useState<ScanMode>("photo");
  const [input, setInput] = useState("");
  const [productName, setProductName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState("");
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [filterCategory, setFilterCategory] = useState<FilterCategory>("all");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Photo State
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Barcode State
  const [barcodeQuery, setBarcodeQuery] = useState("");
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [barcodeProduct, setBarcodeProduct] = useState<BarcodeProduct | null>(null);

  const handleInputChange = (val: string) => {
    setInput(val);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  // Client-side image compression using canvas
  const processImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (JPEG, PNG, WebP).");
      return;
    }
    setError("");

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement("img");
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 1200;
        let { width, height } = img;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
          setPhotoPreview(compressedDataUrl);
          setPhotoBase64(compressedDataUrl);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleBarcodeLookup = async (codeToLookup?: string) => {
    const code = (codeToLookup || barcodeQuery).trim();
    if (!code) return;

    setBarcodeLoading(true);
    setError("");
    setBarcodeProduct(null);

    try {
      const res = await fetch(`/api/barcode?code=${encodeURIComponent(code)}`);
      const data = (await res.json()) as BarcodeProduct;
      setBarcodeProduct(data);

      if (data.found && data.ingredientsText) {
        setInput(data.ingredientsText);
        if (data.productName) setProductName(data.productName);
      }
    } catch {
      setError("Unable to lookup barcode. Please verify your internet connection.");
    } finally {
      setBarcodeLoading(false);
    }
  };

  const handleScan = async () => {
    if (mode === "text" && !input.trim()) return;
    if (mode === "photo" && !photoBase64 && !input.trim()) {
      setError("Please select or capture a label photo first.");
      return;
    }
    if (mode === "barcode" && !input.trim() && !photoBase64) {
      setError("Please enter or look up a product barcode first.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setExpandedIdx(null);
    setFilterCategory("all");

    try {
      const payload: Record<string, unknown> = {
        inputType: mode === "photo" ? "photo" : "text",
        productName: productName.trim() || undefined,
      };

      if (mode === "photo" && photoBase64) {
        payload.image = photoBase64;
        payload.mimeType = "image/jpeg";
        payload.rawInput = input.trim() || undefined;
      } else {
        payload.rawInput = input.trim();
      }

      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to analyze ingredients");
      }

      setResult(await res.json());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const loadStarterSample = (sample: (typeof STARTER_SAMPLES)[number]) => {
    setMode("text");
    setProductName(sample.name);
    setInput(sample.ingredients);
    setError("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
      }, 50);
    }
  };

  const filteredIngredients = useMemo(() => {
    if (!result?.ingredients) return [];
    if (filterCategory === "all") return result.ingredients;
    return result.ingredients.filter((ing) => ing.riskLevel === filterCategory);
  }, [result, filterCategory]);

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

  return (
    <div className="min-h-[100dvh] bg-[#0b0c0e] text-zinc-100 font-sans selection:bg-emerald-500/20">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-12 space-y-10">
        {/* Editorial Heading */}
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-300 text-xs font-medium tracking-wide">
            <Sparkle size={13} weight="fill" />
            <span>Biochemical Health Intelligence</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold tracking-tight text-white leading-tight">
            Know what goes into your <span className="text-emerald-400">body.</span>
          </h1>
          <p className="text-zinc-400 text-sm sm:text-base max-w-2xl leading-relaxed">
            Snap a label photo, scan a barcode, or paste ingredients. Decode analyzes every compound,
            flags artificial additives, and models your long-term cumulative exposure.
          </p>
        </header>

        {/* Ingestion Command Card */}
        <section className="space-y-6">
          <motion.div
            initial={false}
            animate={{
              borderColor: isFocused ? "rgba(52, 211, 153, 0.4)" : "rgba(255, 255, 255, 0.08)",
              boxShadow: isFocused
                ? "0 0 25px -5px rgba(52, 211, 153, 0.12)"
                : "0 10px 30px -10px rgba(0, 0, 0, 0.5)",
            }}
            transition={{ duration: 0.2 }}
            className="rounded-3xl border bg-[#131518] backdrop-blur-xl overflow-hidden"
          >
            {/* Mode Switcher Bar */}
            <div className="p-4 sm:p-5 border-b border-white/[0.07] bg-[#16181d]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-heading font-semibold text-zinc-100 text-sm flex items-center gap-2">
                  <Flask size={16} className="text-emerald-400" />
                  <span>Analyze Product Label</span>
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {mode === "photo" && "Snap or upload a photo of the nutrition/ingredient panel"}
                  {mode === "barcode" && "Scan product barcode with OpenFoodFacts catalog matching"}
                  {mode === "text" && "Type or paste comma-separated chemical/food ingredients"}
                </p>
              </div>

              {/* Segmented Mode Switcher */}
              <div className="flex items-center gap-1 p-1 bg-[#0b0c0e]/90 rounded-2xl border border-white/[0.07] self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setMode("photo")}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    mode === "photo"
                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm"
                      : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  <Camera size={14} weight={mode === "photo" ? "bold" : "regular"} />
                  <span>Camera / Photo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode("barcode")}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    mode === "barcode"
                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm"
                      : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  <Barcode size={14} weight={mode === "barcode" ? "bold" : "regular"} />
                  <span>Barcode</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode("text")}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    mode === "text"
                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm"
                      : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  <Flask size={14} weight={mode === "text" ? "bold" : "regular"} />
                  <span>Text / Paste</span>
                </button>
              </div>
            </div>

            {/* Input Viewport */}
            <div className="p-5 sm:p-6 space-y-4">
              {/* Optional Product Name */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Optional Product Name (e.g. Diet Coke, Kerrygold Butter, Oat Milk)"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full h-11 px-4 bg-[#0b0c0e]/70 border border-white/[0.08] rounded-xl text-xs sm:text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                />
              </div>

              {/* Mode 1: Photo / Camera Dropzone */}
              {mode === "photo" && (
                <div className="space-y-4">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <input
                    type="file"
                    ref={cameraInputRef}
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {!photoPreview ? (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer ${
                        isDragging
                          ? "border-emerald-400 bg-emerald-500/10"
                          : "border-white/10 hover:border-white/20 bg-[#0b0c0e]/50 hover:bg-[#0b0c0e]/80"
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="w-14 h-14 rounded-2xl bg-[#1a1d22] border border-white/10 flex items-center justify-center text-zinc-400 shadow-inner">
                          <UploadSimple size={24} className="text-emerald-400" />
                        </div>

                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-zinc-200">
                            Drop product label photo here or{" "}
                            <span className="text-emerald-400 underline underline-offset-4">browse files</span>
                          </p>
                          <p className="text-xs text-zinc-500">
                            Supports JPG, PNG, WebP • Auto-compressed in browser for instant scanning
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              cameraInputRef.current?.click();
                            }}
                            className="rounded-full bg-[#1a1d22] border-white/15 hover:bg-white/[0.08] text-zinc-200 text-xs gap-1.5 h-9 px-4"
                          >
                            <Camera size={15} className="text-emerald-400" />
                            <span>Take Photo with Camera</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="relative rounded-2xl border border-white/10 bg-[#0b0c0e]/80 p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-5">
                      <div className="relative w-full sm:w-48 h-44 rounded-xl overflow-hidden bg-zinc-900 border border-white/10 shrink-0 shadow-md">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photoPreview}
                          alt="Scanned Label Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 space-y-2 text-center sm:text-left">
                        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="text-[11px] font-semibold text-emerald-300 uppercase tracking-wider">
                            Label Image Captured
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-white">Ready for Gemini Multimodal Extraction</h4>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          Gemini 3.5 Flash will automatically extract and parse all visible ingredients, E-numbers, and warning callouts.
                        </p>

                        <div className="flex items-center justify-center sm:justify-start gap-2 pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            className="rounded-full bg-[#1a1d22] border-white/10 hover:bg-white/[0.06] text-zinc-300 text-xs h-8 px-3"
                          >
                            Change Image
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setPhotoPreview(null);
                              setPhotoBase64(null);
                            }}
                            className="rounded-full text-rose-400 hover:bg-rose-500/10 text-xs h-8 px-3 gap-1"
                          >
                            <X size={14} />
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Mode 2: Barcode Lookup */}
              {mode === "barcode" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="relative flex-1">
                      <Barcode
                        size={18}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
                      />
                      <input
                        type="text"
                        placeholder="Enter 8 to 14 digit barcode (e.g. 8901030383849)"
                        value={barcodeQuery}
                        onChange={(e) => setBarcodeQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleBarcodeLookup()}
                        className="w-full h-11 pl-10 pr-4 bg-[#0b0c0e]/70 border border-white/[0.08] rounded-xl text-xs sm:text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20"
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={() => handleBarcodeLookup()}
                      disabled={barcodeLoading || !barcodeQuery.trim()}
                      className="bg-[#1a1d22] hover:bg-white/[0.08] border border-white/10 text-white rounded-xl h-11 px-5 text-xs font-semibold gap-1.5 transition-all"
                    >
                      {barcodeLoading ? (
                        <span className="w-4 h-4 border-2 border-zinc-400 border-t-white rounded-full animate-spin" />
                      ) : (
                        <MagnifyingGlass size={15} />
                      )}
                      <span>Lookup</span>
                    </Button>
                  </div>

                  {barcodeProduct && (
                    <div className="rounded-2xl border border-white/10 bg-[#0b0c0e]/70 p-4 space-y-3">
                      {barcodeProduct.found ? (
                        <div className="flex items-start gap-4">
                          {barcodeProduct.imageUrl && (
                            <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-zinc-900 border border-white/10 shrink-0">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={barcodeProduct.imageUrl}
                                alt="Product"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="flex-1 space-y-1">
                            <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-widest">
                              OpenFoodFacts Verified Match
                            </span>
                            <h4 className="text-sm font-semibold text-white">
                              {barcodeProduct.productName}
                            </h4>
                            {barcodeProduct.brands && (
                              <p className="text-xs text-zinc-400">{barcodeProduct.brands}</p>
                            )}
                            {barcodeProduct.hasIngredients ? (
                              <p className="text-xs text-zinc-300 line-clamp-2 pt-1">
                                {barcodeProduct.ingredientsText}
                              </p>
                            ) : (
                              <p className="text-xs text-amber-400 pt-1">
                                ⚠️ Product recognized, but ingredient list is empty in the database. Please snap a photo instead.
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                          <div className="space-y-0.5">
                            <p className="text-xs font-semibold text-amber-300">
                              Barcode #{barcodeProduct.barcode} not found in open database
                            </p>
                            <p className="text-xs text-zinc-400">
                              Regional foods and specialty goods can be decoded instantly by snapping a label photo.
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              setMode("photo");
                              cameraInputRef.current?.click();
                            }}
                            className="rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5 shrink-0"
                          >
                            <Camera size={14} />
                            <span>Switch to Photo Scan</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Mode 3: Text Input */}
              {mode === "text" && (
                <div className="space-y-3">
                  <Textarea
                    ref={textareaRef}
                    placeholder="e.g. Carbonated Water, High Fructose Corn Syrup, Caramel Color (E150d), Phosphoric Acid, Natural Flavors, Caffeine, Sodium Benzoate..."
                    className="min-h-[140px] max-h-[460px] bg-[#0b0c0e]/70 border-white/[0.08] text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500/40 rounded-2xl resize-none leading-relaxed text-sm p-4"
                    value={input}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    onChange={(e) => handleInputChange(e.target.value)}
                  />
                </div>
              )}

              {/* Action Button */}
              <Button
                onClick={handleScan}
                disabled={
                  loading ||
                  (mode === "text" && !input.trim()) ||
                  (mode === "photo" && !photoBase64 && !input.trim()) ||
                  (mode === "barcode" && !input.trim() && !photoBase64)
                }
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-2xl h-12 font-heading font-semibold text-sm transition-all active:scale-[0.98] shadow-[0_0_25px_-5px_rgba(52,211,153,0.35)] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-zinc-950/40 border-t-zinc-950 rounded-full animate-spin" />
                    <span>
                      {mode === "photo"
                        ? "Extracting label & analyzing compounds..."
                        : "Decoding biochemical profiles..."}
                    </span>
                  </>
                ) : (
                  <>
                    <Scan size={17} weight="bold" />
                    <span>
                      {mode === "photo"
                        ? "Decode Photo Label"
                        : mode === "barcode"
                        ? "Decode Scanned Product"
                        : "Decode Ingredients"}
                    </span>
                  </>
                )}
              </Button>
            </div>
          </motion.div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
              >
                <Alert className="bg-rose-500/10 border-rose-500/25 text-rose-300 rounded-2xl">
                  <Warning size={17} />
                  <AlertTitle className="font-semibold text-sm">Analysis Interrupted</AlertTitle>
                  <AlertDescription className="text-xs mt-1 text-rose-300/90">{error}</AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Results Presentation OR Empty State */}
        <section className="w-full">
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                {/* Hero Metrics Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                  {/* Safety Score Radial Dial */}
                  <div className="md:col-span-4 rounded-3xl border border-white/[0.07] bg-[#131518] backdrop-blur-xl flex flex-col items-center justify-center">
                    <HolisticSafetyDial score={result.overallScore} />
                  </div>

                  {/* Summary & Tally Card */}
                  <div className="md:col-span-8 rounded-3xl border border-white/[0.07] bg-[#131518] backdrop-blur-xl p-6 sm:p-7 flex flex-col justify-between space-y-5">
                    <div className="space-y-2.5">
                      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                        <ChartLineUp size={15} className="text-emerald-400" />
                        <span>Biochemical Summary</span>
                      </h3>
                      <p className="text-zinc-200 text-sm sm:text-base leading-relaxed">
                        {result.summary}
                      </p>
                    </div>

                    {/* Breakdown Badges */}
                    <div className="grid grid-cols-3 gap-3 border-t border-white/[0.07] pt-4">
                      <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center">
                        <span className="block text-2xl font-bold font-heading text-rose-400">
                          {result.scoreBreakdown?.highConcernCount ?? 0}
                        </span>
                        <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wide">
                          High Concern
                        </span>
                      </div>

                      <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
                        <span className="block text-2xl font-bold font-heading text-amber-400">
                          {result.scoreBreakdown?.moderateConcernCount ?? 0}
                        </span>
                        <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wide">
                          Moderate
                        </span>
                      </div>

                      <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                        <span className="block text-2xl font-bold font-heading text-emerald-400">
                          {result.scoreBreakdown?.lowConcernCount ?? 0}
                        </span>
                        <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wide">
                          Clean / Safe
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detailed Ingredient Breakdown Container */}
                <div className="rounded-3xl border border-white/[0.07] bg-[#131518] backdrop-blur-xl overflow-hidden">
                  {/* Category Filter Chips Header */}
                  <div className="p-5 sm:p-6 border-b border-white/[0.07] bg-[#16181d]/50 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={18} className="text-emerald-400" />
                      <h3 className="font-heading font-semibold text-zinc-100 text-sm sm:text-base">
                        Ingredient Profiles
                      </h3>
                      <span className="text-xs text-zinc-500 font-mono ml-1">
                        ({result.ingredients?.length ?? 0} total)
                      </span>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex items-center gap-1.5 p-1 bg-[#0b0c0e]/80 rounded-2xl border border-white/[0.07] text-xs">
                      <button
                        onClick={() => setFilterCategory("all")}
                        className={`px-3 py-1 rounded-xl transition-all ${
                          filterCategory === "all"
                            ? "bg-white/10 text-white font-medium"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        All ({result.ingredients?.length ?? 0})
                      </button>
                      <button
                        onClick={() => setFilterCategory("high")}
                        className={`px-3 py-1 rounded-xl transition-all ${
                          filterCategory === "high"
                            ? "bg-rose-500/20 text-rose-300 font-medium"
                            : "text-zinc-400 hover:text-rose-300"
                        }`}
                      >
                        High ({result.scoreBreakdown?.highConcernCount ?? 0})
                      </button>
                      <button
                        onClick={() => setFilterCategory("moderate")}
                        className={`px-3 py-1 rounded-xl transition-all ${
                          filterCategory === "moderate"
                            ? "bg-amber-500/20 text-amber-300 font-medium"
                            : "text-zinc-400 hover:text-amber-300"
                        }`}
                      >
                        Moderate ({result.scoreBreakdown?.moderateConcernCount ?? 0})
                      </button>
                      <button
                        onClick={() => setFilterCategory("low")}
                        className={`px-3 py-1 rounded-xl transition-all ${
                          filterCategory === "low"
                            ? "bg-emerald-500/20 text-emerald-300 font-medium"
                            : "text-zinc-400 hover:text-emerald-300"
                        }`}
                      >
                        Clean ({result.scoreBreakdown?.lowConcernCount ?? 0})
                      </button>
                    </div>
                  </div>

                  {/* Natural-Flow Ingredient List (Zero nested mobile scroll trap) */}
                  <div className="p-4 sm:p-6 space-y-3">
                    {filteredIngredients.length === 0 ? (
                      <div className="p-8 text-center text-zinc-500 text-sm">
                        No ingredients found in this risk category.
                      </div>
                    ) : (
                      filteredIngredients.map((ing: ScanIngredient, i: number) => {
                        const isExpanded = expandedIdx === i;
                        return (
                          <div
                            key={i}
                            className={`rounded-2xl bg-[#0b0c0e]/60 border border-white/[0.06] transition-all overflow-hidden ${getRiskBorder(
                              ing.riskLevel || "low"
                            )}`}
                          >
                            {/* Accordion Trigger */}
                            <button
                              type="button"
                              onClick={() => setExpandedIdx(isExpanded ? null : i)}
                              className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                            >
                              <div className="min-w-0 flex-1">
                                <h4 className="font-heading font-semibold text-zinc-100 text-sm sm:text-base truncate">
                                  {ing.name}
                                </h4>
                                <div className="text-xs text-zinc-400 capitalize mt-1 flex flex-wrap items-center gap-2">
                                  <span className="text-zinc-300">{ing.normalisedName}</span>
                                  <span>•</span>
                                  <span className="text-zinc-500">{ing.category || "General Compound"}</span>
                                  {ing.origin && (
                                    <>
                                      <span>•</span>
                                      <span className="text-zinc-500">Origin: {ing.origin}</span>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                <Badge
                                  className={`${getRiskColor(
                                    ing.riskLevel || "low"
                                  )} border text-[10px] tracking-wider uppercase font-semibold px-2.5 py-0.5 rounded-full`}
                                >
                                  {ing.riskLevel}
                                </Badge>
                                <motion.div
                                  animate={{ rotate: isExpanded ? 180 : 0 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <CaretDown size={15} className="text-zinc-400" />
                                </motion.div>
                              </div>
                            </button>

                            {/* Accordion Body */}
                            <AnimatePresence initial={false}>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.25, ease: "easeInOut" }}
                                  className="border-t border-white/[0.06] bg-[#0e1014]/70"
                                >
                                  <div className="p-4 sm:p-6 space-y-4 text-xs sm:text-sm">
                                    {/* Pros & Cons Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {ing.pros && ing.pros.length > 0 && (
                                        <div className="space-y-1.5 p-3.5 rounded-2xl bg-emerald-500/[0.04] border border-emerald-500/15">
                                          <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                                            <CheckCircle size={13} weight="bold" />
                                            <span>Pros / Purpose</span>
                                          </span>
                                          <ul className="list-disc list-inside text-zinc-300 space-y-1 pl-1">
                                            {ing.pros.map((pro, idx) => (
                                              <li key={idx} className="leading-relaxed">{pro}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}

                                      {ing.cons && ing.cons.length > 0 && (
                                        <div className="space-y-1.5 p-3.5 rounded-2xl bg-rose-500/[0.04] border border-rose-500/15">
                                          <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                                            <Warning size={13} weight="bold" />
                                            <span>Cons / Health Flags</span>
                                          </span>
                                          <ul className="list-disc list-inside text-zinc-300 space-y-1 pl-1">
                                            {ing.cons.map((con, idx) => (
                                              <li key={idx} className="leading-relaxed">{con}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>

                                    {/* Long-term Effects */}
                                    {((ing.longTermEffects?.positive && ing.longTermEffects.positive.length > 0) ||
                                      (ing.longTermEffects?.negative && ing.longTermEffects.negative.length > 0)) && (
                                      <div className="space-y-2 border-t border-white/[0.06] pt-4">
                                        <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                                          Cumulative Exposure Profile
                                        </span>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
                                          {ing.longTermEffects?.positive && ing.longTermEffects.positive.length > 0 && (
                                            <div>
                                              <span className="text-[11px] text-emerald-400 font-semibold mb-1 block">
                                                Positive Adaptations
                                              </span>
                                              <p className="text-zinc-300 leading-relaxed pl-1">
                                                {ing.longTermEffects.positive.join(", ")}
                                              </p>
                                            </div>
                                          )}
                                          {ing.longTermEffects?.negative && ing.longTermEffects.negative.length > 0 && (
                                            <div>
                                              <span className="text-[11px] text-rose-400 font-semibold mb-1 block">
                                                Chronic Risks
                                              </span>
                                              <p className="text-zinc-300 leading-relaxed pl-1">
                                                {ing.longTermEffects.negative.join(", ")}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    {/* Active Counters */}
                                    {ing.counter?.needed &&
                                      (ing.counter.nutrients?.length || ing.counter.suggestions?.length) && (
                                        <div className="p-4 rounded-2xl bg-emerald-950/25 border border-emerald-500/20 space-y-2">
                                          <span className="text-[11px] font-semibold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                                            <Info size={14} weight="bold" />
                                            <span>Active Mitigating Nutrition</span>
                                          </span>
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1 text-xs">
                                            {ing.counter.nutrients && ing.counter.nutrients.length > 0 && (
                                              <div>
                                                <span className="text-zinc-400 font-medium block mb-0.5">
                                                  Counteractive Nutrients
                                                </span>
                                                <span className="text-zinc-100 font-semibold">
                                                  {ing.counter.nutrients.join(", ")}
                                                </span>
                                              </div>
                                            )}
                                            {ing.counter.suggestions && ing.counter.suggestions.length > 0 && (
                                              <div>
                                                <span className="text-zinc-400 font-medium block mb-0.5">
                                                  Dietary Switches
                                                </span>
                                                <span className="text-zinc-100 font-semibold">
                                                  {ing.counter.suggestions.join(", ")}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}

                                    {/* Did You Know Fact */}
                                    {ing.didYouKnow && (
                                      <div className="text-xs text-zinc-300 italic bg-[#0b0c0e] p-3.5 rounded-xl border-l-2 border-emerald-400 pl-3.5 leading-relaxed mt-2">
                                        💡 {ing.didYouKnow}
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              /* Serene Empty State with 1-Click Starter Pills */
              <motion.div
                key="empty-state"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="rounded-3xl border border-white/[0.07] bg-[#131518]/70 backdrop-blur-xl p-8 sm:p-12 text-center space-y-6"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#1a1d22] border border-white/10 flex items-center justify-center mx-auto text-zinc-400 shadow-inner">
                  <Scan size={24} className="text-emerald-400" />
                </div>

                <div className="space-y-1.5 max-w-md mx-auto">
                  <h3 className="text-base sm:text-lg font-heading font-semibold text-white">
                    Ready to Analyze Any Label
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                    Upload a product photo, scan a barcode, or pick one of the sample products below to test instant decoding.
                  </p>
                </div>

                {/* 1-Click Starter Sample Cards */}
                <div className="pt-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 block mb-3">
                    Try a Quick Sample
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
                    {STARTER_SAMPLES.map((sample) => (
                      <button
                        key={sample.name}
                        type="button"
                        onClick={() => loadStarterSample(sample)}
                        className="group p-3.5 rounded-2xl bg-[#1a1d22]/80 hover:bg-[#1a1d22] border border-white/[0.07] hover:border-emerald-500/30 text-left transition-all active:scale-[0.98] cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-zinc-200 group-hover:text-emerald-300 transition-colors">
                            {sample.name}
                          </span>
                          <ArrowRight
                            size={12}
                            className="text-zinc-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all"
                          />
                        </div>
                        <span className="text-[10px] text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded-full inline-block">
                          {sample.tag}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>
    </div>
  );
}
