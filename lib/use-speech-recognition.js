"use client";

/**
 * Voice input for the marine assistant.
 *
 * A skipper with wet hands on a moving deck is not going to type a question in
 * Telugu on a phone keyboard. This wraps the browser's own SpeechRecognition
 * so they can just ask, in the language they already picked for the console.
 *
 * The transcript is NOT translated. The agent is sent the native text plus the
 * language code and answers in that language, which keeps it to one round trip
 * and avoids a translation hop that can quietly change what someone asked.
 *
 * Unlike SpeechSynthesis (which is on-device), recognition in Chrome uploads
 * audio to Google — so this needs a connection and a secure context. That is
 * fine here: the assistant needs the network anyway. Everything that has to
 * work with no signal stays typed or pre-shipped.
 */

import * as React from "react";
import { useT } from "./i18n";

/** End the turn after this much quiet. Long enough to think mid-sentence. */
const SILENCE_MS = 1500;

/** Hard cap, so a microphone left open in a pocket cannot listen forever. */
const MAX_TURN_MS = 20_000;

function recognitionCtor() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function speechRecognitionSupported() {
  return recognitionCtor() !== null;
}

/**
 * Map a SpeechRecognition error code to one of our own dictionary keys, so the
 * message reaches the fisherman in their language rather than as "not-allowed".
 */
export function voiceErrorKey(code) {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "voice.denied";
    case "no-speech":
      return "voice.noSpeech";
    case "audio-capture":
      return "voice.noMic";
    case "network":
      return "voice.network";
    case "insecure":
      return "voice.insecure";
    case "unsupported":
      return "voice.unsupported";
    default:
      return "voice.noSpeech";
  }
}

/**
 * Listen for one spoken question.
 *
 * `onTranscript` fires once per turn with the final text. `interim` updates
 * while someone is still talking so the caller can show it in the input box —
 * seeing the words appear is what tells you the microphone is actually working.
 */
export function useSpeechRecognition({ onTranscript, onSilence } = {}) {
  const { language } = useT();
  const locale = language.speech;

  // Same client-detection pattern as use-geolocation.js: the server renders the
  // pessimistic value and the client corrects it on hydration.
  const supported = React.useSyncExternalStore(
    () => () => {},
    () => speechRecognitionSupported(),
    () => false
  );
  const secure = React.useSyncExternalStore(
    () => () => {},
    () => typeof window === "undefined" || window.isSecureContext !== false,
    () => true
  );

  const [listening, setListening] = React.useState(false);
  const [interim, setInterim] = React.useState("");
  const [errorCode, setErrorCode] = React.useState(null);

  const recognitionRef = React.useRef(null);
  const silenceRef = React.useRef(null);
  const capRef = React.useRef(null);
  const finalRef = React.useRef("");
  const onTranscriptRef = React.useRef(onTranscript);
  const onSilenceRef = React.useRef(onSilence);

  React.useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  React.useEffect(() => {
    onSilenceRef.current = onSilence;
  }, [onSilence]);

  const clearTimers = React.useCallback(() => {
    if (silenceRef.current !== null) window.clearTimeout(silenceRef.current);
    if (capRef.current !== null) window.clearTimeout(capRef.current);
    silenceRef.current = null;
    capRef.current = null;
  }, []);

  const stop = React.useCallback(() => {
    clearTimers();
    const recognition = recognitionRef.current;
    if (!recognition) return;
    try {
      recognition.stop();
    } catch {
      // Already stopping; onend still runs and does the cleanup.
    }
  }, [clearTimers]);

  /** Abandon the turn and throw away whatever was heard. */
  const cancel = React.useCallback(() => {
    clearTimers();
    finalRef.current = "";
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    setListening(false);
    setInterim("");
    if (!recognition) return;
    try {
      recognition.abort();
    } catch {
      // Nothing to abort.
    }
  }, [clearTimers]);

  const start = React.useCallback(() => {
    if (recognitionRef.current) return;
    const Recognition = recognitionCtor();
    if (!Recognition) {
      setErrorCode("unsupported");
      return;
    }
    if (typeof window !== "undefined" && window.isSecureContext === false) {
      // Chrome refuses the microphone outside a secure context, and it fails
      // silently — worth saying so rather than looking broken.
      setErrorCode("insecure");
      return;
    }

    setErrorCode(null);
    setInterim("");
    finalRef.current = "";

    const recognition = new Recognition();
    recognition.lang = locale;
    // Continuous with our own silence timer rather than the browser's: Chrome
    // ends a non-continuous turn very early, which cuts people off mid-question.
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    const armSilence = () => {
      if (silenceRef.current !== null) window.clearTimeout(silenceRef.current);
      silenceRef.current = window.setTimeout(() => {
        try {
          recognition.stop();
        } catch {
          // Already stopped.
        }
      }, SILENCE_MS);
    };

    recognition.onstart = () => {
      setListening(true);
      armSilence();
    };

    recognition.onresult = (event) => {
      let pending = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) finalRef.current += result[0].transcript;
        else pending += result[0].transcript;
      }
      setInterim(pending);
      armSilence();
    };

    recognition.onerror = (event) => {
      setErrorCode(event?.error || "unknown");
    };

    recognition.onend = () => {
      clearTimers();
      recognitionRef.current = null;
      setListening(false);
      setInterim("");
      const text = finalRef.current.trim();
      finalRef.current = "";
      if (text) onTranscriptRef.current?.(text);
      // A turn that heard nothing. Hands-free mode counts these so an open
      // microphone in a pocket eventually gives up instead of looping.
      else onSilenceRef.current?.();
    };

    recognitionRef.current = recognition;
    capRef.current = window.setTimeout(() => {
      try {
        recognition.stop();
      } catch {
        // Already stopped.
      }
    }, MAX_TURN_MS);

    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setListening(false);
      setErrorCode("unknown");
    }
  }, [clearTimers, locale]);

  const toggle = React.useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  React.useEffect(() => {
    return () => {
      clearTimers();
      const recognition = recognitionRef.current;
      recognitionRef.current = null;
      if (!recognition) return;
      try {
        recognition.abort();
      } catch {
        // Nothing to abort.
      }
    };
  }, [clearTimers]);

  const available = supported && secure;

  return {
    start,
    stop,
    cancel,
    toggle,
    listening,
    interim,
    /** A dictionary key, already translated by the caller's `t`. */
    errorKey: errorCode ? voiceErrorKey(errorCode) : null,
    clearError: () => setErrorCode(null),
    supported: available,
    unavailableKey: !supported ? "voice.unsupported" : !secure ? "voice.insecure" : null,
  };
}
