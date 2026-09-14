/**
 * Harbour landings and auction prices, from this app's own /api/market route.
 *
 * The route reads CMFRI Fish Watch server-side; the browser cannot, because
 * cmfri.org.in sends no Access-Control-Allow-Origin. There is no demo fallback
 * here on purpose: India publishes no other machine-readable fish price feed,
 * and a made-up rupee figure on a price board is worse than an empty one.
 */

const TIMEOUT_MS = 12000;

export async function fetchHarbourMarket(place, signal) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort);
  try {
    const response = await fetch(`/api/market?place=${encodeURIComponent(place)}`, {
      signal: controller.signal,
      cache: "no-store",
    });
    const body = await response.json();
    if (!response.ok) {
      return { covered: false, error: body?.error || "Price board unavailable" };
    }
    return body;
  } catch (error) {
    return {
      covered: false,
      error:
        error?.name === "AbortError"
          ? "Price board timed out"
          : "Price board unavailable",
    };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}
