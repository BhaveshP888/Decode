'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'motion/react'
import { createClient } from '@/lib/supabase/client'
import {
  Sparkle,
  ArrowRight,
  Camera,
  Barcode,
  Scales,
  ShieldCheck,
  ChartLineUp,
  CalendarCheck,
  Warning,
  CheckCircle,
  Eye,
  Flask,
} from '@phosphor-icons/react'

// --- Sub-components ---

function NavBar({ onLogin, loading }: { onLogin: () => void; loading: boolean }) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-6 md:px-12 h-16 border-b border-white/[0.07] bg-[#0b0c0e]/85 backdrop-blur-xl">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center overflow-hidden shadow-sm">
          <Image src="/icon.png" alt="Decode Logo" width={28} height={28} className="object-cover" />
        </div>
        <span className="font-heading font-semibold text-white tracking-tight text-base">Decode</span>
      </div>

      <button
        id="nav-login-btn"
        onClick={onLogin}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-white text-zinc-950 text-xs sm:text-sm font-semibold hover:bg-zinc-100 active:scale-[0.97] transition-all disabled:opacity-60 cursor-pointer shadow-sm"
      >
        {loading ? (
          <span className="w-3.5 h-3.5 border-2 border-zinc-400 border-t-zinc-950 rounded-full animate-spin" />
        ) : (
          <ArrowRight size={14} weight="bold" />
        )}
        <span>{loading ? 'Redirecting…' : 'Get Started Free'}</span>
      </button>
    </nav>
  )
}

// --- Interactive Living Label Component ---

function LivingLabelPreview() {
  const [viewMode, setViewMode] = useState<'marketing' | 'decoded'>('decoded')

  return (
    <div className="rounded-3xl border border-white/[0.08] bg-[#131518] shadow-2xl overflow-hidden backdrop-blur-xl">
      {/* Top Header & Toggle */}
      <div className="p-4 sm:p-5 border-b border-white/[0.07] bg-[#16181d]/70 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-xs font-semibold text-zinc-300">Live Simulation: Energy Elixir</span>
        </div>

        {/* State Switcher */}
        <div className="flex items-center gap-1 p-1 bg-[#0b0c0e]/90 rounded-2xl border border-white/[0.07] text-xs">
          <button
            type="button"
            onClick={() => setViewMode('marketing')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              viewMode === 'marketing'
                ? 'bg-white/10 text-white font-medium shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Package Claim
          </button>
          <button
            type="button"
            onClick={() => setViewMode('decoded')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              viewMode === 'decoded'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium shadow-sm'
                : 'text-zinc-400 hover:text-emerald-300'
            }`}
          >
            <Flask size={13} weight="fill" />
            <span>Decoded</span>
          </button>
        </div>
      </div>

      {/* Card Content Viewport */}
      <div className="p-5 sm:p-6 min-h-[340px] flex flex-col justify-between">
        <AnimatePresence mode="wait">
          {viewMode === 'marketing' ? (
            <motion.div
              key="marketing"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-widest">
                  Front Label Buzzwords
                </span>
                <h4 className="text-xl font-heading font-bold text-white">
                  Volt Spark — Zero Sugar Citrus
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  &ldquo;100% plant-powered focus with botanical extracts, essential electrolytes, and zero added sugars for pristine vitality.&rdquo;
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2.5 pt-2">
                <div className="p-3 rounded-2xl bg-[#1a1d22] border border-white/[0.06] text-center">
                  <span className="block text-sm font-semibold text-zinc-200">0g</span>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wide">Sugar</span>
                </div>
                <div className="p-3 rounded-2xl bg-[#1a1d22] border border-white/[0.06] text-center">
                  <span className="block text-sm font-semibold text-emerald-300">Clean</span>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wide">Botanicals</span>
                </div>
                <div className="p-3 rounded-2xl bg-[#1a1d22] border border-white/[0.06] text-center">
                  <span className="block text-sm font-semibold text-zinc-200">B-Complex</span>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wide">Vitamins</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#1a1d22]/50 border border-white/[0.05] text-xs text-zinc-400 flex items-center gap-2.5">
                <Eye size={16} className="text-zinc-500 shrink-0" />
                <span>On the shelf, this product appears completely harmless and clean.</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="decoded"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              {/* Score header */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
                    Decoded Safety Rating
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-3xl font-heading font-bold text-amber-400">4.3</span>
                    <span className="text-xs text-zinc-500">/ 10 · Moderate Caution</span>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/25">
                  2 High Concerns
                </span>
              </div>

              {/* Chemical Breakdown List */}
              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-rose-500/[0.06] border border-rose-500/15 flex items-start gap-2.5">
                  <Warning size={15} className="text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-zinc-200">Sucralose (E955)</span>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Chlorinated artificial sweetener. Inhibits beneficial gut microbiome and degrades under heat.
                    </p>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-rose-500/[0.06] border border-rose-500/15 flex items-start gap-2.5">
                  <Warning size={15} className="text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-zinc-200">Sodium Benzoate (E211)</span>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Preservative. Can form carcinogenic benzene when combined with citric acid or ascorbic acid.
                    </p>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-amber-500/[0.06] border border-amber-500/15 flex items-start gap-2.5">
                  <Warning size={15} className="text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-zinc-200">Citric Acid (Synthetic)</span>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Produced via Aspergillus niger (black mold fermentation), not natural lemons.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Prompt */}
        <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-500">
          <span>Click tabs above to compare reality vs marketing</span>
          <span className="text-emerald-400 font-medium">Decode Engine</span>
        </div>
      </div>
    </div>
  )
}

// --- Main Page ---

export default function LandingPage() {
  const [loginLoading, setLoginLoading] = useState(false)

  const handleLogin = async () => {
    setLoginLoading(true)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] as const },
  })

  return (
    <div className="min-h-[100dvh] bg-[#0b0c0e] text-zinc-100 selection:bg-emerald-500/20 overflow-x-hidden">
      <NavBar onLogin={handleLogin} loading={loginLoading} />

      {/* ── HERO SECTION ────────────────────────────────────────── */}
      <section className="relative pt-28 pb-16 sm:pt-36 sm:pb-24 px-4 sm:px-6 md:px-12 max-w-7xl mx-auto">
        {/* Soft background ambient gradient */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Headline & CTA */}
          <div className="lg:col-span-7 space-y-6">
            <motion.div
              {...fadeUp(0)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-300 text-xs font-semibold tracking-wide"
            >
              <Sparkle size={13} weight="fill" />
              <span>Biochemical Label Intelligence</span>
            </motion.div>

            <motion.h1
              {...fadeUp(0.1)}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-heading font-bold tracking-tight text-white leading-[1.08]"
            >
              Know what goes <br className="hidden sm:inline" />
              into your <span className="text-emerald-400">body.</span>
            </motion.h1>

            <motion.p
              {...fadeUp(0.2)}
              className="text-zinc-400 text-base sm:text-lg leading-relaxed max-w-xl"
            >
              Decode translates confusing chemical codes, hidden artificial sweeteners, and petroleum-derived food dyes into clear, actionable health clarity in seconds.
            </motion.p>

            {/* CTAs */}
            <motion.div {...fadeUp(0.3)} className="flex flex-wrap items-center gap-4 pt-2">
              <button
                id="hero-login-btn"
                onClick={handleLogin}
                disabled={loginLoading}
                className="flex items-center gap-2.5 px-6 sm:px-7 py-3.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-heading font-semibold text-sm transition-all active:scale-[0.98] shadow-[0_0_30px_-5px_rgba(52,211,153,0.4)] disabled:opacity-60 cursor-pointer"
              >
                {loginLoading ? (
                  <span className="w-4 h-4 border-2 border-zinc-900 border-t-white rounded-full animate-spin" />
                ) : (
                  <ArrowRight size={16} weight="bold" />
                )}
                <span>{loginLoading ? 'Signing in with Google…' : 'Start Decoding Free'}</span>
              </button>

              <span className="text-xs text-zinc-500 font-medium">
                No credit card required
              </span>
            </motion.div>

            {/* Truthful Core Pillars */}
            <motion.div
              {...fadeUp(0.4)}
              className="grid grid-cols-3 gap-4 pt-6 border-t border-white/[0.07] max-w-lg"
            >
              <div>
                <div className="font-heading font-bold text-white text-base">Camera OCR</div>
                <div className="text-[11px] text-zinc-500 mt-0.5">Snap curved bottles</div>
              </div>
              <div>
                <div className="font-heading font-bold text-white text-base">Barcode Scan</div>
                <div className="text-[11px] text-zinc-500 mt-0.5">Instant catalog match</div>
              </div>
              <div>
                <div className="font-heading font-bold text-white text-base">Exposure Log</div>
                <div className="text-[11px] text-zinc-500 mt-0.5">7-day cumulative drift</div>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Signature Move (Interactive Living Label) */}
          <div className="lg:col-span-5">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <LivingLabelPreview />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── 3 CORE CAPABILITIES SHOWCASE ────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-16 sm:py-24 border-t border-white/[0.07]">
        <div className="mb-12 space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Engine Capabilities
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-white tracking-tight">
            Built for how you actually shop.
          </h2>
          <p className="text-zinc-400 text-sm max-w-xl">
            From the grocery aisle to your home pantry, capture information without typing chemical names.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Camera Vision */}
          <div className="rounded-3xl border border-white/[0.07] bg-[#131518] p-6 sm:p-7 space-y-4 hover:border-white/[0.12] transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-300">
              <Camera size={22} weight="duotone" />
            </div>
            <h3 className="font-heading font-semibold text-lg text-white">
              Multimodal Label Vision
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Snap photos of curved bottles, crumpled snack wrappers, or multilingual ingredients. Our in-browser pipeline optimizes images for rapid Gemini 3.5 extraction.
            </p>
          </div>

          {/* Card 2: Barcode Catalog */}
          <div className="rounded-3xl border border-white/[0.07] bg-[#131518] p-6 sm:p-7 space-y-4 hover:border-white/[0.12] transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-300">
              <Barcode size={22} weight="duotone" />
            </div>
            <h3 className="font-heading font-semibold text-lg text-white">
              Barcode Intelligence
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Scan standard EAN/UPC barcodes for instant product recognition via OpenFoodFacts. Missing ingredients fallback gracefully to camera photo scanning.
            </p>
          </div>

          {/* Card 3: Product Comparison */}
          <div className="rounded-3xl border border-white/[0.07] bg-[#131518] p-6 sm:p-7 space-y-4 hover:border-white/[0.12] transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-300">
              <Scales size={22} weight="duotone" />
            </div>
            <h3 className="font-heading font-semibold text-lg text-white">
              Decode Versus
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Hold two competing peanut butters or protein powders in hand. Decode analyzes both side-by-side to declare an unambiguous nutritional winner.
            </p>
          </div>
        </div>
      </section>

      {/* ── CUMULATIVE EXPOSURE SECTION ─────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-16 sm:py-24 border-t border-white/[0.07]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/25 bg-indigo-500/10 text-indigo-300 text-xs font-semibold">
              <ChartLineUp size={14} weight="bold" />
              <span>Chronic Exposure Tracking</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-white tracking-tight">
              One additive is harmless. <br />
              Twenty a day compounds.
            </h2>
            <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
              Most health apps analyze isolated meals. Decode aggregates your scans across the week to highlight which emulsifiers, preservatives, or artificial dyes you consume repeatedly.
            </p>

            <div className="space-y-3 pt-2 text-xs sm:text-sm">
              <div className="flex items-center gap-3 text-zinc-300">
                <CheckCircle size={18} className="text-emerald-400 shrink-0" weight="fill" />
                <span>Weekly exposure trends identifying your top 3 recurring additives</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-300">
                <CheckCircle size={18} className="text-emerald-400 shrink-0" weight="fill" />
                <span>AI-generated counteractive food swaps and neutralizing nutrients</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-300">
                <CheckCircle size={18} className="text-emerald-400 shrink-0" weight="fill" />
                <span>Zero medical jargon — plain-English guidance you can act on immediately</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="rounded-3xl border border-white/[0.07] bg-[#131518] p-6 sm:p-7 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/[0.07] pb-4">
                <div className="flex items-center gap-2.5">
                  <CalendarCheck size={18} className="text-emerald-400" />
                  <span className="font-heading font-semibold text-sm text-white">
                    Sample 7-Day Exposure Drift
                  </span>
                </div>
                <span className="text-xs text-zinc-500 font-mono">Simulated</span>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-zinc-300">Emulsifiers (Polysorbate 80 & Carrageenan)</span>
                    <span className="text-rose-400 font-semibold">5x this week</span>
                  </div>
                  <div className="w-full h-2 bg-[#0b0c0e] rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full w-[80%]" />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-zinc-300">Preservatives (Sodium Benzoate & Sorbates)</span>
                    <span className="text-amber-400 font-semibold">3x this week</span>
                  </div>
                  <div className="w-full h-2 bg-[#0b0c0e] rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full w-[50%]" />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-zinc-300">Clean Whole Ingredients</span>
                    <span className="text-emerald-400 font-semibold">12 items</span>
                  </div>
                  <div className="w-full h-2 bg-[#0b0c0e] rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full w-[90%]" />
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2.5">
                <ShieldCheck size={17} className="text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  Counter-nutrient recommendation: Add dietary soluble fibers (chia seeds, oats) to strengthen your gut mucosal barrier against synthetic emulsifiers.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── BOTTOM CALL TO ACTION ───────────────────────────────── */}
      <section className="border-t border-white/[0.07] bg-gradient-to-b from-transparent to-[#131518]/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-12 py-20 sm:py-28 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-300 text-xs font-semibold">
            <Sparkle size={13} weight="fill" />
            <span>Ready in 10 Seconds</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold text-white tracking-tight">
            Stop guessing what you consume.
          </h2>
          <p className="text-zinc-400 text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
            Join conscious shoppers taking control of what enters their bodies. Free, instant, and completely ad-free.
          </p>

          <div className="pt-2">
            <button
              id="bottom-login-btn"
              onClick={handleLogin}
              disabled={loginLoading}
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-full bg-white text-zinc-950 font-heading font-bold text-sm hover:bg-zinc-100 active:scale-[0.98] transition-all shadow-[0_0_50px_-10px_rgba(255,255,255,0.25)] disabled:opacity-60 cursor-pointer"
            >
              {loginLoading ? (
                <span className="w-4 h-4 border-2 border-zinc-900 border-t-zinc-400 rounded-full animate-spin" />
              ) : (
                <ArrowRight size={16} weight="bold" />
              )}
              <span>{loginLoading ? 'Signing in with Google…' : 'Sign In with Google'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.07] px-4 sm:px-6 md:px-12 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
        <div className="flex items-center gap-2.5">
          <Image src="/icon.png" alt="Decode Logo" width={16} height={16} className="object-cover rounded opacity-60" />
          <span className="font-heading font-semibold text-zinc-400">Decode</span>
          <span>•</span>
          <span>Biochemical Health Intelligence</span>
        </div>

        <p className="text-center sm:text-right">
          For informational and educational purposes only. Not intended as medical diagnosis or advice.
        </p>
      </footer>
    </div>
  )
}
