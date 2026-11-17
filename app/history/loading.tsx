import Navbar from "@/components/navbar";

export default function HistoryLoading() {
  return (
    <div className="min-h-[100dvh] bg-[#0b0c0e] text-zinc-100 font-sans selection:bg-emerald-500/20">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-12 space-y-10 animate-pulse">
        {/* Header Skeleton */}
        <div className="space-y-3">
          <div className="w-36 h-6 bg-[#1a1d22] rounded-full border border-white/5" />
          <div className="w-72 h-10 bg-[#1a1d22] rounded-2xl border border-white/5" />
          <div className="w-96 max-w-full h-4 bg-[#1a1d22] rounded-lg border border-white/5" />
        </div>

        {/* Telemetry Row Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="h-32 bg-[#131518] rounded-3xl border border-white/5" />
          <div className="h-32 bg-[#131518] rounded-3xl border border-white/5" />
          <div className="h-32 bg-[#131518] rounded-3xl border border-white/5" />
        </div>

        {/* Main Content Split Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 h-[480px] bg-[#131518] rounded-3xl border border-white/5" />
          <div className="lg:col-span-7 h-[480px] bg-[#131518] rounded-3xl border border-white/5" />
        </div>
      </div>
    </div>
  );
}
