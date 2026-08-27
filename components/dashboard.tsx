"use client";

import { useState, useRef, ChangeEvent, DragEvent } from "react";
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
  Camera,
  Barcode,
  UploadSimple,
  X,
  MagnifyingGlass,
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

type ScanMode = "text" | "photo" | "barcode";

export default function Dashboard() {
  const [mode, setMode] = useState<ScanMode>("text");
  const [input, setInput] = useState("");
  const [productName, setProductName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState("");
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [isFocused, setIsFocused] = useState(false);
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
      setError("Unable to lookup barcode. Please check your internet connection.");
    } finally {
      setBarcodeLoading(false);
    }
  };

  const handleScan = async () => {
    if (mode === "text" && !input.trim()) return;
    if (mode === "photo" && !photoBase64 && !input.trim()) {
      setError("Please select or capture a photo of the ingredients label first.");
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
            Scan ingredients via photo, barcode, or text to expose hidden additives, artificial compounds, and health risks.
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
              {/* Top Bar with Mode Switcher */}
              <div className="p-4 sm:p-6 border-b border-white/5 bg-zinc-900/20 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Flask size={18} className="text-emerald-400" />
                    <h3 className="font-semibold text-zinc-100 text-sm">Analyze Product Label</h3>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {mode === "text" && "Type or paste comma-separated ingredients"}
                    {mode === "photo" && "Upload or snap a photo of the nutrition/ingredient label"}
                    {mode === "barcode" && "Scan product barcode with instant OpenFoodFacts lookup"}
                  </p>
                </div>

                {/* Scan Mode Toggle Tabs */}
                <div className="flex items-center gap-1 p-1 bg-zinc-950/80 rounded-xl border border-white/5">
                  <button
                    type="button"
                    onClick={() => setMode("text")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      mode === "text"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Flask size={14} />
                    <span>Text</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode("photo")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      mode === "photo"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Camera size={14} />
                    <span>Photo / Camera</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode("barcode")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      mode === "barcode"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Barcode size={14} />
                    <span>Barcode</span>
                  </button>
                </div>
              </div>

              {/* Mode-Specific Input Areas */}
              <div className="p-4 sm:p-6 space-y-4">
                {/* 1. TEXT MODE */}
                {mode === "text" && (
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Optional Product Name (e.g. Diet Coke, Amul Butter)"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      className="w-full h-10 px-4 bg-zinc-950/60 border border-zinc-800/80 rounded-xl text-xs sm:text-sm text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500/30 focus:ring-1 focus:ring-emerald-500/20"
                    />

                    <Textarea
                      ref={textareaRef}
                      placeholder="e.g. Carbonated Water, Sugar, High Fructose Corn Syrup, Caramel Color (E150d), Phosphoric Acid, Natural Flavors, Caffeine, Sodium Benzoate..."
                      className="min-h-[130px] max-h-[500px] bg-zinc-950/60 border-zinc-800/80 text-zinc-300 placeholder:text-zinc-700 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500/30 rounded-xl resize-none leading-relaxed text-sm p-4 overflow-hidden"
                      value={input}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      onChange={(e) => handleInputChange(e.target.value)}
                    />
                  </div>
                )}

                {/* 2. PHOTO / CAMERA MODE */}
                {mode === "photo" && (
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Optional Product Name (e.g. Haldiram's Bhujia)"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      className="w-full h-10 px-4 bg-zinc-950/60 border border-zinc-800/80 rounded-xl text-xs sm:text-sm text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500/30 focus:ring-1 focus:ring-emerald-500/20"
                    />

                    {/* Hidden Native File & Camera Inputs */}
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
                        className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer ${
                          isDragging
                            ? "border-emerald-500 bg-emerald-500/5"
                            : "border-zinc-800 hover:border-zinc-700 bg-zinc-950/40"
                        }`}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <div className="flex flex-col items-center justify-center space-y-4">
                          <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-400 group-hover:scale-105 transition-transform">
                            <UploadSimple size={24} className="text-emerald-400" />
                          </div>

                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-zinc-200">
                              Drop label photo here or{" "}
                              <span className="text-emerald-400 underline">browse files</span>
                            </p>
                            <p className="text-xs text-zinc-500">
                              Supports JPG, PNG, WebP up to 10MB • Clear back packaging works best
                            </p>
                          </div>

                          <div className="flex items-center gap-3 pt-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                cameraInputRef.current?.click();
                              }}
                              className="rounded-full bg-zinc-900 border-white/10 hover:bg-zinc-800 text-zinc-200 text-xs gap-1.5"
                            >
                              <Camera size={14} className="text-emerald-400" />
                              <span>Take Photo</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="relative rounded-2xl border border-white/10 bg-zinc-950/80 p-4 flex flex-col sm:flex-row items-center gap-4">
                        <div className="relative w-full sm:w-48 h-44 rounded-xl overflow-hidden bg-zinc-900 border border-white/5 shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photoPreview}
                            alt="Scanned Label Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="flex-1 space-y-2 text-center sm:text-left">
                          <div className="flex items-center justify-center sm:justify-start gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                              Label Image Ready
                            </span>
                          </div>
                          <p className="text-sm font-medium text-zinc-200">
                            Gemini 3.5 Flash will extract and analyze all visible ingredients and warnings.
                          </p>
                          <div className="flex items-center justify-center sm:justify-start gap-2 pt-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => fileInputRef.current?.click()}
                              className="rounded-full bg-zinc-900 border-white/10 hover:bg-zinc-800 text-zinc-300 text-xs"
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
                              className="rounded-full text-red-400 hover:bg-red-500/10 text-xs gap-1"
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

                {/* 3. BARCODE MODE */}
                {mode === "barcode" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
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
                          className="w-full h-11 pl-10 pr-4 bg-zinc-950/60 border border-zinc-800/80 rounded-xl text-xs sm:text-sm text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500/30 focus:ring-1 focus:ring-emerald-500/20"
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={() => handleBarcodeLookup()}
                        disabled={barcodeLoading || !barcodeQuery.trim()}
                        className="bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-white rounded-xl h-11 px-5 text-xs font-semibold gap-1.5"
                      >
                        {barcodeLoading ? (
                          <span className="w-4 h-4 border-2 border-zinc-400 border-t-white rounded-full animate-spin" />
                        ) : (
                          <MagnifyingGlass size={15} />
                        )}
                        <span>Lookup</span>
                      </Button>
                    </div>

                    {/* Barcode Result Feedback */}
                    {barcodeProduct && (
                      <div className="rounded-xl border border-white/10 bg-zinc-950/60 p-4 space-y-3">
                        {barcodeProduct.found ? (
                          <div className="flex items-start gap-4">
                            {barcodeProduct.imageUrl && (
                              <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-zinc-900 border border-white/5 shrink-0">
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
                                OpenFoodFacts Match Found
                              </span>
                              <h4 className="text-sm font-semibold text-white">
                                {barcodeProduct.productName}
                              </h4>
                              {barcodeProduct.brands && (
                                <p className="text-xs text-zinc-500">{barcodeProduct.brands}</p>
                              )}
                              {barcodeProduct.hasIngredients ? (
                                <p className="text-xs text-zinc-400 line-clamp-2 pt-1">
                                  {barcodeProduct.ingredientsText}
                                </p>
                              ) : (
                                <p className="text-xs text-amber-400 pt-1">
                                  ⚠️ Product found, but ingredients text was unlisted in catalog. Please snap a photo instead.
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                            <div className="space-y-0.5">
                              <p className="text-xs font-semibold text-amber-400">
                                Barcode #{barcodeProduct.barcode} not found in open database
                              </p>
                              <p className="text-xs text-zinc-500">
                                Common for regional Indian products. Snap a label photo to decode instantly with Gemini.
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

                {/* Primary Scan Button */}
                <Button
                  onClick={handleScan}
                  disabled={
                    loading ||
                    (mode === "text" && !input.trim()) ||
                    (mode === "photo" && !photoBase64 && !input.trim()) ||
                    (mode === "barcode" && !input.trim() && !photoBase64)
                  }
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl h-12 font-semibold transition-all active:scale-[0.98] shadow-[0_0_20px_-5px_rgba(16,185,129,0.3)] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>
                        {mode === "photo" ? "Reading Image & Decoding..." : "Decoding Ingredients..."}
                      </span>
                    </>
                  ) : (
                    <>
                      <Scan size={16} weight="bold" />
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
                      Select text, camera photo, or barcode above to analyze safety and potential health risks.
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
