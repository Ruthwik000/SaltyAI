"use client";

import { CircleDashed, Radio } from "lucide-react";

import { useT } from "@/lib/i18n";

/**
 * States plainly whether the numbers on screen came from the SALTY backend or
 * from the bundled demo dataset. Demo values must never read as live readings.
 */
export function DataBadge({ source, reason, className = "" }) {
  const { t } = useT();
  const isLive = source === "live";
  return (
    <span
      title={
        isLive ? "Live from the SALTY backend" : reason || "SALTY backend unreachable"
      }
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
        isLive
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-amber-200 bg-amber-50 text-amber-800"
      } ${className}`}
    >
      {isLive ? (
        <Radio className="h-2.5 w-2.5" />
      ) : (
        <CircleDashed className="h-2.5 w-2.5" />
      )}
      <span>{isLive ? t("common.live") : t("common.demo")}</span>
    </span>
  );
}
