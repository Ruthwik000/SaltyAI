"use client";

import Link from "next/link";
import { Compass, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

import { useT } from "@/lib/i18n";

export function DashboardHeader({ role, onOpenAiDrawer }) {
  const { t } = useT();
  const titles = {
    // The fisherman console runs in the language the skipper chose.
    fisherman: t("dash.fishermanTitle"),
    researcher: "Ocean Observation & Dataset Telemetry",
    operator: "Coastal Domain Awareness & Fleet Control",
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
      <div>
        <h1 className="text-lg leading-snug sm:text-2xl lg:text-3xl font-bold tracking-tight text-zinc-950">
          {titles[role] || "Marine Operational Console"}
        </h1>
      </div>

      <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
        <Button
          size="sm"
          onClick={onOpenAiDrawer}
          className="h-9 w-full gap-1.5 bg-zinc-950 text-xs text-white hover:bg-zinc-800 sm:h-8 sm:w-auto"
        >
          <Sparkles className="h-3.5 w-3.5 text-zinc-300" />
          <span>
            {role === "fisherman" ? t("dash.consultAgent") : "Consult AI Agent"}
          </span>
        </Button>

        <Link href="/app/map" className="w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            className="h-9 w-full gap-1.5 border-zinc-200 text-xs sm:h-8 sm:w-auto"
          >
            <Compass className="h-3.5 w-3.5 text-zinc-600" />
            <span>{role === "fisherman" ? t("dash.openMap") : "Open Marine Map"}</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
