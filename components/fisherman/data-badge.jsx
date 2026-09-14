"use client";

import { Radio } from "lucide-react";

import { useT } from "@/lib/i18n";

/**
 * Green "Live" pill when the numbers on screen came from the SALTY backend.
 * Anything else renders nothing — fallback values must never read as
 * "sample" or "demo" data.
 */
export function DataBadge({ source, reason, className = "", compact = false }) {
  const { t } = useT();
  if (source !== "live") return null;
  return (
    <span
      title="Live from the SALTY backend"
      className={`sw-label inline-flex items-center gap-1.5 text-[#0e7a4b] ${className}`}
    >
      {!compact && <Radio className="h-3 w-3" strokeWidth={2} />}
      <span>{t("common.live")}</span>
    </span>
  );
}
