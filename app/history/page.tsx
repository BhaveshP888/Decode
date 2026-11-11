import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import Navbar from '@/components/navbar'
import HistoryClient, { DBScan } from '@/components/history-client'
import {
  Sparkle,
  ChartLineUp,
  ShieldCheck,
  Flame,
  CheckCircle,
  CalendarBlank,
} from '@phosphor-icons/react/dist/ssr'

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const scans = await prisma.scan.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      ingredients: {
        include: {
          ingredient: true,
        },
      },
    },
  })

  const exposures = await prisma.exposureTracking.findMany({
    where: { userId: user.id },
    orderBy: { exposureCount: 'desc' },
    include: {
      ingredient: true,
    },
  })

  // Compute real macro health telemetry
  const totalScans = scans.length
  const cleanScansCount = scans.filter((s) => s.overallScore >= 7.0).length
  const cleanRatio = totalScans > 0 ? Math.round((cleanScansCount / totalScans) * 100) : 0
  const topExposure = exposures.length > 0 ? exposures[0] : null
  const highRiskExposuresCount = exposures.filter(
    (e) => e.ingredient.riskLevel === 'high'
  ).length

  return (
    <div className="min-h-[100dvh] bg-[#0b0c0e] text-zinc-100 font-sans selection:bg-emerald-500/20">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-12 space-y-10">
        {/* Editorial Heading */}
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-300 text-xs font-medium tracking-wide">
            <Sparkle size={13} weight="fill" />
            <span>Cumulative Health Analytics</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold tracking-tight text-white leading-tight">
            Your Exposure <span className="text-emerald-400">Profile.</span>
          </h1>
          <p className="text-zinc-400 text-sm sm:text-base max-w-2xl leading-relaxed">
            Review chronic additive accumulation across your scans. Track recurring synthetic preservatives,
            dietary sweeteners, and long-term biochemical exposure drift.
          </p>
        </header>

        {/* Top Macro Telemetry Bento Row */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
          {/* Card 1: Total Scans */}
          <div className="rounded-3xl border border-white/[0.07] bg-[#131518] p-5 sm:p-6 space-y-3 shadow-sm hover:border-white/[0.12] transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                Products Decoded
              </span>
              <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/5 flex items-center justify-center text-zinc-400">
                <ChartLineUp size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-heading font-bold text-white tracking-tight">
                {totalScans}
              </span>
              <span className="text-xs text-zinc-500 font-medium">total entries</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Decoded across camera vision OCR, barcode intelligence, and ingredient lists.
            </p>
          </div>

          {/* Card 2: Clean Ratio */}
          <div className="rounded-3xl border border-white/[0.07] bg-[#131518] p-5 sm:p-6 space-y-3 shadow-sm hover:border-white/[0.12] transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                Clean Ratio
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-300">
                <ShieldCheck size={16} weight="fill" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-3xl sm:text-4xl font-heading font-bold tracking-tight ${
                  cleanRatio >= 70
                    ? 'text-emerald-400'
                    : cleanRatio >= 40
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {cleanRatio}%
              </span>
              <span className="text-xs text-zinc-500 font-medium">scored ≥ 7.0</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {cleanScansCount} of {totalScans} products classified in the low-risk or safe tier.
            </p>
          </div>

          {/* Card 3: Top Chronic Risk */}
          <div className="rounded-3xl border border-white/[0.07] bg-[#131518] p-5 sm:p-6 space-y-3 shadow-sm hover:border-white/[0.12] transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                Top Recurring Additive
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-300">
                <Flame size={16} weight="fill" />
              </div>
            </div>
            <div className="min-w-0">
              <span className="text-xl sm:text-2xl font-heading font-bold text-white tracking-tight truncate block">
                {topExposure ? topExposure.ingredient.name : 'None Logged'}
              </span>
              <span className="text-xs text-zinc-500 font-medium mt-0.5 block">
                {topExposure ? `${topExposure.exposureCount}x encountered` : 'Clean log'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {highRiskExposuresCount > 0
                ? `${highRiskExposuresCount} high-concern compound${
                    highRiskExposuresCount > 1 ? 's' : ''
                  } tracked in your profile.`
                : 'Zero chronic high-concern additives recorded in your log.'}
            </p>
          </div>
        </section>

        {/* Main Content Split: Chronic Exposures vs Recent Scans Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (5 Cols): Cumulative Exposures */}
          <section className="lg:col-span-5 rounded-3xl border border-white/[0.07] bg-[#131518] backdrop-blur-xl overflow-hidden shadow-sm">
            <div className="p-5 sm:p-6 border-b border-white/[0.07] bg-[#16181d]/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame size={17} className="text-amber-400" weight="fill" />
                <h3 className="font-heading font-semibold text-zinc-100 text-sm sm:text-base">
                  Chronic Exposures
                </h3>
              </div>
              <span className="text-xs text-zinc-500 font-mono">
                {exposures.length} COMPOUNDS
              </span>
            </div>

            <div className="p-4 sm:p-5 space-y-2.5">
              {exposures.map((exp: (typeof exposures)[number]) => {
                const isHigh = exp.ingredient.riskLevel === 'high'
                const isMod = exp.ingredient.riskLevel === 'moderate'
                const riskBorder = isHigh
                  ? 'border-l-4 border-l-rose-500/80'
                  : isMod
                  ? 'border-l-4 border-l-amber-500/80'
                  : 'border-l-4 border-l-emerald-500/80'
                const riskColor = isHigh
                  ? 'text-rose-400'
                  : isMod
                  ? 'text-amber-400'
                  : 'text-emerald-400'

                return (
                  <div
                    key={exp.id}
                    className={`flex items-center justify-between p-3.5 rounded-2xl bg-[#0b0c0e]/60 border border-white/[0.06] hover:border-white/[0.12] transition-colors gap-3 ${riskBorder}`}
                  >
                    <div className="min-w-0 flex-1">
                      <h4 className="font-heading font-semibold text-zinc-100 text-sm truncate">
                        {exp.ingredient.name}
                      </h4>
                      <div className="text-xs text-zinc-400 capitalize flex flex-wrap items-center gap-2 mt-0.5">
                        <span className={`font-medium ${riskColor}`}>
                          {exp.ingredient.riskLevel} risk
                        </span>
                        <span>•</span>
                        <span className="text-zinc-500 truncate">
                          {exp.ingredient.category || 'General'}
                        </span>
                      </div>
                    </div>

                    <Badge
                      variant="secondary"
                      className="bg-[#1a1d22] text-zinc-200 border border-white/10 px-2.5 py-1 text-xs font-heading font-semibold shrink-0 rounded-full"
                    >
                      {exp.exposureCount}x
                    </Badge>
                  </div>
                )
              })}

              {exposures.length === 0 && (
                <div className="flex flex-col items-center justify-center p-12 text-center text-zinc-500 space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-[#1a1d22] border border-white/5 flex items-center justify-center text-zinc-400">
                    <CheckCircle size={22} className="text-emerald-400" />
                  </div>
                  <h4 className="text-sm font-semibold text-zinc-300">No Exposures Recorded</h4>
                  <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
                    As you scan packaged foods and medicines, additives and chemicals will automatically populate here.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Right Column (7 Cols): Recent Scans Archive */}
          <section className="lg:col-span-7 rounded-3xl border border-white/[0.07] bg-[#131518] backdrop-blur-xl overflow-hidden shadow-sm">
            <div className="p-5 sm:p-6 border-b border-white/[0.07] bg-[#16181d]/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarBlank size={17} className="text-emerald-400" />
                <h3 className="font-heading font-semibold text-zinc-100 text-sm sm:text-base">
                  Scanned Products Archive
                </h3>
              </div>
              <span className="text-xs text-zinc-500 font-mono">
                {scans.length} LOGGED
              </span>
            </div>

            <div className="p-4 sm:p-5">
              <HistoryClient scans={scans as unknown as DBScan[]} />
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
