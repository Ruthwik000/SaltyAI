"use client";

/**
 * Read-aloud control. Speaks the text in the language it is written in
 * (Sarvam voice, browser voice as a fallback), so a Telugu warning is read in
 * Telugu whatever language the console is set to.
 */

import * as React from "react";
import { Square, Volume2 } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useSpeaker } from "@/lib/use-voice";
import { cn } from "@/lib/utils";

export function SpeakButton({ text, className = "", size = "md", label }) {
  const { t, language } = useT();
  const { speak, stop, speaking } = useSpeaker(language.speech);

  const box = size === "sm" ? "h-10 min-w-10 px-2" : "h-12 min-w-12 px-3";
  const icon = size === "sm" ? "h-5 w-5" : "h-6 w-6";
  const title = speaking ? t("common.stopReading") : t("common.readAloud");

  return (
    <button
      type="button"
      onClick={() => (speaking ? stop() : speak(text))}
      aria-label={title}
      title={title}
      className={cn(
        "sw-press inline-flex shrink-0 items-center justify-center gap-2 rounded-[2px] border text-sm font-semibold tracking-tight",
        box,
        speaking
          ? "border-[#0b0b0c] bg-[#0b0b0c] text-white"
          : "border-[#0b0b0c] bg-transparent text-[#0b0b0c] hover:bg-[#0b0b0c] hover:text-white",
        className
      )}
    >
      {speaking ? <Square className={`${icon} fill-current`} /> : <Volume2 className={icon} />}
      {label && <span>{title}</span>}
    </button>
  );
}
