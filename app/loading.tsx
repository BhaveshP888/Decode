import Image from "next/image";

export default function Loading() {
  return (
    <div className="fixed inset-0 bg-zinc-950 flex flex-col items-center justify-center z-50">
      <div className="relative flex items-center justify-center">
        {/* Luminous outer ring animation */}
        <div className="absolute w-16 h-16 rounded-full border-2 border-emerald-500/10 border-t-emerald-500 animate-spin" />
        
        {/* Logo Container */}
        <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center bg-zinc-900 border border-white/5 animate-pulse">
          <Image
            src="/icon.png"
            alt="Decode Logo"
            width={40}
            height={40}
            className="object-cover"
          />
        </div>
      </div>
      
      {/* Subtle indicator text */}
      <span className="mt-4 text-xs font-medium text-zinc-500 tracking-wider uppercase animate-pulse">
        Loading...
      </span>
    </div>
  );
}
