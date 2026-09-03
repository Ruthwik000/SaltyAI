"use client";

import Link from "next/link";
import { Compass, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/lib/marine-context";

interface DashboardHeaderProps {
  role: UserRole;
  onOpenAiDrawer: () => void;
}

export function DashboardHeader({ role, onOpenAiDrawer }: DashboardHeaderProps) {
  const titles: Record<UserRole, string> = {
    fisherman: "Marine Conditions & Catch Intelligence",
    researcher: "Ocean Observation & Dataset Telemetry",
    operator: "Coastal Domain Awareness & Fleet Control",
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950">
          {titles[role] || "Marine Operational Console"}
        </h1>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          onClick={onOpenAiDrawer}
          className="text-xs h-8 bg-zinc-950 hover:bg-zinc-800 text-white gap-1.5"
        >
          <Sparkles className="h-3.5 w-3.5 text-zinc-300" />
          <span>Consult AI Agent</span>
        </Button>

        <Link href="/app/map">
          <Button variant="outline" size="sm" className="text-xs h-8 gap-1.5 border-zinc-200">
            <Compass className="h-3.5 w-3.5 text-zinc-600" />
            <span>Open Marine Map</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
