"use client";

/**
 * Reading an assistant reply out loud, in the listener's own language.
 *
 * This uses the browser's own speech engine and nothing else. There is no
 * server call and no cloud voice: the console has to work on a phone with a
 * bad signal on a boat, and a reply that waits on a round trip to a speech API
 * is a reply the fisherman does not hear.
 *
 * Four things break if you hand `speechSynthesis` a whole answer and hope:
 *
 * 1. The voice list is empty on the first call. Picking a voice at speak time
 *    therefore picks nothing, the engine uses its default — usually US English
 *    — and a Telugu sentence comes out as silence. `lib/browser-voices.js`
 *    exists entirely because of this, and `speak` waits for it.
 * 2. Chrome stops speaking after roughly fifteen seconds and fires no error,
 *    so the answer dies mid-sentence. Short utterances dodge it.
 * 3. Chrome also drops `onend` on the floor now and then, which strands the
 *    queue forever. Every utterance therefore carries a watchdog.
 * 4. The model writes for a screen. Read literally, "**Wave height** | 1.3 m |
 *    ww3/rsmc_combined_ww3_20260907.nc" is unusable to someone who cannot see it.
 *
 * What is left after all that sounds like a person because of the pauses: a
 * sentence at a time, with a breath between them, rather than one flat block.
 */

import * as React from "react";
import { LANGUAGES, useT } from "./i18n";
import {
  bestVoice,
  primeSpeech,
  resolveVoice,
  speechSupported,
  subscribeVoices,
  voicesReady,
} from "./browser-voices";
import { hasIndicScript, romanise } from "./transliterate";

/** Long enough to sound like a sentence, short enough that Chrome finishes it. */
const MAX_CHUNK = 170;

/** Chrome pauses the synthesiser mid-queue; nudging it keeps speech flowing. */
const KEEPALIVE_MS = 8000;

/** Roughly how long a character takes to say, used to size the watchdog. */
const MS_PER_CHAR = 130;
const WATCHDOG_FLOOR_MS = 5000;

/** Cancel-then-speak in the same tick is a known Chrome deadlock. Let it settle. */
const AFTER_CANCEL_MS = 90;

/** A breath. Longer at a full stop than at a comma, which is what makes it human. */
const PAUSE_SENTENCE_MS = 260;
const PAUSE_CLAUSE_MS = 130;

/**
 * Units read as symbols sound robotic — but only expand them into ENGLISH
 * words when the voice is speaking English. Splicing "metres per second" into
 * a Telugu sentence makes a Telugu voice stumble through English phonemes,
 * which is worse than the symbol. In the other languages the model already
 * writes its units as words, because the fisherman prompt tells it to.
 */
const SPOKEN_UNITS_EN = [
  [/(\d)\s*°\s*C\b/gi, "$1 degrees"],
  [/(\d)\s*m\/s\b/gi, "$1 metres per second"],
  [/(\d)\s*km\/h\b/gi, "$1 kilometres per hour"],
  [/(\d)\s*kts?\b/gi, "$1 knots"],
  [/(\d)\s*NM\b/g, "$1 nautical miles"],
  [/(\d)\s*km\b/gi, "$1 kilometres"],
  [/(\d)\s*m\b/g, "$1 metres"],
  [/(\d)\s*s\b/g, "$1 seconds"],
  [/(\d)\s*%/g, "$1 percent"],
];

/**
 * Turn a written answer into something worth hearing.
 *
 * Markdown, dataset filenames, coordinates and URLs are stripped: they are
 * provenance for the screen, and noise in the ear.
 */
export function speakableText(raw, locale = "en-IN") {
  if (!raw) return "";
  let text = String(raw);

  text = text.replace(/```[\s\S]*?```/g, " ");
  text = text.replace(/`([^`]*)`/g, "$1");

  // Order matters here. Filenames, URLs, coordinates and timestamps are
  // stripped BEFORE markdown symbols, because stripping underscores first
  // turns ww3/rsmc_combined_ww3_20260907.nc into words the pattern no longer
  // recognises, and it gets read out letter by letter.
  text = text.replace(/\b[\w-]+\/[\w.-]+\.nc\b/g, " ");
  text = text.replace(/https?:\/\/\S+/g, " ");
  text = text.replace(/\b\d{4}-\d{2}-\d{2}T[\d:.]+Z?\b/g, " ");
  text = text.replace(
    /\(?\d{1,3}\.\d{3,}\s*[NSEW]?\s*,?\s*\d{1,3}\.\d{3,}\s*[NSEW]?\)?/g,
    " "
  );

  // Markdown tables: keep the cells, drop the pipes and the rule row. The
  // rule row is matched inline as well as on its own line, because the model
  // does not always emit real newlines.
  text = text.replace(/(^|\s)[-—:|]{3,}(?=\s|$)/g, " ");
  text = text.replace(/\|/g, ", ");
  text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/[*_#>]/g, " ");
  text = text.replace(/^\s*[-•]\s*/gm, " ");

  if (locale.toLowerCase().startsWith("en")) {
    for (const [pattern, replacement] of SPOKEN_UNITS_EN) {
      text = text.replace(pattern, replacement);
    }
  }

  // Removing a filename or coordinate leaves the words that introduced it
  // dangling ("the water is 30 degrees at ."). Tidy those, or it sounds broken.
  text = text.replace(/\s+(?:at|from|see|via|source)\s*(?=[.,;]|$)/gi, "");
  text = text.replace(/\s*,\s*(?=[.,;])/g, "");
  text = text.replace(/\s*,\s*,+/g, ", ");
  text = text.replace(/\s+([.,;:!?])/g, "$1");
  text = text.replace(/([.,;:])\1+/g, "$1");
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Split into utterances a browser will finish, breaking at sentence ends.
 *
 * The danda (।) is a full stop in Devanagari and Bengali and has to count as
 * one, or a Hindi answer becomes a single 600-character utterance that Chrome
 * abandons halfway through.
 */
export function toChunks(text, limit = MAX_CHUNK) {
  const sentences = text.split(/(?<=[.!?।॥。！？])\s+/).filter(Boolean);
  const chunks = [];
  let current = "";

  const flush = () => {
    if (current.trim()) chunks.push(current.trim());
    current = "";
  };

  for (const sentence of sentences) {
    if (sentence.length > limit) {
      flush();
      // Too long even alone: break it at commas rather than mid-word.
      let piece = "";
      for (const part of sentence.split(/(?<=[,،;])\s+/)) {
        if ((piece + " " + part).trim().length > limit) {
          if (piece.trim()) chunks.push(piece.trim());
          piece = part;
        } else {
          piece = (piece + " " + part).trim();
        }
      }
      if (piece.trim()) chunks.push(piece.trim());
      continue;
    }
    if ((current + " " + sentence).trim().length > limit) flush();
    current = (current + " " + sentence).trim();
  }
  flush();
  return chunks;
}

/** How long to wait after a chunk before starting the next one. */
function pauseAfter(chunk) {
  return /[.!?।॥。！？]\s*$/.test(chunk) ? PAUSE_SENTENCE_MS : PAUSE_CLAUSE_MS;
}

/**
 * Indic voices race. Slowing them slightly is the difference between a person
 * speaking and an announcement being read at you.
 */
function rateFor(locale) {
  return locale.toLowerCase().startsWith("en") ? 0.97 : 0.92;
}

export function useVoiceReply() {
  const { language } = useT();
  const [speaking, setSpeaking] = React.useState(false);

  const queueRef = React.useRef([]);
  const indexRef = React.useRef(0);
  const keepaliveRef = React.useRef(null);
  const watchdogRef = React.useRef(null);
  const cancelledRef = React.useRef(false);

  const supported = React.useSyncExternalStore(
    () => () => {},
    speechSupported,
    () => false
  );

  // Re-render when the browser publishes its voices, so a screen can stop
  // offering to read aloud in a language the device cannot actually speak.
  const voices = React.useSyncExternalStore(
    subscribeVoices,
    () => (typeof window === "undefined" ? 0 : window.speechSynthesis?.getVoices()?.length || 0),
    () => 0
  );

  const locale = language.speech || LANGUAGES[0].speech;

  /**
   * True when the device has no voice for the chosen language, so the reply is
   * being romanised and read by the English voice instead. The UI says so:
   * hearing your own language in an English accent is fine once you know that
   * is what is happening, and baffling if you do not.
   */
  const substituteVoice = React.useMemo(
    () => supported && voices > 0 && !bestVoice(locale),
    [supported, voices, locale]
  );

  const clearTimers = React.useCallback(() => {
    if (keepaliveRef.current !== null) {
      window.clearInterval(keepaliveRef.current);
      keepaliveRef.current = null;
    }
    if (watchdogRef.current !== null) {
      window.clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  }, []);

  const stop = React.useCallback(() => {
    cancelledRef.current = true;
    queueRef.current = [];
    indexRef.current = 0;
    clearTimers();
    if (speechSupported()) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [clearTimers]);

  const speak = React.useCallback(
    (raw, localeOverride) => {
      if (!speechSupported()) return;
      const spoken = localeOverride || locale;
      const text = speakableText(raw, spoken);
      if (!text) return;

      // Cancel anything in flight, then let the engine settle. Speaking in the
      // same tick as cancel() is the Chrome deadlock that leaves the whole
      // synthesiser mute until the tab is reloaded.
      cancelledRef.current = true;
      window.speechSynthesis.cancel();
      clearTimers();

      queueRef.current = toChunks(text);
      indexRef.current = 0;
      setSpeaking(true);

      const run = async () => {
        // Without this the first reply of a session is read by the default
        // English voice, whatever language it is written in.
        await voicesReady();
        if (queueRef.current.length === 0) return;

        cancelledRef.current = false;

        // No voice for this language: read it romanised in the English voice
        // rather than saying nothing. Without this, an English engine handed
        // Telugu renders none of the Telugu and speaks only the digits left in
        // the sentence, which is what "it only reads the numbers" was.
        const { voice, spokenLocale, substituted } = resolveVoice(spoken);
        if (substituted && hasIndicScript(text)) {
          queueRef.current = toChunks(romanise(text));
        }
        // Romanised text is unusual spelling for an English engine, so it
        // gets read a little slower still.
        const rate = substituted ? 0.9 : rateFor(spoken);

        const speakNext = () => {
          if (cancelledRef.current) return;
          const chunk = queueRef.current[indexRef.current];
          if (chunk === undefined) {
            clearTimers();
            setSpeaking(false);
            return;
          }
          indexRef.current += 1;

          let finished = false;
          const done = () => {
            if (finished || cancelledRef.current) return;
            finished = true;
            if (watchdogRef.current !== null) {
              window.clearTimeout(watchdogRef.current);
              watchdogRef.current = null;
            }
            window.setTimeout(speakNext, pauseAfter(chunk));
          };

          const utterance = new SpeechSynthesisUtterance(chunk);
          utterance.lang = spokenLocale;
          if (voice) utterance.voice = voice;
          utterance.rate = rate;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;
          utterance.onend = done;
          utterance.onerror = done;

          // Chrome drops onend often enough that a queue without this stalls
          // silently, which reads to the user as "it stopped talking to me".
          watchdogRef.current = window.setTimeout(
            done,
            Math.max(WATCHDOG_FLOOR_MS, chunk.length * MS_PER_CHAR)
          );

          window.speechSynthesis.speak(utterance);
        };

        clearTimers();
        keepaliveRef.current = window.setInterval(() => {
          if (!speechSupported()) return;
          const synthesiser = window.speechSynthesis;
          if (synthesiser.speaking && synthesiser.paused) synthesiser.resume();
        }, KEEPALIVE_MS);

        window.setTimeout(speakNext, AFTER_CANCEL_MS);
      };

      void run();
    },
    [clearTimers, locale]
  );

  React.useEffect(
    () => () => {
      cancelledRef.current = true;
      clearTimers();
      if (speechSupported()) window.speechSynthesis.cancel();
    },
    [clearTimers]
  );

  return {
    speak,
    stop,
    speaking,
    supported,
    /** Call inside a click handler once, to unlock speech on Chrome and Safari. */
    prime: primeSpeech,
    /** True when the reply is being romanised and read by the English voice. */
    substituteVoice,
    /** Kept for callers that only want to know a native voice is missing. */
    missingVoice: substituteVoice,
  };
}
