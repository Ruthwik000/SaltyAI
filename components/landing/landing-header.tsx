"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface LandingHeaderProps {
  apiState: "checking" | "ready" | "demo";
}

export function LandingHeader({ apiState }: LandingHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-950 font-sans text-xs font-bold text-white">
            S*
          </span>
          <span className="text-sm font-semibold tracking-tight">
            salty<span className="text-zinc-400">.ai</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-xs font-medium text-zinc-600 md:flex">
          <Link href="#platform" className="hover:text-zinc-950 transition-colors">
            Platform
          </Link>
          <Link href="#signals" className="hover:text-zinc-950 transition-colors">
            Live signals
          </Link>
          <Link href="#workflow" className="hover:text-zinc-950 transition-colors">
            How it works
          </Link>
          <Link href="#sources" className="hover:text-zinc-950 transition-colors">
            Sources
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button size="sm" className="h-8 gap-1.5 bg-zinc-950 text-xs text-white hover:bg-zinc-800">
              Open console <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
