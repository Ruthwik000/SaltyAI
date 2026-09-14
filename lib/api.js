const API_BASE = process.env.NEXT_PUBLIC_SALTY_API_URL || "http://127.0.0.1:8010";

export async function saltyFetch(path, signal) {
  const response = await fetch(`${API_BASE}${path}`, { signal, cache: "no-store" });
  if (!response.ok) throw new Error(`SALTY API ${response.status}`);
  return response.json();
}

/**
 * Ask the SALTY marine agent (NVIDIA NIM, tool calling over live INCOIS,
 * Open-Meteo and NOAA sources). The answer is shown as the agent wrote it:
 * there is no mock substitute for a marine answer, because a remembered wave
 * height reads exactly like a measured one.
 */
export async function askMarineAgent(query, options = {}) {
  const response = await fetch(`${API_BASE}/api/llm/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      mode: options.mode || "normal",
      location: options.location,
      language: options.language,
      // Prior turns, so "what about tomorrow" resolves against what was
      // just asked instead of starting from nothing every message.
      history: options.history || [],
      role: options.role,
    }),
    signal: options.signal,
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail.error || `SALTY LLM ${response.status}`);
  }
  return response.json();
}
