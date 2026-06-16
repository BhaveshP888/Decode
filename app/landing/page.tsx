'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion } from 'motion/react'
import { createClient } from '@/lib/supabase/client'
import {
  Scan,
  ShieldCheck,
  ChartLineUp,
  CalendarCheck,
  ArrowRight,
  Flask,
  Warning,
} from '@phosphor-icons/react'

// --- Sub-components ---

function NavBar() {
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 h-16 border-b border-white/5 bg-zinc-950/80 backdrop-blur-xl">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <Scan size={14} className="text-emerald-400" weight="bold" />
        </div>
        <span className="font-semibold text-white tracking-tight">Decode</span>
      </div>

      <button
        id="nav-login-btn"
        onClick={handleLogin}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-white text-zinc-900 text-sm font-medium hover:bg-zinc-100 active:scale-[0.97] transition-all disabled:opacity-60"
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-zinc-400 border-t-zinc-900 rounded-full animate-spin" />
        ) : (
          <ArrowRight size={14} weight="bold" />
        )}
        {loading ? 'Redirecting…' : 'Get started'}
      </button>
    </nav>
  )
}

const FEATURES = [
  {
    icon: Flask,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    title: 'Ingredient Breakdown',
    body: 'Paste any label. Decode identifies every ingredient, its origin, risk profile, and long-term effects.',
  },
  {
    icon: Warning,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
    title: 'Risk Scoring',
    body: 'A 0-10 safety score with a breakdown of high, moderate, and low-concern compounds.',
  },
  {
    icon: ChartLineUp,
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10 border-indigo-500/20',
    title: 'Exposure Tracking',
    body: 'Every scan is logged. See which additives you encounter most so you can make informed choices.',
  },
  {
    icon: CalendarCheck,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10 border-rose-500/20',
    title: 'Weekly Counter-Plan',
    body: 'AI aggregates your exposure data and suggests foods and swaps to counter accumulated additives.',
  },
]

const STATS = [
  { value: '2,000+', label: 'Ingredients in database' },
  { value: '< 10s', label: 'Average scan time' },
  { value: '3-stage', label: 'AI analysis pipeline' },
]

// --- Page ---

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
    initial: { opacity: 0, y: 28 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] as const },
  })

  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-zinc-50 overflow-x-hidden selection:bg-emerald-500/30">
      <NavBar />

      {/* ── HERO ────────────────────────────────────────────── */}
      <section className="relative min-h-[100dvh] flex flex-col justify-center pt-16">
        {/* Background image */}
        <div className="absolute inset-0">
          <Image
            src="/hero.png"
            alt="Packaged food products with ingredient labels"
            fill
            priority
            className="object-cover opacity-30"
          />
          {/* Gradient overlay so text reads cleanly */}
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-zinc-950/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 md:px-12 py-24">
          <div className="max-w-xl">
            <motion.div
              {...fadeUp(0)}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-400 text-xs font-medium mb-8 tracking-wide"
            >
              <ShieldCheck size={12} weight="fill" />
              AI-powered ingredient analysis
            </motion.div>

            <motion.h1
              {...fadeUp(0.1)}
              className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter leading-none text-white mb-6"
            >
              Know what goes
              <br />
              <span className="text-emerald-400">into your body.</span>
            </motion.h1>

            <motion.p
              {...fadeUp(0.2)}
              className="text-zinc-400 text-lg leading-relaxed mb-10 max-w-[52ch]"
            >
              Decode scans packaged food and medicine labels to expose what every ingredient actually is, where it comes from, and what it does to you over time.
            </motion.p>

            <motion.div {...fadeUp(0.3)} className="flex items-center gap-4">
              <button
                id="hero-login-btn"
                onClick={handleLogin}
                disabled={loginLoading}
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm transition-all active:scale-[0.97] shadow-[0_0_30px_-5px_rgba(52,211,153,0.4)] disabled:opacity-60"
              >
                {loginLoading ? (
                  <span className="w-4 h-4 border-2 border-zinc-700 border-t-zinc-950 rounded-full animate-spin" />
                ) : (
                  <ArrowRight size={15} weight="bold" />
                )}
                {loginLoading ? 'Redirecting…' : 'Start decoding — it\'s free'}
              </button>
            </motion.div>
          </div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="flex flex-wrap gap-8 mt-16 pt-8 border-t border-white/5"
          >
            {STATS.map(({ value, label }) => (
              <div key={label}>
                <div className="text-2xl font-bold text-white tracking-tight">{value}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 md:px-12 py-24 md:py-32">
        <div className="mb-16">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
            Three steps. Full picture.
          </h2>
          <p className="text-zinc-500 mt-3 max-w-[50ch]">
            Decode runs a three-stage AI pipeline so you get lab-quality analysis in seconds.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/5 rounded-2xl overflow-hidden border border-white/5">
          {[
            { step: '01', title: 'Paste your label', body: 'Type or paste the ingredient list from any packaged food, supplement, or medicine.' },
            { step: '02', title: 'AI decodes it', body: 'A 3-stage Gemini pipeline extracts, identifies, and deep-analyses every compound.' },
            { step: '03', title: 'Get your report', body: 'Receive a risk score, per-ingredient breakdown, and a running exposure profile.' },
          ].map(({ step, title, body }, i) => (
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] as const }}
              className="bg-zinc-900 p-8"
            >
              <div className="text-4xl font-bold text-white/10 tabular-nums mb-6">{step}</div>
              <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">{body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 md:px-12 pb-24 md:pb-32">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FEATURES.map(({ icon: Icon, color, bg, title, body }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] as const }}
              className="group p-6 rounded-2xl bg-zinc-900/60 border border-white/5 hover:border-white/10 transition-colors"
            >
              <div className={`w-10 h-10 rounded-xl border ${bg} flex items-center justify-center mb-5`}>
                <Icon size={18} className={color} weight="duotone" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">{body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── BOTTOM CTA ───────────────────────────────────────── */}
      <section className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-24 md:py-32 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] as const }}
            className="text-4xl md:text-5xl font-bold tracking-tighter text-white mb-4"
          >
            Your labels are hiding things.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15, duration: 0.7 }}
            className="text-zinc-500 mb-10 max-w-[40ch] mx-auto"
          >
            Start scanning for free. No credit card required.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.25, duration: 0.5 }}
          >
            <button
              id="bottom-login-btn"
              onClick={handleLogin}
              disabled={loginLoading}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-zinc-950 font-semibold hover:bg-zinc-100 active:scale-[0.97] transition-all shadow-[0_0_60px_-10px_rgba(255,255,255,0.2)] disabled:opacity-60"
            >
              <ArrowRight size={16} weight="bold" />
              Sign in with Google
            </button>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="border-t border-white/5 px-6 md:px-12 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-zinc-600 text-sm">
          <Scan size={14} className="text-zinc-700" />
          <span>Decode</span>
        </div>
        <p className="text-zinc-700 text-xs">For informational purposes only. Not medical advice.</p>
      </footer>
    </div>
  )
}
