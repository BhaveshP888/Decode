import Navbar from "@/components/navbar";

export default function HistoryLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-indigo-500/30">
      <Navbar />
      <div className="max-w-5xl mx-auto p-4 sm:p-6 md:p-12 space-y-8 animate-pulse">
        <div className="space-y-3">
          <div className="w-32 h-6 bg-zinc-900 rounded-full border border-white/5" />
          <div className="w-64 h-10 bg-zinc-900 rounded-xl border border-white/5" />
          <div className="w-96 max-w-full h-4 bg-zinc-900 rounded-lg border border-white/5" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-[500px] bg-zinc-900/40 rounded-2xl border border-white/5" />
          <div className="h-[500px] bg-zinc-900/40 rounded-2xl border border-white/5" />
        </div>
      </div>
    </div>
  );
}
