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

export function SpeakButton({ text, className = "", size = "md", label }) {
  const { t } = useT();
  const { speak, stop, speaking, supported } = useSpeech();

  if (!supported) return null;

  const box = size === "sm" ? "h-7 min-w-7 px-1.5" : "h-9 min-w-9 px-2";
  const icon = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <button
      type="button"
      onClick={() => (speaking ? stop() : speak(text))}
      aria-label={speaking ? t("common.stopReading") : t("common.readAloud")}
      title={speaking ? t("common.stopReading") : t("common.readAloud")}
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border text-[11px] font-medium transition-colors ${box} ${
        speaking
          ? "border-sky-300 bg-sky-100 text-sky-800"
          : "border-zinc-200 bg-white text-zinc-600 active:bg-zinc-100"
      } ${className}`}
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
