"use client";

import * as React from "react";
import { CloudDownload, Info, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Offline map area control.
 *
 * Scaffold only: the UI and the online/offline indicator are real, the tile
 * caching itself is not wired yet. It says so plainly rather than implying a
 * fisherman can rely on it at sea.
 */
export function OfflineMapCard({ areaLabel }: { areaLabel: string }) {
  const [online, setOnline] = React.useState(true);

  React.useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 text-xs font-bold text-zinc-950">
            <CloudDownload className="h-3.5 w-3.5 text-zinc-500" />
            <span>Offline map</span>
          </h3>
          <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">
            {areaLabel}
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
            online
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-zinc-300 bg-zinc-100 text-zinc-700"
          }`}
        >
          {!online && <WifiOff className="h-2.5 w-2.5" />}
          <span>{online ? "Online" : "No signal"}</span>
        </span>
      </div>

      <Button
        disabled
        variant="outline"
        className="mt-3 h-10 w-full border-zinc-200 text-xs"
      >
        Download this area
      </Button>

      <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-relaxed text-zinc-500">
        <Info className="mt-0.5 h-3 w-3 shrink-0 text-zinc-400" />
        <span>
          Not available yet. Offline tile storage is still being built — do not
          plan on having this map beyond mobile signal range.
        </span>
      </p>
    </div>
  );
}
