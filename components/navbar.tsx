"use client";

import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  ChartLineUp,
  CalendarCheck,
  SignOut,
  House,
} from "@phosphor-icons/react";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/landing");
  };

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <nav className="sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6 md:px-12 h-16 border-b border-white/5 bg-zinc-950/80 backdrop-blur-xl">
      <div 
        onClick={() => router.push("/")}
        className="flex items-center gap-2 cursor-pointer group select-none"
      >
        <div className="w-7 h-7 rounded-lg flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105 active:scale-95">
          <Image src="/icon.png" alt="Decode Logo" width={28} height={28} className="object-cover" />
        </div>
        <span className="font-semibold text-white tracking-tight transition-colors group-hover:text-zinc-200">
          Decode
        </span>
      </div>

      <div className="flex items-center gap-1 sm:gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/")}
          className={`gap-1.5 h-9 rounded-full px-3 sm:px-4 transition-all duration-200 ${
            isActive("/")
              ? "text-emerald-400 bg-emerald-500/5 hover:text-emerald-300 hover:bg-emerald-500/10"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
          }`}
        >
          <House size={15} weight={isActive("/") ? "bold" : "regular"} />
          <span className="hidden sm:inline">Home</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/history")}
          className={`gap-1.5 h-9 rounded-full px-3 sm:px-4 transition-all duration-200 ${
            isActive("/history")
              ? "text-emerald-400 bg-emerald-500/5 hover:text-emerald-300 hover:bg-emerald-500/10"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
          }`}
        >
          <ChartLineUp size={15} weight={isActive("/history") ? "bold" : "regular"} />
          <span className="hidden sm:inline">Exposure</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/plan")}
          className={`gap-1.5 h-9 rounded-full px-3 sm:px-4 transition-all duration-200 ${
            isActive("/plan")
              ? "text-emerald-400 bg-emerald-500/5 hover:text-emerald-300 hover:bg-emerald-500/10"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
          }`}
        >
          <CalendarCheck size={15} weight={isActive("/plan") ? "bold" : "regular"} />
          <span className="hidden sm:inline">Plan</span>
        </Button>

        <div className="w-px h-4 bg-zinc-800 mx-0.5 sm:mx-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="text-zinc-500 hover:text-white hover:bg-zinc-900/60 gap-1.5 h-9 rounded-full px-3 sm:px-4"
        >
          <SignOut size={15} />
          <span className="hidden sm:inline">Sign out</span>
        </Button>
      </div>
    </nav>
  );
}
