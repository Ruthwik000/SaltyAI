/**
 * Browser voice through the SALTY voice service (Sarvam speech-to-text and
 * text-to-speech on the call agent), plus language detection from script.
 *
 * Sarvam hears any supported Indian language without being told which one,
 * and speaks languages most browsers have no voice for.
 */

const VOICE_BASE = process.env.NEXT_PUBLIC_SALTY_VOICE_URL || "http://127.0.0.1:8001";

/* Scripts that identify a language on their own. Devanagari is Hindi or
   Marathi; it maps to Hindi, which Sarvam also reads Marathi text with. */
const SCRIPTS = [
  [/[ఀ-౿]/, "te-IN"],
  [/[஀-௿]/, "ta-IN"],
  [/[ഀ-ൿ]/, "ml-IN"],
  [/[ಀ-೿]/, "kn-IN"],
  [/[ঀ-৿]/, "bn-IN"],
  [/[઀-૿]/, "gu-IN"],
  [/[଀-୿]/, "od-IN"],
  [/[਀-੿]/, "pa-IN"],
  [/[ऀ-ॿ]/, "hi-IN"],
];

/** BCP-47 code for the language `text` is written in, or null if unclear. */
export function detectLanguage(text) {
  if (!text) return null;
  for (const [pattern, code] of SCRIPTS) {
    if (pattern.test(text)) return code;
  }
  return (text.match(/[A-Za-z]/g) || []).length >= 3 ? "en-IN" : null;
}

async function failure(response) {
  const body = await response.json().catch(() => ({}));
  return new Error(body.detail || `Voice service ${response.status}`);
}

/** Recorded audio -> { transcript, language }. */
export async function transcribeAudio(blob, signal) {
  const form = new FormData();
  const extension = (blob.type.split("/")[1] || "webm").split(";")[0];
  form.append("file", blob, `question.${extension}`);
  const response = await fetch(`${VOICE_BASE}/api/voice/transcribe`, { method: "POST", body: form, signal });
  if (!response.ok) throw await failure(response);
  return response.json();
}

/** Text -> an object URL for WAV audio in that language. */
export async function synthesizeSpeech(text, language, signal) {
  const response = await fetch(`${VOICE_BASE}/api/voice/speak`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, language: language || undefined }),
    signal,
  });
  if (!response.ok) throw await failure(response);
  return URL.createObjectURL(await response.blob());
}
