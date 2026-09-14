"use client";

/**
 * Microphone control for the marine assistant.
 *
 * Tap once to start, then just talk — the turn ends on its own after a pause,
 * because holding a button down while steadying yourself on a moving deck is
 * not realistic. Words appear in the input box as they are recognised, so it
 * is obvious the microphone is actually hearing something before the question
 * is sent.
 *
 * The parent owns the input box: `onInterim` streams partial text into it and
 * `onTranscript` fires once with the final question.
 */

import * as React from "react";
import { Mic, Square } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useSpeechRecognition } from "@/lib/use-speech-recognition";

/** How long an error stays on screen before it fades on its own. */
const ERROR_VISIBLE_MS = 4000;

export function VoiceMicButton({
  onTranscript,
  onInterim,
  disabled = false,
  onStart,
  /** Hands-free: reopen the microphone whenever this is true and it is idle. */
  autoListen = false,

  className = "",
  /** "icon" is the square button beside a send control; "pill" carries a label. */
  variant = "icon",
}) {
  const { t } = useT();

  const onInterimRef = React.useRef(onInterim);
  React.useEffect(() => {
    onInterimRef.current = onInterim;
  }, [onInterim]);

  const handleTranscript = React.useCallback(
    (text) => {
      onInterimRef.current?.("");
      onTranscript?.(text);
    },
    [onTranscript]
  );

  const { start, stop, listening, interim, errorKey, clearError, supported, unavailableKey } =
    useSpeechRecognition({ onTranscript: handleTranscript });

  // Talking to the assistant interrupts it, the way it works with a person.
  const toggle = React.useCallback(() => {
    if (listening) {
      stop();
      return;
    }
    onStart?.();
    start();
  }, [listening, onStart, start, stop]);

  // Stream partial words up to the parent's input box as they are recognised.
  React.useEffect(() => {
    if (listening) onInterimRef.current?.(interim);
  }, [interim, listening]);

  // Hands-free: once the assistant has finished talking and nothing is in
  // flight, open the microphone again. The delay lets the speaker fall silent
  // first, so the recogniser does not hear the tail of its own reply.
  //
  // A turn that hears nothing simply reopens. There is no give-up count: at
  // sea there are long gaps between saying things, and a microphone that
  // quietly switched itself off would be worse than one that waits.
  React.useEffect(() => {
    if (!autoListen || listening || !supported) return undefined;
    const timer = window.setTimeout(() => start(), 700);
    return () => window.clearTimeout(timer);
  }, [autoListen, listening, supported, start]);

  // Clear the microphone error on its own; a stale warning under the input is
  // worse than none once someone has moved on.
  React.useEffect(() => {
    if (!errorKey) return undefined;
    const timer = window.setTimeout(clearError, ERROR_VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [errorKey, clearError]);

  const blocked = !supported;
  const title = blocked
    ? t(unavailableKey || "voice.unsupported")
    : listening
      ? t("voice.stop")
      : t("voice.speak");

  const pill = variant === "pill";
  const shape = pill
    ? "h-8 gap-1.5 rounded-full px-2.5 text-[10px] font-medium"
    : "h-9 w-9 rounded-lg";
  const iconSize = pill ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <div className={`relative inline-flex ${className}`}>
      {errorKey && (
        <span
          role="status"
          className="absolute bottom-full right-0 z-20 mb-2 w-56 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] leading-snug text-amber-900 shadow-sm"
        >
          {t(errorKey)}
        </span>
      )}

      <button
        type="button"
        onClick={toggle}
        disabled={disabled || blocked}
        aria-label={title}
        aria-pressed={listening}
        title={title}
        className={`inline-flex shrink-0 items-center justify-center border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 disabled:cursor-not-allowed disabled:opacity-40 ${shape} ${
          listening
            ? "border-rose-300 bg-rose-50 text-rose-700"
            : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400 active:bg-zinc-100"
        }`}
      >
        {listening ? (
          <span className="relative inline-flex">
            {/* A visible pulse is the only feedback that the microphone is
                actually open — the browser gives none of its own in-page. */}
            <span className="absolute inset-0 animate-ping rounded-full bg-rose-400/40" />
            <Square className={`relative ${iconSize} fill-current`} />
          </span>
        ) : (
          <Mic className={iconSize} />
        )}
        {pill && <span className="hidden sm:inline">{title}</span>}
      </button>
    </div>
  );
}
