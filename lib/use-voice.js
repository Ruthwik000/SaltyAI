"use client";

/**
 * Microphone recording and spoken playback for the console.
 *
 * useRecorder records one question and stops on its own after a pause.
 * useSpeaker plays an answer in the language it is written in: Sarvam voice
 * first, the browser's own voice if the voice service cannot be reached. Only
 * one thing speaks at a time across the whole page.
 */

import * as React from "react";
import { detectLanguage, synthesizeSpeech, transcribeAudio } from "./voice-api";

/* ------------------------------------------------------------------ */
/* Recording                                                           */
/* ------------------------------------------------------------------ */

const SILENCE_MS = 1600;
const MAX_RECORD_MS = 30_000;
const SPEECH_RMS = 0.02;

function pickMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  return ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"].find((type) =>
    MediaRecorder.isTypeSupported(type)
  ) || "";
}

export function recordingSupported() {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

/**
 * state: "idle" | "recording" | "transcribing".
 * onResult(transcript, language) fires once per recorded question.
 */
export function useRecorder({ onResult }) {
  const [state, setState] = React.useState("idle");
  const [error, setError] = React.useState(null);
  const session = React.useRef(null);
  const onResultRef = React.useRef(onResult);
  React.useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  const cleanup = React.useCallback(() => {
    const current = session.current;
    if (!current) return;
    window.clearInterval(current.meter);
    window.clearTimeout(current.limit);
    current.stream.getTracks().forEach((track) => track.stop());
    current.audioContext?.close().catch(() => {});
    session.current = null;
  }, []);

  const stop = React.useCallback(() => {
    const current = session.current;
    if (current && current.recorder.state !== "inactive") current.recorder.stop();
  }, []);

  const start = React.useCallback(async () => {
    if (session.current) return;
    setError(null);
    if (!recordingSupported()) {
      setError("Voice input is not supported in this browser.");
      return;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      setError("Allow the microphone to ask by voice.");
      return;
    }

    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const parts = [];
    recorder.ondataavailable = (event) => event.data.size && parts.push(event.data);

    // Stop by itself once the person has spoken and then gone quiet.
    let audioContext = null;
    let meter = null;
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      audioContext.createMediaStreamSource(stream).connect(analyser);
      const samples = new Float32Array(analyser.fftSize);
      let heard = false;
      let quietSince = null;
      meter = window.setInterval(() => {
        analyser.getFloatTimeDomainData(samples);
        const rms = Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length);
        const now = Date.now();
        if (rms > SPEECH_RMS) {
          heard = true;
          quietSince = null;
        } else if (heard) {
          quietSince = quietSince ?? now;
          if (now - quietSince > SILENCE_MS) stop();
        }
      }, 100);
    } catch {
      // No analyser: the person taps the button again to finish.
    }

    recorder.onstop = async () => {
      const blob = new Blob(parts, { type: recorder.mimeType || mimeType || "audio/webm" });
      cleanup();
      if (blob.size < 2000) {
        setState("idle");
        return;
      }
      setState("transcribing");
      try {
        const { transcript, language } = await transcribeAudio(blob);
        setState("idle");
        if (transcript) onResultRef.current?.(transcript, language);
      } catch (err) {
        setState("idle");
        setError(err instanceof Error && /no speech/i.test(err.message)
          ? "Didn't catch that. Try again."
          : "Voice service unavailable. Type your question instead.");
      }
    };

    session.current = {
      recorder,
      stream,
      audioContext,
      meter,
      limit: window.setTimeout(stop, MAX_RECORD_MS),
    };
    recorder.start(250);
    setState("recording");
  }, [cleanup, stop]);

  React.useEffect(() => () => {
    const current = session.current;
    if (current && current.recorder.state !== "inactive") {
      current.recorder.onstop = null;
      current.recorder.stop();
    }
    cleanup();
  }, [cleanup]);

  return { state, error, clearError: () => setError(null), start, stop };
}

/* ------------------------------------------------------------------ */
/* Speaking                                                            */
/* ------------------------------------------------------------------ */

let active = null;
const listeners = new Set();
const notify = () => listeners.forEach((listener) => listener());

function stopActive() {
  if (!active) return;
  active.abort?.abort();
  if (active.audio) {
    active.audio.pause();
    active.audio.src = "";
  }
  if (active.url) URL.revokeObjectURL(active.url);
  if (active.browser && typeof window !== "undefined") window.speechSynthesis?.cancel();
  active = null;
  notify();
}

function browserSpeak(text, language, token) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    stopActive();
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language;
  const voice = window.speechSynthesis
    .getVoices()
    .find((item) => item.lang.toLowerCase().startsWith(language.slice(0, 2).toLowerCase()));
  if (voice) utterance.voice = voice;
  utterance.rate = 0.95;
  const finish = () => {
    if (active?.token === token) {
      active = null;
      notify();
    }
  };
  utterance.onend = finish;
  utterance.onerror = finish;
  active = { ...active, browser: true };
  window.speechSynthesis.speak(utterance);
}

/** speak(text, language?) reads text aloud; the language defaults to its script. */
export function useSpeaker(fallbackLanguage = "en-IN") {
  const [, force] = React.useReducer((value) => value + 1, 0);
  // Which speaker owns the playback; state, so render can compare it safely.
  const [owner] = React.useState(() => Symbol("speaker"));

  React.useEffect(() => {
    listeners.add(force);
    return () => {
      listeners.delete(force);
      if (active?.owner === owner) stopActive();
    };
  }, [owner]);

  const speak = React.useCallback(
    async (text, language) => {
      const clean = String(text || "").trim();
      if (!clean) return;
      stopActive();
      const lang = language || detectLanguage(clean) || fallbackLanguage;
      const token = Symbol("utterance");
      const abort = new AbortController();
      active = { owner, token, abort };
      notify();

      try {
        const url = await synthesizeSpeech(clean, lang, abort.signal);
        if (active?.token !== token) {
          URL.revokeObjectURL(url);
          return;
        }
        const audio = new Audio(url);
        active = { ...active, audio, url };
        const finish = () => {
          if (active?.token === token) stopActive();
        };
        audio.onended = finish;
        audio.onerror = finish;
        await audio.play();
      } catch (err) {
        if (active?.token !== token || err?.name === "AbortError") return;
        // Voice service unreachable, or autoplay refused: use the browser voice.
        browserSpeak(clean, lang, token);
      }
    },
    [fallbackLanguage, owner]
  );

  const stop = React.useCallback(() => {
    if (active?.owner === owner) stopActive();
  }, [owner]);

  return { speak, stop, speaking: active?.owner === owner };
}
