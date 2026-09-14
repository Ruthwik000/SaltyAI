/**
 * Live marine data loaded straight from the browser.
 *
 * Every source here answers cross-origin requests, so the console needs no
 * backend round trip to show conditions, the forecast, tides, warnings or
 * fishing zones:
 *
 *   Open-Meteo Marine    waves, swell, period, currents, sea temperature, tides
 *   Open-Meteo Forecast  wind, air temperature, rain, thunderstorms
 *   INCOIS mobile API    high-wave and swell-surge warnings
 *   INCOIS GeoServer     potential fishing zone advisory lines
 *
 * Results are cached on the device: reused while fresh, and the last good copy
 * is used if the network fails, so screens appear instantly on repeat visits.
 */

const MARINE = "https://marine-api.open-meteo.com/v1/marine";
const FORECAST = "https://api.open-meteo.com/v1/forecast";
const ALERTS = "https://sarat.incois.gov.in/incoismobileappdata/rest/incois/hwassalatestdata";
const PFZ = "https://www.incois.gov.in/geoserver/PFZ_Automation/ows";

const MINUTE = 60_000;
const STALE_LIMIT = 24 * 60 * MINUTE;
const MS_TO_KNOTS = 1.94384;

/* ------------------------------------------------------------------ */
/* Cache                                                               */
/* ------------------------------------------------------------------ */

const memory = new Map();
const inflight = new Map();

function readStored(key) {
  if (memory.has(key)) return memory.get(key);
  try {
    const raw = window.localStorage.getItem(`salty:${key}`);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    memory.set(key, entry);
    return entry;
  } catch {
    return null;
  }
}

function store(key, data) {
  const entry = { at: Date.now(), data };
  memory.set(key, entry);
  try {
    window.localStorage.setItem(`salty:${key}`, JSON.stringify(entry));
  } catch {
    // Storage full or blocked: memory cache still works for this session.
  }
}

async function cached(key, ttlMs, loader) {
  const hit = readStored(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.data;
  if (inflight.has(key)) return inflight.get(key);
  const request = loader()
    .then((data) => {
      store(key, data);
      return data;
    })
    .catch((error) => {
      if (hit && Date.now() - hit.at < STALE_LIMIT) return hit.data;
      throw error;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, request);
  return request;
}

async function getJson(url, signal) {
  const response = await fetch(url, { signal, cache: "no-store" });
  if (!response.ok) throw new Error(`${new URL(url).hostname} ${response.status}`);
  return response.json();
}

const place = (lat, lon) => `${Number(lat).toFixed(2)},${Number(lon).toFixed(2)}`;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const POINTS = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"];
export function compass(degrees) {
  if (degrees === null || degrees === undefined || Number.isNaN(degrees)) return null;
  return POINTS[Math.floor((((degrees + 22.5) % 360) + 360) % 360 / 45)];
}

const WMO = {
  0: "clear", 1: "mostly clear", 2: "partly cloudy", 3: "overcast", 45: "fog", 48: "freezing fog",
  51: "light drizzle", 53: "drizzle", 55: "heavy drizzle", 61: "light rain", 63: "rain", 65: "heavy rain",
  80: "rain showers", 81: "heavy rain showers", 82: "violent rain showers",
  95: "thunderstorm", 96: "thunderstorm with hail", 99: "severe thunderstorm with hail",
};
const THUNDER = new Set([95, 96, 99]);

const round = (value, digits = 2) =>
  value === null || value === undefined || Number.isNaN(value) ? null : Number(Number(value).toFixed(digits));

/** Current speed in m/s whatever unit Open-Meteo reports it in. */
function toMs(value, unit) {
  if (value === null || value === undefined) return null;
  if (/km\/h/i.test(unit || "")) return value / 3.6;
  if (/kn/i.test(unit || "")) return value / MS_TO_KNOTS;
  return value;
}

/* The same transparent risk model the SALTY backend uses. */
const THRESHOLDS = {
  wind: [12, 24], // m/s
  wave: [2, 4], // m
  swell: [1.5, 3], // m
  rain: [15, 50], // mm
  current: [0.8, 1.5], // m/s
};
export function riskScore(features) {
  let score = 0;
  for (const [name, value] of Object.entries(features)) {
    const limits = THRESHOLDS[name];
    if (!limits || value === null || value === undefined) continue;
    const [caution, danger] = limits;
    const v = Math.abs(value);
    const part = v <= caution ? 0 : v >= danger ? 100 : ((v - caution) * 100) / (danger - caution);
    score = Math.max(score, part);
  }
  const rounded = Math.round(score * 10) / 10;
  return { score: rounded, level: rounded >= 70 ? "High" : rounded >= 35 ? "Moderate" : "Low" };
}

function distanceNm(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dPhi = toRad(lat2 - lat1);
  const dLambda = toRad(lon2 - lon1);
  const a = Math.sin(dPhi / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLambda / 2) ** 2;
  return 2 * 3440.065 * Math.asin(Math.min(1, Math.sqrt(a)));
}

function bearingDeg(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/* ------------------------------------------------------------------ */
/* Sea state, weather, forecast, tides                                 */
/* ------------------------------------------------------------------ */

async function loadMarine(lat, lon, signal) {
  const common = `latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&timezone=auto&forecast_days=7`;
  const [marine, weather] = await Promise.all([
    getJson(
      `${MARINE}?${common}&cell_selection=sea` +
        "&current=wave_height,swell_wave_height,wave_period,ocean_current_velocity,ocean_current_direction,sea_surface_temperature" +
        "&hourly=wave_height,swell_wave_height,wave_period,ocean_current_velocity,sea_level_height_msl",
      signal
    ),
    getJson(
      `${FORECAST}?${common}&wind_speed_unit=ms` +
        "&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,precipitation" +
        "&hourly=temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_direction_10m" +
        "&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max",
      signal
    ),
  ]);
  return { marine, weather };
}

function buildOutlook({ marine, weather }) {
  const mh = marine.hourly || {};
  const wh = weather.hourly || {};
  const currentUnit = marine.current_units?.ocean_current_velocity;
  const hourlyCurrentUnit = marine.hourly_units?.ocean_current_velocity;
  const mc = marine.current || {};
  const wc = weather.current || {};
  const index = new Map((wh.time || []).map((time, i) => [time, i]));

  // Hour-by-hour rows, merged on local time.
  const rows = (mh.time || []).map((time, i) => {
    const w = index.get(time);
    const windMs = w === undefined ? null : wh.wind_speed_10m?.[w];
    const wave = mh.wave_height?.[i];
    const swell = mh.swell_wave_height?.[i];
    const current = toMs(mh.ocean_current_velocity?.[i], hourlyCurrentUnit);
    const rainMm = w === undefined ? null : wh.precipitation?.[w];
    const risk = riskScore({ wind: windMs, wave, swell, current, rain: rainMm });
    return {
      time,
      wave: round(wave),
      swell: round(swell),
      period: round(mh.wave_period?.[i], 1),
      wind: windMs === null || windMs === undefined ? null : Math.round(windMs * MS_TO_KNOTS),
      windDirection: w === undefined ? null : compass(wh.wind_direction_10m?.[w]),
      temp: w === undefined ? null : round(wh.temperature_2m?.[w], 1),
      rain: w === undefined ? null : wh.precipitation_probability?.[w],
      code: w === undefined ? null : wh.weather_code?.[w],
      tide: mh.sea_level_height_msl?.[i],
      riskScore: risk.score,
      level: risk.level,
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
      windDirection: row.windDirection,
      wave: row.wave,
      swell: row.swell,
      period: row.period,
      rain: row.rain,
      riskScore: row.riskScore,
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
            : new Date(`${date}T12:00:00`).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" }),
      condition: WMO[weather.daily.weather_code?.[d]] || "—",
      tempMax: round(weather.daily.temperature_2m_max?.[d], 1),
      tempMin: round(weather.daily.temperature_2m_min?.[d], 1),
      rainMax: weather.daily.precipitation_probability_max?.[d] ?? null,
      windMax: max("wind"),
      waveMax: round(max("wave")),
      riskScore: score,
      risk: score >= 70 ? "High" : score >= 35 ? "Moderate" : "Low",
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

  const conditions = {
    sst: round(mc.sea_surface_temperature, 1),
    chlorophyll: null,
    waveHeight: round(mc.wave_height),
    wavePeriod: round(mc.wave_period, 1),
    swellHeight: round(mc.swell_wave_height),
    currentSpeed: round(toMs(mc.ocean_current_velocity, currentUnit)),
    currentDirection: compass(mc.ocean_current_direction),
    windSpeed: wc.wind_speed_10m === undefined ? null : round(wc.wind_speed_10m * MS_TO_KNOTS, 1),
    windDirection: compass(wc.wind_direction_10m),
    airTemp: round(wc.temperature_2m, 1),
    humidity: wc.relative_humidity_2m ?? null,
    visibility: null,
    pressure: null,
    condition: WMO[wc.weather_code] || null,
    observedAt: mc.time || wc.time || null,
    lightningRisk: thunderHours ? `thunderstorms forecast on ${thunderHours} hour(s)` : "none forecast",
    readAt: { latitude: marine.latitude, longitude: marine.longitude },
    sources: ["Open-Meteo Marine", "Open-Meteo Forecast"],
    unavailable: [],
  };

  return {
    conditions,
    forecast: {
      hourly: hourly.slice(0, 8),
      daily,
      tides: {
        source: "Open-Meteo Marine tide prediction (sea level above mean sea level)",
        note: "Predicted tide. Heights are metres above mean sea level: when the water turns, not how deep it is.",
        timezone: marine.timezone,
        nextHigh: turns.find((t) => t.kind === "high") || null,
        nextLow: turns.find((t) => t.kind === "low") || null,
        turningPoints: turns.slice(0, 8),
      },
      sources: ["Open-Meteo Marine", "Open-Meteo Forecast"],
      unavailable: [],
    },
  };
}

function outlook(lat, lon, signal) {
  return cached(`outlook:${place(lat, lon)}`, 30 * MINUTE, async () => buildOutlook(await loadMarine(lat, lon, signal)));
}

export async function liveConditions(lat, lon, signal) {
  return (await outlook(lat, lon, signal)).conditions;
}

export async function liveForecast(lat, lon, signal) {
  return (await outlook(lat, lon, signal)).forecast;
}

/* ------------------------------------------------------------------ */
/* INCOIS warnings                                                     */
/* ------------------------------------------------------------------ */

const SEVERITY = { red: "Critical", orange: "Severe", yellow: "Warning", green: "Advisory" };
const SEVERITY_RANK = { Critical: 4, Severe: 3, Warning: 2, Advisory: 1 };

function inner(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) {
    try {
      return inner(JSON.parse(value));
    } catch {
      return [];
    }
  }
  return [];
}

function allAlerts(signal) {
  return cached("incois-alerts", 15 * MINUTE, async () => {
    const payload = await getJson(ALERTS, signal);
    const rows = [
      ...inner(payload.HWAJson).map((row) => ["High wave", row]),
      ...inner(payload.SSAJson).map((row) => ["Swell surge", row]),
    ];
    return rows.map(([kind, row], index) => {
      const district = String(row.District || "").trim();
      const state = String(row.STATE || "").trim();
      const alert = String(row.Alert || "").trim();
      return {
        id: `incois-${kind.toLowerCase().replace(/\s+/g, "-")}-${district.toLowerCase().replace(/\s+/g, "-")}-${index}`,
        type: kind,
        severity: SEVERITY[String(row.Color || "").trim().toLowerCase()] || "Advisory",
        title: `${kind} alert: ${district}, ${state}`,
        summary: String(row.Message || "").trim() || alert,
        action: alert || "Follow the INCOIS advisory before sailing.",
        operationalAction: alert || "Follow the INCOIS advisory before sailing.",
        issuedAt: String(row["Issue Date"] || "").trim() || "—",
        expiresAt: "Until withdrawn",
        lat: null,
        lon: null,
        affectedRegions: [district],
        state,
        source: "Official INCOIS High Wave Alert / Swell Surge Advisory",
      };
    });
  });
}

/** Warnings in force for a coastal state, most severe first. */
export async function liveAlerts(state, signal) {
  const alerts = await allAlerts(signal);
  const needle = String(state || "").trim().toLowerCase();
  const matched = needle
    ? alerts.filter((a) => a.state.toLowerCase().includes(needle) || needle.includes(a.state.toLowerCase()))
    : alerts;
  return matched.sort((a, b) => (SEVERITY_RANK[b.severity] || 0) - (SEVERITY_RANK[a.severity] || 0)).slice(0, 20);
}

/* ------------------------------------------------------------------ */
/* INCOIS potential fishing zones                                      */
/* ------------------------------------------------------------------ */

// INCOIS sector -> the fish usually landed on that coast. Background, not part
// of the advisory; mirrors the backend's SECTOR_REFERENCE.
const SECTORS = {
  1: ["Gujarat", ["Bombay Duck", "Indian Mackerel", "Ribbonfish", "Penaeid Prawns"], "20-70 m"],
  2: ["Daman & Diu", ["Bombay Duck", "Ribbonfish", "Croaker"], "15-50 m"],
  3: ["Maharashtra", ["Indian Mackerel", "Bombay Duck", "Pomfret", "Sardine"], "20-80 m"],
  4: ["Goa", ["Sardine", "Indian Mackerel", "Seer Fish"], "20-60 m"],
  5: ["Karnataka", ["Oil Sardine", "Indian Mackerel", "Seer Fish"], "20-70 m"],
  6: ["Kerala", ["Oil Sardine", "Indian Mackerel", "Anchovy", "Tuna"], "25-90 m"],
  7: ["Tamil Nadu", ["Seer Fish", "Tuna", "Carangids", "Sardine"], "30-100 m"],
  8: ["Puducherry", ["Seer Fish", "Carangids", "Sardine"], "30-90 m"],
  9: ["Andhra Pradesh (south)", ["Seer Fish", "Carangids", "Tuna", "Croaker"], "30-90 m"],
  10: ["Andhra Pradesh", ["Yellowfin Tuna", "Seer Fish", "Indian Mackerel", "Carangids"], "40-110 m"],
  11: ["Odisha", ["Hilsa", "Croaker", "Penaeid Prawns", "Indian Mackerel"], "20-70 m"],
  12: ["West Bengal", ["Hilsa", "Bombay Duck", "Penaeid Prawns"], "15-60 m"],
};

const zoneIndex = new Map();

function julianDate(year, day) {
  const date = new Date(Date.UTC(Number(year), 0, 1));
  date.setUTCDate(Number(day));
  return date.toISOString().slice(0, 10);
}

export async function liveZones(lat, lon, signal, limit = 10) {
  const zones = await cached(`pfz:${place(lat, lon)}`, 60 * MINUTE, async () => {
    const box = 3;
    const url =
      `${PFZ}?service=WFS&version=1.0.0&request=GetFeature&typeName=PFZ_Automation:pfzlines` +
      `&outputFormat=application/json&BBOX=${lon - box},${lat - box},${lon + box},${lat + box},EPSG:4326`;
    const collection = await getJson(url, signal);
    return (collection.features || [])
      .map((feature) => {
        const p = feature.properties || {};
        const g = feature.geometry || {};
        const parts = g.type === "MultiLineString" ? g.coordinates || [] : [g.coordinates || []];
        let best = null;
        for (const part of parts) {
          for (const [plon, plat] of part) {
            const d = distanceNm(lat, lon, plat, plon);
            if (!best || d < best.d) best = { d, lat: plat, lon: plon };
          }
        }
        if (!best) return null;
        const sector = SECTORS[p.SECTORBOUN] || null;
        const issued = p.Year && p.Julian_day ? julianDate(p.Year, p.Julian_day) : null;
        const bearing = bearingDeg(lat, lon, best.lat, best.lon);
        return {
          id: `pfz-${p.UID || p.Sno}`,
          name: `INCOIS PFZ ${sector ? sector[0] : "line"} #${p.Sno}`,
          lat: round(best.lat, 4),
          lon: round(best.lon, 4),
          radiusNM: round((Number(p.Length) || 0) / 1.852 / 2, 1),
          suitabilityScore: null,
          suitabilityText: issued ? `INCOIS advisory for ${issued}` : "INCOIS advisory",
          distanceNM: round(best.d, 1),
          bearingDeg: round(bearing, 1),
          bearing: compass(bearing),
          depthMeters: null,
          referencePort: null,
          primarySpecies: [],
          issuedFor: issued,
          lengthKm: round(Number(p.Length) || 0, 1),
          sectorId: p.SECTORBOUN ?? null,
          source: "INCOIS Potential Fishing Zone advisory (GeoServer WFS)",
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.distanceNM - b.distanceNM);
  });
  zones.forEach((zone) => zoneIndex.set(zone.id, zone));
  return zones.slice(0, limit);
}

export async function liveZoneDetail(zoneId, signal) {
  const zone = zoneIndex.get(zoneId);
  if (!zone) throw new Error("Zone not loaded; open the zone list first");
  const sector = SECTORS[zone.sectorId] || null;
  const conditions = await liveConditions(zone.lat, zone.lon, signal);
  return {
    zoneId: zone.id,
    name: zone.name,
    lat: zone.lat,
    lon: zone.lon,
    radiusNM: zone.radiusNM,
    distanceNM: zone.distanceNM,
    bearing: zone.bearing,
    bearingDeg: zone.bearingDeg,
    depthMeters: null,
    suitabilityScore: null,
    suitabilityText: zone.suitabilityText,
    species: sector
      ? sector[1].map((name) => ({ name, abundance: "Usually landed on this coast", depthRange: sector[2] }))
      : [],
    conditions,
    recommendedGear: "Not published by INCOIS",
    advisoryValidity: zone.issuedFor || "Unknown",
    notes: [
      `Advisory line ${zone.lengthKm} km long, nearest point ${zone.distanceNM} NM ${zone.bearing}.`,
      "INCOIS publishes the line, its date and sector; species are background for this coast, not part of the advisory.",
    ],
    source: zone.source,
  };
}
