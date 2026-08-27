import Navbar from "@/components/navbar";

export default function CompareLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-emerald-500/30">
      <Navbar />
      <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-12 space-y-8 animate-pulse">
        <div className="space-y-3">
          <div className="w-36 h-6 bg-zinc-900 rounded-full border border-white/5" />
          <div className="w-72 h-10 bg-zinc-900 rounded-xl border border-white/5" />
          <div className="w-96 max-w-full h-4 bg-zinc-900 rounded-lg border border-white/5" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-zinc-900/40 rounded-2xl border border-white/5" />
          <div className="h-64 bg-zinc-900/40 rounded-2xl border border-white/5" />
        </div>
      </div>
    </div>
  );
}
