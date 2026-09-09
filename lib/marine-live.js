"use client";

/**
 * Live marine data the console fetches for itself.
 *
 * These three go through this app's own route handlers, not through the
 * Python service. That is deliberate: a fisherman opening the console on a
 * phone should not need a second process running somewhere for the tide time
 * to appear, and the upstream services (INCOIS GeoServer, the INCOIS mobile
 * API) send no Access-Control-Allow-Origin header, so the browser cannot call
 * them directly either. The route handler is the smallest thing that works.
 *
 * Nothing here falls back to demo values. A source that cannot answer returns
 * `{ ok: false, error }` and the card says so, because a tide time invented on
 * a boat is worse than no tide time.
 */

const TIMEOUT_MS = 20000;

async function get(path, signal) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", () => controller.abort());
  }
  try {
    const response = await fetch(path, { signal: controller.signal });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      return { ok: false, error: payload?.error || `Request failed (${response.status})`, data: payload };
    }
    return { ok: true, data: payload };
  } catch (error) {
    return {
      ok: false,
      error: error?.name === "AbortError" ? "The request timed out" : "Could not reach the service",
    };
  } finally {
    clearTimeout(timer);
  }
}

/** High and low water at a position. Open-Meteo Marine, not INCOIS. */
export function fetchTides(lat, lon, signal, days = 2) {
  return get(`/api/tides?lat=${lat}&lon=${lon}&days=${days}`, signal);
}

/** Thunderstorm and lightning outlook plus air weather. Open-Meteo, not INCOIS. */
export function fetchStorms(lat, lon, signal, days = 2) {
  return get(`/api/storms?lat=${lat}&lon=${lon}&days=${days}`, signal);
}

/** Advisories in force and how close the edge of Indian waters is. INCOIS. */
export function fetchHazardZones(lat, lon, place, state, signal) {
  const query = new URLSearchParams({ lat: String(lat), lon: String(lon) });
  if (place) query.set("place", place);
  if (state) query.set("state", state);
  return get(`/api/hazards?${query}`, signal);
}

/**
 * "17:40" from an Open-Meteo local timestamp.
 *
 * The string is already in the location's timezone, so it must NOT be put
 * through `new Date()` — that would read it as the browser's zone and shift
 * every tide time by the offset between the two.
 */
export function localTime(iso) {
  return typeof iso === "string" && iso.length >= 16 ? iso.slice(11, 16) : "";
}

export function localDay(iso) {
  return typeof iso === "string" && iso.length >= 10 ? iso.slice(0, 10) : "";
}

/** Hours from now until a local timestamp, using the same zone on both sides. */
export function hoursUntil(iso, timezoneOffsetSeconds) {
  if (typeof iso !== "string" || iso.length < 16) return null;
  // India Standard Time as the last resort, because that is where every user
  // of this console is; a real offset from the service is always preferred.
  const offset = Number.isFinite(timezoneOffsetSeconds) ? timezoneOffsetSeconds : 19800;
  const target = Date.parse(`${iso}:00Z`);
  if (Number.isNaN(target)) return null;
  const now = Date.now() + offset * 1000;
  return (target - now) / 3600000;
}
