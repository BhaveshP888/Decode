import Navbar from "@/components/navbar";

export default function RootLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-emerald-500/30">
      <Navbar />
      <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-12 space-y-10 animate-pulse">
        {/* Header Skeleton */}
        <div className="space-y-3">
          <div className="w-80 max-w-full h-12 bg-zinc-900 rounded-2xl border border-white/5" />
          <div className="w-96 max-w-full h-5 bg-zinc-900/60 rounded-lg border border-white/5" />
        </div>

        {/* Ingestion Panel Skeleton */}
        <div className="rounded-2xl border border-white/5 bg-zinc-900/40 p-6 space-y-6">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div className="w-36 h-5 bg-zinc-900 rounded-lg" />
            <div className="w-48 h-8 bg-zinc-950 rounded-xl border border-white/5" />
          </div>
          <div className="h-32 bg-zinc-950/60 rounded-xl border border-white/5" />
          <div className="h-12 bg-emerald-950/30 rounded-xl border border-emerald-500/10" />
        </div>

        {/* Empty State Skeleton */}
        <div className="rounded-2xl border border-white/5 bg-zinc-900/20 p-12 flex flex-col items-center justify-center space-y-3 min-h-[220px]">
          <div className="w-12 h-12 rounded-full bg-zinc-900 border border-white/5" />
          <div className="w-40 h-4 bg-zinc-900 rounded-lg" />
          <div className="w-64 h-3 bg-zinc-900/60 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
