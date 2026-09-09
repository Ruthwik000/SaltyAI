"use client";

import { CircleDashed, Radio } from "lucide-react";

import { useT } from "@/lib/i18n";

/**
 * States plainly whether the numbers on screen came from the SALTY backend or
 * from the bundled demo dataset. Demo values must never read as live readings.
 *
 * `compact` shrinks it to the coloured dot alone, for a panel that already
 * carries its own heading and where the words crowd the header. The dot is
 * still the honest signal: the title tooltip and the accessible name both
 * carry the full wording, so hovering it or reaching it with a screen reader
 * says which it is. Use it where the surrounding copy makes the source
 * obvious — never as a way to make demo values look live.
 */
export function DataBadge({ source, reason, className = "", compact = false }) {
  const { t } = useT();
  const isLive = source === "live";
  const label = isLive ? t("common.live") : t("common.demo");
  const title = isLive
    ? "Live from the SALTY backend"
    : reason || "SALTY backend unreachable";

  if (compact) {
    return (
      <span
        title={`${label} — ${title}`}
        aria-label={label}
        role="img"
        className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full border ${
          isLive
            ? "border-emerald-300 bg-emerald-400"
            : "border-amber-300 bg-amber-400"
        } ${className}`}
      />
    );
  }

  return (
    <span
      title={title}
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
      <span>{label}</span>
    </span>
  );
}
