import Image from "next/image";

export default function LandingLoading() {
  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-zinc-50 overflow-x-hidden selection:bg-emerald-500/30">
      {/* Landing Navbar Skeleton */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 h-16 border-b border-white/5 bg-zinc-950/80 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center overflow-hidden">
            <Image src="/icon.png" alt="Decode Logo" width={28} height={28} className="object-cover" />
          </div>
          <span className="font-semibold text-white tracking-tight">Decode</span>
        </div>

        <div className="w-28 h-9 rounded-full bg-white/10 animate-pulse" />
      </nav>

      {/* Hero Skeleton */}
      <section className="relative min-h-[100dvh] flex flex-col justify-center pt-16">
        <div className="relative max-w-7xl mx-auto px-6 md:px-12 py-24 animate-pulse space-y-6">
          <div className="w-56 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20" />
          <div className="w-96 max-w-full h-16 bg-zinc-900 rounded-2xl" />
          <div className="w-80 max-w-full h-16 bg-zinc-900 rounded-2xl" />
          <div className="w-[500px] max-w-full h-12 bg-zinc-900/60 rounded-xl" />
          <div className="w-48 h-12 rounded-full bg-emerald-600/30" />
        </div>
      </section>
    </div>
  );
}
