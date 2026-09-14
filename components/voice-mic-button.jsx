"use client";

/**
 * Small microphone icon for the chat input. Tap, speak in any language; it
 * stops by itself after a pause (or tap again), and the question is sent
 * with the language Sarvam heard.
 */

import * as React from "react";
import { Loader2, Mic, Square } from "lucide-react";
import { useRecorder } from "@/lib/use-voice";
import { cn } from "@/lib/utils";

export function VoiceMicButton({ onTranscript, onStart, disabled = false, className = "" }) {
  const { state, error, clearError, start, stop } = useRecorder({ onResult: onTranscript });

  React.useEffect(() => {
    if (!error) return undefined;
    const timer = window.setTimeout(clearError, 4000);
    return () => window.clearTimeout(timer);
  }, [error, clearError]);

  const recording = state === "recording";
  const busy = state === "transcribing";
  const label = recording ? "Stop recording" : busy ? "Listening…" : "Ask by voice";

  return (
    <span className={cn("relative inline-flex", className)}>
      {error && (
        <span role="status" className="absolute bottom-full right-0 z-20 mb-2 w-56 border border-[#0b0b0c] bg-white px-3 py-2 text-xs text-[#0b0b0c]">
          {error}
        </span>
      )}
      <button
        type="button"
        onClick={() => {
          if (recording) return stop();
          onStart?.();
          void start();
        }}
        disabled={disabled || busy}
        aria-label={label}
        aria-pressed={recording}
        title={label}
        className={cn(
          "sw-press inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[2px] border disabled:opacity-60",
          recording
            ? "border-[#d0182a] bg-[#d0182a] text-white"
            : "border-[#c4c0b6] bg-white text-[#0b0b0c] hover:border-[#0b0b0c]"
        )}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
        ) : recording ? (
          <Square className="h-3.5 w-3.5 fill-current" />
        ) : (
          <Mic className="h-4 w-4" strokeWidth={2} />
        )}
      </button>
    </span>
  );
}
