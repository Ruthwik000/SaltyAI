"use client";

import { Database, X } from "lucide-react";
import { DataBadge } from "@/components/fisherman/data-badge";
import type { AgentDataContext } from "@/lib/research-context";

/**
 * The dataset selection carried over from Research & Data, shown above the
 * composer so the researcher can see exactly what the agent has been given.
 */
export function AgentContextChip({
  context,
  onDetach,
}: {
  context: AgentDataContext;
  onDetach: () => void;
}) {
  return (
    <div className="mb-2 rounded-xl border border-indigo-200 bg-indigo-50/60 px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <Database className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-600" />
          <div className="min-w-0">
            <div className="truncate text-[11px] font-semibold text-indigo-950">
              {context.datasetName}
            </div>
            <div className="mt-0.5 font-sans text-[10px] leading-snug text-indigo-900/70">
              {context.variable}
              {context.unit ? ` (${context.unit})` : ""} ·{" "}
              {context.region.minLat}–{context.region.maxLat}°N,{" "}
              {context.region.minLon}–{context.region.maxLon}°E ·{" "}
              {context.start.slice(0, 7)} to {context.end.slice(0, 7)}
            </div>
            <div className="mt-1 font-sans text-[10px] text-indigo-900/70">
              mean {context.stats.mean} · trend{" "}
              {context.stats.trendPerDecade > 0 ? "+" : ""}
              {context.stats.trendPerDecade}/decade · n {context.stats.count}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <DataBadge source={context.source} />
          <button
            type="button"
            onClick={onDetach}
            aria-label="Remove attached data"
            className="rounded p-1 text-indigo-400 hover:bg-indigo-100 hover:text-indigo-800"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
