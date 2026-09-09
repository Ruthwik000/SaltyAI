import { NextResponse } from "next/server";

/**
 * Thunderstorm and lightning outlook, and the air weather with it.
 *
 * Why not INCOIS: the INCOIS Ocean State Forecast is an OCEAN model. It has
 * waves, swell, currents, SST and wind over water, and it has no air
 * temperature, no rainfall and no thunderstorm signal at all. INCOIS issues
 * High Wave and Swell Surge advisories, which cover cyclone-driven seas, but
 * publishes no lightning product, and IMD's cyclone warnings are web pages,
 * not an API.
 *
 * Open-Meteo fills exactly that gap, free and keyless. Verified live for
 * Visakhapatnam on 2026-09-08: weather_code 95 (thunderstorm) on two forecast
 * hours, CAPE to 4860 J/kg, gusts to 7.2 m/s, timezone Asia/Kolkata.
 *
 * A named cyclone is NOT answerable from here. The card built on this must
 * say so and send the reader to the IMD bulletin, rather than turning a high
 * CAPE reading into a cyclone warning of its own.
 */

const ENDPOINT = "https://api.open-meteo.com/v1/forecast";
const SOURCE = "Open-Meteo weather forecast";
const TIMEOUT_MS = 15000;

/** WMO present-weather codes, in the words a fisherman would use. */
const WMO = {
  0: "clear", 1: "mostly clear", 2: "partly cloudy", 3: "overcast",
  45: "fog", 48: "freezing fog",
  51: "light drizzle", 53: "drizzle", 55: "heavy drizzle",
  61: "light rain", 63: "rain", 65: "heavy rain",
  80: "rain showers", 81: "heavy rain showers", 82: "violent rain showers",
  95: "thunderstorm", 96: "thunderstorm with hail", 99: "severe thunderstorm with hail",
};

const THUNDER_CODES = new Set([95, 96, 99]);

/**
 * CAPE, convective available potential energy, in J/kg. Above about 2500 the
 * atmosphere is unstable enough for strong thunderstorms. These are the
 * standard forecasting bands, not something invented here.
 */
const CAPE_BANDS = [
  [3500, "extreme"],
  [2500, "strong"],
  [1000, "moderate"],
  [0, "low"],
];

function capeBand(value) {
  if (value == null) return null;
  for (const [threshold, label] of CAPE_BANDS) {
    if (value >= threshold) return label;
  }
  return "low";
}

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));
  const days = Math.min(Math.max(Number(params.get("days")) || 2, 1), 7);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "lat and lon are required" }, { status: 400 });
  }

  const query = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    hourly: "weather_code,cape,precipitation,wind_gusts_10m",
    current:
      "weather_code,cape,temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_gusts_10m",
    wind_speed_unit: "ms",
    timezone: "auto",
    forecast_days: String(days),
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const upstream = await fetch(`${ENDPOINT}?${query}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      next: { revalidate: 900 },
    });
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Weather service returned HTTP ${upstream.status}` },
        { status: 502 }
      );
    }

    const payload = await upstream.json();
    const current = payload.current || {};
    const hourly = payload.hourly || {};
    const times = hourly.time || [];
    const codes = hourly.weather_code || [];
    const capes = hourly.cape || [];
    const gusts = hourly.wind_gusts_10m || [];
    const rain = hourly.precipitation || [];

    const thunderstorms = [];
    codes.forEach((code, i) => {
      if (!THUNDER_CODES.has(code) || i >= times.length) return;
      thunderstorms.push({
        time: times[i],
        description: WMO[code] || "thunderstorm",
        capeJkg: capes[i] ?? null,
        instability: capeBand(capes[i]),
        gustMs: gusts[i] ?? null,
      });
    });

    const knownGusts = gusts.filter((g) => g != null);
    const knownRain = rain.filter((r) => r != null);

    return NextResponse.json({
      source: SOURCE,
      note:
        "Thunderstorm and air weather from Open-Meteo, not from INCOIS. INCOIS " +
        "issues no lightning product, and IMD cyclone bulletins are not machine " +
        "readable — for a named cyclone, check the IMD bulletin directly.",
      timezone: payload.timezone,
      position: { latitude: lat, longitude: lon },
      now: {
        description: WMO[current.weather_code] || "unknown",
        airTemperatureC: current.temperature_2m ?? null,
        humidityPercent: current.relative_humidity_2m ?? null,
        rainfallMm: current.precipitation ?? null,
        windMs: current.wind_speed_10m ?? null,
        gustMs: current.wind_gusts_10m ?? null,
        instability: capeBand(current.cape),
      },
      thunderstormHours: thunderstorms.length,
      thunderstorms: thunderstorms.slice(0, 6),
      maxGustMs: knownGusts.length
        ? Number(Math.max(...knownGusts).toFixed(1))
        : null,
      totalRainfallMm: knownRain.length
        ? Number(knownRain.reduce((a, b) => a + b, 0).toFixed(1))
        : null,
      lightningRisk: thunderstorms.length
        ? `thunderstorms forecast on ${thunderstorms.length} hour(s)`
        : "none forecast",
    });
  } catch (error) {
    const timedOut = error?.name === "AbortError";
    return NextResponse.json(
      {
        error: timedOut
          ? "The weather service timed out"
          : "Could not reach the weather service",
      },
      { status: 504 }
    );
  } finally {
    clearTimeout(timer);
  }
}
