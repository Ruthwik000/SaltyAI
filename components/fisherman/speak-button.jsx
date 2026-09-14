"use client";

/**
 * Read-aloud control.
 *
 * A fair number of fishermen read slowly or not at all, and a phone at sea is
 * wet, bright and moving. Anywhere the app says something that changes what
 * someone does — the conditions, a zone, a go/no-go verdict — this button
 * says it out loud in the language they picked.
 */

import * as React from "react";
import { Square, Volume2 } from "lucide-react";
import { useSpeech, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function SpeakButton({ text, className = "", size = "md", label }) {
  const { t } = useT();
  const { speak, stop, speaking, supported } = useSpeech();

  if (!supported) return null;

  const box = size === "sm" ? "h-10 min-w-10 px-2" : "h-12 min-w-12 px-3";
  const icon = size === "sm" ? "h-5 w-5" : "h-6 w-6";

  return (
    <button
      type="button"
      onClick={() => (speaking ? stop() : speak(text))}
      aria-label={speaking ? t("common.stopReading") : t("common.readAloud")}
      title={speaking ? t("common.stopReading") : t("common.readAloud")}
      className={cn(
        "sw-press inline-flex shrink-0 items-center justify-center gap-2 rounded-[2px] border text-sm font-semibold tracking-tight",
        box,
        speaking
          ? "border-[#0b0b0c] bg-[#0b0b0c] text-white"
          : "border-[#0b0b0c] bg-transparent text-[#0b0b0c] hover:bg-[#0b0b0c] hover:text-white",
        className
      )}
    >
      {speaking ? (
        <Square className={`${icon} fill-current`} />
      ) : (
        <Volume2 className={icon} />
      )}
      {label && <span>{speaking ? t("common.stopReading") : t("common.readAloud")}</span>}
    </button>
  );
}
