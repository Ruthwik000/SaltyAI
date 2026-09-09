import { NextResponse } from "next/server";

/**
 * Tide turning points at a position.
 *
 * Why not INCOIS: INCOIS has no tide service. Its own "Predicted Astronomical
 * Tide" link goes to an under-construction page, and its mobile REST API
 * answers every tide-shaped endpoint name with a catch-all handler
 * ("Hello World RESTful Jersey 'tidelatestdata'", HTTP 200) rather than data.
 * A real endpoint there answers 202 with JSON, so the absence is unambiguous.
 *
 * Open-Meteo Marine publishes `sea_level_height_msl` hourly, worldwide, with
 * no API key. Verified live 2026-09-08 for Visakhapatnam: 0.03 m to 1.31 m
 * over 48 hours, semi-diurnal, turns six hours apart, which is what the Bay
 * of Bengal actually does.
 *
 * This route exists rather than a fetch from the component for two reasons:
 * the response is cached here so ten screens share one upstream call, and the
 * provenance note lives in one place instead of being retyped in each card.
 *
 * Height is metres above MEAN SEA LEVEL, not chart datum. It tells you when
 * the water turns, never how deep it is, and the card must say so.
 */

const ENDPOINT = "https://marine-api.open-meteo.com/v1/marine";
const SOURCE = "Open-Meteo Marine tide prediction";
const TIMEOUT_MS = 15000;

/** High and low water: the local maxima and minima of the hourly curve. */
function turningPoints(times, heights) {
  const turns = [];
  for (let i = 1; i < heights.length - 1; i += 1) {
    const before = heights[i - 1];
    const here = heights[i];
    const after = heights[i + 1];
    if (before == null || here == null || after == null) continue;
    if (here > before && here >= after) {
      turns.push({ kind: "high", time: times[i], heightM: Number(here.toFixed(2)) });
    } else if (here < before && here <= after) {
      turns.push({ kind: "low", time: times[i], heightM: Number(here.toFixed(2)) });
    }
  }
  return turns;
}

/**
 * "Now" in the location's own timezone.
 *
 * Open-Meteo returns its times already shifted into that zone, so comparing
 * them against the server's clock is only correct while the server happens to
 * sit in the same one. `utc_offset_seconds` comes back in the payload, so the
 * comparison is done properly instead of by luck.
 */
function localNowIso(offsetSeconds) {
  const shifted = new Date(Date.now() + (offsetSeconds || 0) * 1000);
  return shifted.toISOString().slice(0, 16);
}

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));
  const days = Math.min(Math.max(Number(params.get("days")) || 2, 1), 5);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json(
      { error: "lat and lon are required" },
      { status: 400 }
    );
  }

  const query = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    hourly: "sea_level_height_msl",
    timezone: "auto",
    forecast_days: String(days),
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const upstream = await fetch(`${ENDPOINT}?${query}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      next: { revalidate: 1800 },
    });
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Tide service returned HTTP ${upstream.status}` },
        { status: 502 }
      );
    }

    const payload = await upstream.json();
    const times = payload?.hourly?.time || [];
    const heights = payload?.hourly?.sea_level_height_msl || [];
    if (!times.length || !heights.length) {
      return NextResponse.json(
        { error: "The tide service returned no sea-level series" },
        { status: 502 }
      );
    }

    const turns = turningPoints(times, heights);
    const now = localNowIso(payload.utc_offset_seconds);
    const upcoming = turns.filter((turn) => turn.time >= now);
    const shown = upcoming.length ? upcoming : turns;
    const known = heights.filter((h) => h != null);

    return NextResponse.json({
      source: SOURCE,
      note:
        "Predicted tide, not an INCOIS product. Heights are metres above mean " +
        "sea level, so this tells you when the water turns, not how deep it is.",
      timezone: payload.timezone,
      // Passed through so the card can work out "in 3 hours" against the same
      // clock these times are written in, instead of assuming the reader sits
      // in the same timezone as the water.
      utcOffsetSeconds: payload.utc_offset_seconds ?? null,
      position: { latitude: lat, longitude: lon },
      nextHigh: shown.find((t) => t.kind === "high") || null,
      nextLow: shown.find((t) => t.kind === "low") || null,
      turningPoints: shown.slice(0, 8),
      rangeM: known.length
        ? [
            Number(Math.min(...known).toFixed(2)),
            Number(Math.max(...known).toFixed(2)),
          ]
        : null,
    });
  } catch (error) {
    const timedOut = error?.name === "AbortError";
    return NextResponse.json(
      { error: timedOut ? "The tide service timed out" : "Could not reach the tide service" },
      { status: 504 }
    );
  } finally {
    clearTimeout(timer);
  }
}
