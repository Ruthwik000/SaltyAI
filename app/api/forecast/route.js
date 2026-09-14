import { NextResponse } from "next/server";
import { assessRisk, riskLevel } from "@/lib/risk-model";

/**
 * The sea-state outlook for one position: eight three-hourly steps, seven
 * days, and the tide turns.
 *
 * Why this exists. The console used to compute this in the browser in
 * lib/live-data.js. When that file went, `fetchForecast` was left pointing at
 * /api/fisherman/forecast on the Python service, so the whole "Can I go to sea
 * today?" block went blank whenever that process was not running — which is
 * most of the time on a phone. This restores the original intent (the console
 * answers for itself) and moves the work server-side, where the fetch is one
 * round trip on a good connection rather than two from a boat.
 *
 * The risk number comes from @/lib/risk-model — the SAME module the trip
 * estimate uses. That is the point of the change: the home tile and the safety
 * page can no longer grade the same afternoon differently.
 *
 * Open-Meteo answers CORS, so this could run in the browser; it runs here so
 * the model, the thresholds and the band cutoffs live in one place on one side
 * of the wire.
 */

const MARINE = "https://marine-api.open-meteo.com/v1/marine";
const FORECAST = "https://api.open-meteo.com/v1/forecast";
const TIMEOUT_MS = 15000;
/* A forecast cycle is hourly at best; re-reading it per page view buys nothing. */
const REVALIDATE_SECONDS = 600;
const MS_TO_KNOTS = 1.94384;

const WMO = {
  0: "clear", 1: "mainly clear", 2: "partly cloudy", 3: "overcast",
  45: "fog", 48: "rime fog", 51: "light drizzle", 53: "drizzle", 55: "heavy drizzle",
  61: "light rain", 63: "rain", 65: "heavy rain", 71: "light snow", 73: "snow", 75: "heavy snow",
  80: "rain showers", 81: "heavy rain showers", 82: "violent rain showers",
  95: "thunderstorm", 96: "thunderstorm with hail", 99: "severe thunderstorm with hail",
};
const THUNDER = new Set([95, 96, 99]);
const POINTS = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"];

const round = (value, digits = 2) =>
  value === null || value === undefined || Number.isNaN(Number(value))
    ? null
    : Number(Number(value).toFixed(digits));

function compass(degrees) {
  if (degrees === null || degrees === undefined || Number.isNaN(Number(degrees))) return null;
  return POINTS[Math.floor(((((Number(degrees) + 22.5) % 360) + 360) % 360) / 45)];
}

/** Current speed in m/s whatever unit Open-Meteo reports it in. */
function toMs(value, unit) {
  if (value === null || value === undefined) return null;
  if (/km\/h/i.test(unit || "")) return value / 3.6;
  if (/kn/i.test(unit || "")) return value / MS_TO_KNOTS;
  return value;
}

async function getJson(url, signal) {
  const response = await fetch(url, { signal, next: { revalidate: REVALIDATE_SECONDS } });
  if (!response.ok) throw new Error(`${new URL(url).hostname} ${response.status}`);
  return response.json();
}

export async function GET(request) {
  const params = request.nextUrl.searchParams;
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "lat and lon are required" }, { status: 400 });
  }

  const common = `latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&timezone=auto&forecast_days=7`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let marine;
  let weather;
  try {
    [marine, weather] = await Promise.all([
      getJson(
        `${MARINE}?${common}&cell_selection=sea` +
          "&current=wave_height,swell_wave_height,wave_period,ocean_current_velocity,ocean_current_direction,sea_surface_temperature" +
          "&hourly=wave_height,swell_wave_height,wave_period,ocean_current_velocity,sea_level_height_msl",
        controller.signal
      ),
      getJson(
        `${FORECAST}?${common}&wind_speed_unit=ms` +
          "&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,precipitation" +
          "&hourly=temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,visibility" +
          "&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max",
        controller.signal
      ),
    ]);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error?.name === "AbortError"
            ? "The forecast service did not answer in time"
            : `Unable to reach the forecast service (${error?.message || "unknown"})`,
      },
      { status: 502 }
    );
  } finally {
    clearTimeout(timer);
  }

  const mh = marine.hourly || {};
  const wh = weather.hourly || {};
  const mc = marine.current || {};
  const wc = weather.current || {};
  const currentUnit = marine.current_units?.ocean_current_velocity;
  const hourlyCurrentUnit = marine.hourly_units?.ocean_current_velocity;
  const index = new Map((wh.time || []).map((time, i) => [time, i]));

  // Hour-by-hour rows, merged on local time, each scored by the shared model.
  const rows = (mh.time || []).map((time, i) => {
    const w = index.get(time);
    const windMs = w === undefined ? null : wh.wind_speed_10m?.[w];
    const gustMs = w === undefined ? null : wh.wind_gusts_10m?.[w];
    const visM = w === undefined ? null : wh.visibility?.[w];
    const wave = mh.wave_height?.[i];
    const swell = mh.swell_wave_height?.[i];
    const period = mh.wave_period?.[i];
    const current = toMs(mh.ocean_current_velocity?.[i], hourlyCurrentUnit);
    const rainMm = w === undefined ? null : wh.precipitation?.[w];

    // Period goes in so the model can work out steepness: 2 m at 12 s is a
    // gentle roll and 2 m at 5 s breaks, and height alone cannot separate them.
    const risk = assessRisk({
      wind: windMs,
      gust: gustMs,
      wave,
      swell,
      period,
      current,
      rain: rainMm,
      visibility: visM === null || visM === undefined ? null : visM / 1000,
    });

    return {
      time,
      wave: round(wave),
      swell: round(swell),
      period: round(period, 1),
      wind: windMs === null || windMs === undefined ? null : Math.round(windMs * MS_TO_KNOTS),
      gust: gustMs === null || gustMs === undefined ? null : Math.round(gustMs * MS_TO_KNOTS),
      windDirection: w === undefined ? null : compass(wh.wind_direction_10m?.[w]),
      temp: w === undefined ? null : round(wh.temperature_2m?.[w], 1),
      rain: w === undefined ? null : wh.precipitation_probability?.[w],
      code: w === undefined ? null : wh.weather_code?.[w],
      tide: mh.sea_level_height_msl?.[i],
      riskScore: risk.score ?? 0,
      level: risk.level ?? "Low",
      riskFactors: risk.components,
    };
  });

  const nowKey = (mc.time || wc.time || "").slice(0, 13);
  let start = rows.findIndex((row) => row.time.slice(0, 13) >= nowKey);
  if (start < 0) start = 0;

  const hourly = rows
    .slice(start, start + 24)
    .filter((_, i) => i % 3 === 0)
    .filter((row) => row.wave !== null)
    .map((row, i) => ({
      time: row.time,
      hour: `${i === 0 ? "Now " : ""}${row.time.slice(11, 16)}`,
      temp: row.temp,
      wind: row.wind,
      gust: row.gust,
      windDirection: row.windDirection,
      wave: row.wave,
      swell: row.swell,
      period: row.period,
      rain: row.rain,
      riskScore: row.riskScore,
      riskFactors: row.riskFactors,
      status: row.level === "Low" ? "Safe" : row.level,
    }));

  const today = (rows[start]?.time || "").slice(0, 10);
  const tomorrow = weather.daily?.time?.[1];
  const daily = (weather.daily?.time || []).slice(0, 7).map((date, d) => {
    const dayRows = rows.filter((row) => row.time.startsWith(date));
    const max = (key) => {
      const values = dayRows.map((row) => row[key]).filter((v) => v !== null && v !== undefined);
      return values.length ? Math.max(...values) : null;
    };
    const score = max("riskScore") ?? 0;
    return {
      date,
      day:
        date === today
          ? "Today"
          : date === tomorrow
            ? "Tomorrow"
            : new Date(`${date}T12:00:00`).toLocaleDateString([], {
                weekday: "short",
                day: "numeric",
                month: "short",
              }),
      condition: WMO[weather.daily.weather_code?.[d]] || "—",
      tempMax: round(weather.daily.temperature_2m_max?.[d], 1),
      tempMin: round(weather.daily.temperature_2m_min?.[d], 1),
      rainMax: weather.daily.precipitation_probability_max?.[d] ?? null,
      windMax: max("wind"),
      waveMax: round(max("wave")),
      riskScore: score,
      // Banded by the shared model so "Elevated" cannot go missing here and be
      // treated downstream as fair weather.
      risk: riskLevel(score),
    };
  });

  // Tides: turning points of the hourly sea-level curve, from now on.
  const turns = [];
  for (let i = Math.max(1, start); i < rows.length - 1; i += 1) {
    const [before, here, after] = [rows[i - 1].tide, rows[i].tide, rows[i + 1].tide];
    if ([before, here, after].some((v) => v === null || v === undefined)) continue;
    if (here > before && here >= after) turns.push({ kind: "high", time: rows[i].time, heightM: round(here) });
    else if (here < before && here <= after) turns.push({ kind: "low", time: rows[i].time, heightM: round(here) });
  }

  const thunderHours = rows.slice(start, start + 48).filter((row) => THUNDER.has(row.code)).length;

  return NextResponse.json(
    {
      hourly: hourly.slice(0, 8),
      daily,
      tides: {
        source: "Open-Meteo Marine tide prediction (sea level above mean sea level)",
        note: "Predicted tide. Heights are metres above mean sea level: when the water turns, not how deep it is.",
        timezone: marine.timezone,
        nextHigh: turns.find((turn) => turn.kind === "high") || null,
        nextLow: turns.find((turn) => turn.kind === "low") || null,
        turningPoints: turns.slice(0, 8),
      },
      now: {
        sst: round(mc.sea_surface_temperature, 1),
        waveHeight: round(mc.wave_height),
        wavePeriod: round(mc.wave_period, 1),
        swellHeight: round(mc.swell_wave_height),
        currentSpeed: round(toMs(mc.ocean_current_velocity, currentUnit)),
        currentDirection: compass(mc.ocean_current_direction),
        windSpeed: wc.wind_speed_10m === undefined ? null : round(wc.wind_speed_10m * MS_TO_KNOTS, 1),
        windDirection: compass(wc.wind_direction_10m),
        airTemp: round(wc.temperature_2m, 1),
        humidity: wc.relative_humidity_2m ?? null,
        condition: WMO[wc.weather_code] || null,
        observedAt: mc.time || wc.time || null,
        lightningRisk: thunderHours
          ? `thunderstorms forecast on ${thunderHours} hour(s)`
          : "none forecast",
      },
      readAt: { latitude: marine.latitude, longitude: marine.longitude },
      model: "salty-risk-v2 (shared with the trip estimate)",
      sources: ["Open-Meteo Marine", "Open-Meteo Forecast"],
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
