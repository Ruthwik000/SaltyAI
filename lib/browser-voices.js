"use client";

/**
 * The browser's own voices, made usable.
 *
 * `speechSynthesis.getVoices()` is the most misleading API in the platform.
 * On Chrome it returns an EMPTY ARRAY on first call and fills in later, after
 * a `voiceschanged` event that may fire once, twice, or not at all depending
 * on how the page was loaded. Code that calls it once at speak time therefore
 * gets null, falls back to the browser default — which is usually en-US — and
 * then reads a Telugu sentence with an American English voice. That does not
 * sound wrong, it sounds like nothing: the engine has no glyphs for the script
 * and emits silence or a stream of letter names.
 *
 * That is the whole reason the assistant appeared not to talk back.
 *
 * So this module keeps one live registry: it subscribes to `voiceschanged`,
 * polls briefly at startup because Safari never fires the event, and hands out
 * a promise that resolves once voices actually exist.
 */

/** Chrome fills the list asynchronously; Safari fills it late and silently. */
const POLL_MS = 200;
const POLL_LIMIT_MS = 4000;

let voices = [];
const listeners = new Set();
let started = false;
let readyResolve = null;
const ready =
  typeof window === "undefined"
    ? Promise.resolve([])
    : new Promise((resolve) => {
        readyResolve = resolve;
      });

function supported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function refresh() {
  if (!supported()) return;
  const next = window.speechSynthesis.getVoices() || [];
  if (next.length === voices.length && next.every((v, i) => v === voices[i])) return;
  voices = next;
  if (next.length && readyResolve) {
    readyResolve(next);
    readyResolve = null;
  }
  listeners.forEach((listener) => listener());
}

/** Begin watching. Safe to call as often as you like. */
export function startVoiceRegistry() {
  if (started || !supported()) return;
  started = true;
  refresh();
  window.speechSynthesis.addEventListener?.("voiceschanged", refresh);

  // Safari never fires voiceschanged, and Chrome sometimes fires it before a
  // listener can be attached. A short poll covers both without spinning
  // forever on a device that genuinely has no voices installed.
  const startedAt = Date.now();
  const timer = window.setInterval(() => {
    refresh();
    if (voices.length || Date.now() - startedAt > POLL_LIMIT_MS) {
      window.clearInterval(timer);
      if (readyResolve) {
        readyResolve(voices);
        readyResolve = null;
      }
    }
  }, POLL_MS);
}

/** Resolves once the browser has published its voices, or gives up quietly. */
export function voicesReady() {
  startVoiceRegistry();
  return ready;
}

export function listVoices() {
  return voices;
}

export function subscribeVoices(listener) {
  listeners.add(listener);
  startVoiceRegistry();
  return () => listeners.delete(listener);
}

/**
 * Which voice sounds most like a person.
 *
 * Engines expose their quality in the name, not in a field: Microsoft's
 * "…Neural"/"Natural" voices and Google's cloud voices are the ones that
 * sound human, while the bundled local fallbacks are the flat robotic ones.
 * `localService === false` on Chrome means the voice is served from Google's
 * network engine, which is the better one — so it is ranked up, not down.
 */
const HUMAN_NAME = /natural|neural|premium|enhanced|wavenet|online/i;

function score(voice, locale) {
  const want = locale.toLowerCase();
  const base = want.split("-")[0];
  const has = (voice.lang || "").toLowerCase();
  let points = 0;

  if (has === want) points += 100;
  else if (has.replace("_", "-") === want) points += 100;
  else if (has.startsWith(`${base}-`) || has === base) points += 60;
  else return -1; // wrong language: never usable, whatever else it offers

  if (HUMAN_NAME.test(voice.name || "")) points += 30;
  if (/google/i.test(voice.name || "")) points += 12;
  if (/microsoft/i.test(voice.name || "")) points += 8;
  if (voice.localService === false) points += 6;
  if (voice.default) points += 2;
  return points;
}

/**
 * The best voice for a locale, or null if the device simply has none.
 *
 * Null is a real answer and the caller must respect it. Reading Malayalam
 * with a Hindi or English voice is not a graceful degradation, it is noise,
 * so this never substitutes a different language.
 */
export function bestVoice(locale) {
  let best = null;
  let bestScore = 0;
  for (const voice of voices) {
    const points = score(voice, locale);
    if (points > bestScore) {
      best = voice;
      bestScore = points;
    }
  }
  return best;
}

/**
 * A voice for this locale, or the nearest thing the device can do.
 *
 * Most Windows machines have five voices and all of them are English, so
 * `bestVoice("te-IN")` is null there and the honest options are silence or a
 * substitute. Silence is worse: the person asked a question out loud and got
 * nothing back. So when the language itself is missing, this falls back to an
 * INDIAN English voice and says it substituted, and the caller romanises the
 * text so that voice has something it can pronounce.
 *
 * en-IN is chosen over en-GB or en-US deliberately. Its vowels and its rhythm
 * are much closer to the Indian languages being romanised, and the difference
 * between Ravi and Susan reading "chepalu ekkuvagaa" is the difference between
 * understanding it and not.
 */
export function resolveVoice(locale) {
  const native = bestVoice(locale);
  if (native) return { voice: native, spokenLocale: locale, substituted: false };

  const fallback = bestVoice("en-IN") || bestVoice("en-GB") || bestVoice("en-US") || bestVoice("en");
  if (!fallback) return { voice: null, spokenLocale: locale, substituted: false };
  return { voice: fallback, spokenLocale: fallback.lang || "en-IN", substituted: true };
}

/** Every language the device can actually speak, as locale codes. */
export function spokenLocales() {
  return Array.from(new Set(voices.map((v) => (v.lang || "").toLowerCase())));
}

/**
 * Unlock the synthesiser on a real user gesture.
 *
 * Chrome and Safari refuse to speak until the page has had one, and they fail
 * silently rather than throwing. Speaking a single space inside the click
 * handler costs nothing audible and makes every later utterance work.
 */
let primed = false;
export function primeSpeech() {
  if (primed || !supported()) return;
  primed = true;
  startVoiceRegistry();
  try {
    const utterance = new SpeechSynthesisUtterance(" ");
    utterance.volume = 0;
    window.speechSynthesis.speak(utterance);
  } catch {
    /* nothing to do: the first real utterance will surface any problem */
  }
}

export function speechSupported() {
  return supported();
}
