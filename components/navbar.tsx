"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  ChartLineUp,
  CalendarCheck,
  SignOut,
  House,
  Scales,
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

  const navLinkClass = (path: string) =>
    `inline-flex items-center justify-center gap-1.5 h-9 rounded-full px-3 sm:px-4 text-sm font-medium transition-all duration-150 select-none ${
      isActive(path)
        ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 shadow-sm"
        : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
    }`;

  return (
    <nav className="sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6 md:px-12 h-16 border-b border-white/5 bg-zinc-950/80 backdrop-blur-xl">
      <Link 
        href="/"
        prefetch={true}
        className="flex items-center gap-2 cursor-pointer group select-none"
      >
        <div className="w-7 h-7 rounded-lg flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105 active:scale-95">
          <Image src="/icon.png" alt="Decode Logo" width={28} height={28} className="object-cover" />
        </div>
        <span className="font-semibold text-white tracking-tight transition-colors group-hover:text-zinc-200">
          Decode
        </span>
      </Link>

      <div className="flex items-center gap-1 sm:gap-1.5">
        <Link
          href="/"
          prefetch={true}
          className={navLinkClass("/")}
        >
          <House size={15} weight={isActive("/") ? "bold" : "regular"} />
          <span className="hidden sm:inline">Home</span>
        </Link>

        <Link
          href="/history"
          prefetch={true}
          className={navLinkClass("/history")}
        >
          <ChartLineUp size={15} weight={isActive("/history") ? "bold" : "regular"} />
          <span className="hidden sm:inline">Exposure</span>
        </Link>

        <Link
          href="/compare"
          prefetch={true}
          className={navLinkClass("/compare")}
        >
          <Scales size={15} weight={isActive("/compare") ? "bold" : "regular"} />
          <span className="hidden sm:inline">Compare</span>
        </Link>

        <Link
          href="/plan"
          prefetch={true}
          className={navLinkClass("/plan")}
        >
          <CalendarCheck size={15} weight={isActive("/plan") ? "bold" : "regular"} />
          <span className="hidden sm:inline">Plan</span>
        </Link>

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
