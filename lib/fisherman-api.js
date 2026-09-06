/**
 * SALTY fisherman data layer.
 *
 * Every function here calls the SALTY backend first and falls back to the
 * bundled demo dataset in `lib/marine-data.ts` when the backend cannot be
 * reached. The `source` field on every result tells the UI which one it got,
 * so screens can badge demo values honestly instead of passing them off as
 * live readings.
 *
 * Backend contract (implemented separately):
 *   GET  /api/fisherman/zones?lat&lon           -> PfzZoneFeature[]
 *   GET  /api/fisherman/zones/:id?lat&lon       -> ZoneDetail
 *   POST /api/fisherman/risk/assess             -> TripRiskResult
 *   GET  /api/fisherman/alerts?lat&lon          -> OceanAlert[]
 *   GET  /api/fisherman/conditions?lat&lon      -> PointConditions
 *   POST /api/fisherman/trip/start              -> TripSession
 *   POST /api/fisherman/trip/:id/ping           -> void
 *   POST /api/fisherman/trip/:id/end            -> void
 */

import { bearingDeg, compassPoint, distanceNM } from "./geo";
import {
  pfzZones,
  marineAlerts,
  marineLocations,
  getFishSchoolUpdate,
} from "./marine-data";

const API_BASE = process.env.NEXT_PUBLIC_SALTY_API_URL || "http://127.0.0.1:8010";

/** Nominal PFZ circle radius used only by the demo fallback. The backend
 *  supplies the real advisory radius per zone. */
const DEMO_ZONE_RADIUS_NM = 6;

/* ------------------------------------------------------------------ */
/* Shared types                                                        */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Transport                                                           */
/* ------------------------------------------------------------------ */

const REQUEST_TIMEOUT_MS = 6000;

/**
 * Circuit breaker.
 *
 * Without this, every screen retries a backend that is not running on each
 * mount and each navigation, and the browser logs a red ERR_CONNECTION_REFUSED
 * for each one. After a connection-level failure we stop dialling for a short
 * while and go straight to the demo fallback, then try again once the cooldown
 * lapses. HTTP error codes do NOT trip it — a 500 still means something is
 * listening.
 */
const BACKEND_COOLDOWN_MS = 30_000;
let backendDownUntil = 0;

/** True while the backend is being given a rest after refusing a connection. */
export function backendIsCoolingDown() {
  return Date.now() < backendDownUntil;
}

class BackendOfflineError extends Error {
  constructor() {
    super("SALTY backend is not reachable");
    this.name = "BackendOfflineError";
  }
}

async function call(path, init) {
  if (backendIsCoolingDown()) throw new BackendOfflineError();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  if (init?.signal) {
    if (init.signal.aborted) controller.abort();
    else init.signal.addEventListener("abort", () => controller.abort());
  }

  let responded = false;
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });
    // Something answered, so the backend is up even if this route is unhappy.
    responded = true;
    backendDownUntil = 0;
    if (!response.ok) throw new Error(`SALTY API ${response.status}`);
    return await response.json();
  } catch (error) {
    if (!responded) backendDownUntil = Date.now() + BACKEND_COOLDOWN_MS;
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function describe(error) {
  if (error instanceof BackendOfflineError) return error.message;
  if (error instanceof DOMException && error.name === "AbortError") {
    return "SALTY backend did not respond in time";
  }
  return error instanceof Error ? error.message : "SALTY backend unreachable";
}

/* ------------------------------------------------------------------ */
/* Demo adapters — derived from lib/marine-data.ts                     */
/* ------------------------------------------------------------------ */

function toFeature(zone, from) {
  // When we know where the fisherman is, state the distance and bearing from
  // there rather than from the zone's own reference port — the demo dataset
  // covers the whole coastline, so those two are often nowhere near each other.
  const relative = from
    ? {
        distanceNM: Math.round(distanceNM(from, zone) * 10) / 10,
        bearingDeg: Math.round(bearingDeg(from, zone)),
        bearing: compassPoint(bearingDeg(from, zone)),
      }
    : {
        distanceNM: zone.distanceNM,
        bearingDeg: zone.bearingDeg,
        bearing: zone.bearing,
      };

  return {
    id: zone.id,
    name: zone.name,
    lat: zone.lat,
    lon: zone.lon,
    radiusNM: DEMO_ZONE_RADIUS_NM,
    suitabilityScore: zone.suitabilityScore,
    suitabilityText: zone.suitabilityText,
    ...relative,
    depthMeters: zone.depthMeters,
    referencePort: zone.referencePort,
    primarySpecies: zone.primarySpecies,
  };
}

/** Nearest-first, and only what a boat could actually reach from here. */
const DEMO_MAX_RANGE_NM = 120;

function demoZonesNear(from) {
  const ranked = pfzZones
    .map((zone) => ({ zone, range: distanceNM(from, zone) }))
    .sort((a, b) => a.range - b.range);

  const inRange = ranked.filter((item) => item.range <= DEMO_MAX_RANGE_NM);
  const chosen = inRange.length > 0 ? inRange : ranked.slice(0, 3);
  return chosen.map((item) => toFeature(item.zone, from));
}

function conditionsFromLocation(location) {
  return {
    sst: location.sst,
    chlorophyll: location.chlorophyll,
    waveHeight: location.waveHeight,
    wavePeriod: location.wavePeriod,
    swellHeight: location.swellHeight,
    currentSpeed: location.currentSpeed,
    currentDirection: location.currentDirection,
    windSpeed: location.windSpeed,
    windDirection: location.windDirection,
    airTemp: location.weather.temp,
    humidity: location.weather.humidity,
    visibility: location.weather.visibility,
    pressure: location.weather.pressure,
    condition: location.weather.condition,
    observedAt: null,
  };
}

function nearestLocation(lat, lon) {
  return marineLocations.reduce((closest, candidate) => {
    const d = (a) => (a.lat - lat) ** 2 + (a.lon - lon) ** 2;
    return d(candidate) < d(closest) ? candidate : closest;
  }, marineLocations[0]);
}

function demoZoneDetail(zoneId) {
  const zone = pfzZones.find((item) => item.id === zoneId);
  if (!zone) return null;

  const location = nearestLocation(zone.lat, zone.lon);
  const school = getFishSchoolUpdate(location.id);

  return {
    zoneId: zone.id,
    name: zone.name,
    lat: zone.lat,
    lon: zone.lon,
    radiusNM: DEMO_ZONE_RADIUS_NM,
    distanceNM: zone.distanceNM,
    bearing: zone.bearing,
    bearingDeg: zone.bearingDeg,
    depthMeters: zone.depthMeters,
    suitabilityScore: zone.suitabilityScore,
    suitabilityText: zone.suitabilityText,
    species: zone.primarySpecies.map((name) => ({
      name,
      abundance: school.biomassSurge,
      depthRange: school.depthRange,
    })),
    conditions: {
      ...conditionsFromLocation(location),
      sst: zone.sstC,
      chlorophyll: zone.chlorophyllMgM3,
    },
    recommendedGear: zone.recommendedGear,
    advisoryValidity: zone.advisoryValidity,
    notes: [
      `Estimated transit ${zone.transitHours} h, about ${zone.fuelEstimatedLiters} L fuel`,
      school.schoolAlert,
    ],
  };
}

function demoAlerts() {
  return marineAlerts.map((alert) => ({
    id: alert.id,
    type: alert.type,
    severity: alert.severity,
    title: alert.title,
    summary: alert.summary,
    action: alert.operationalAction,
    issuedAt: alert.issuedAt,
    expiresAt: alert.expiresAt,
    lat: alert.coordinates?.lat,
    lon: alert.coordinates?.lon,
  }));
}

/**
 * Illustrative trip risk, for demos and for working on the UI while the
 * backend is being built.
 *
 * It is a transparent weighted sum of the bundled demo conditions, the crossing
 * distance and the hull class — NOT a safety assessment. Everything that shows
 * it is badged "Demo estimate", and the summary says so, so nobody mistakes it
 * for the real model's verdict.
 */
const BOAT_EXPOSURE = {
  craft: { label: "Country craft", factor: 1.55 },
  motorized: { label: "Motorised FRP craft", factor: 1.15 },
  trawler: { label: "Mechanised trawler", factor: 0.85 },
  longliner: { label: "Deep-sea longliner", factor: 0.7 },
};

function nightHours(fromIso, toIso) {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime())) return 0;
  let dark = 0;
  for (
    let t = from.getTime();
    t < to.getTime() && t - from.getTime() < 72 * 3_600_000;
    t += 3_600_000
  ) {
    const hour = new Date(t).getHours();
    if (hour >= 18 || hour < 6) dark += 1;
  }
  return dark;
}

function demoTripRisk(request) {
  const near = nearestLocation(request.departureLat, request.departureLon);
  const boat = BOAT_EXPOSURE[request.boatType];
  const crossing = distanceNM(
    { lat: request.departureLat, lon: request.departureLon },
    { lat: request.destinationLat, lon: request.destinationLon }
  );
  const dark = request.returnAt ? nightHours(request.departureAt, request.returnAt) : 0;

  const clamp = (value) => Math.max(0, Math.min(100, Math.round(value)));

  // Each factor is scored 0-100 on its own terms, then weighted.
  const seaState = clamp((near.waveHeight / 3.5) * 100 * boat.factor);
  const wind = clamp((near.windSpeed / 35) * 100 * boat.factor);
  const swell = clamp((near.swellHeight / 2.5) * 100 * boat.factor);
  const range = clamp((crossing / 60) * 100 * boat.factor);
  const visibility = clamp(((10 - Math.min(10, near.weather.visibility)) / 10) * 100);
  const night = clamp((dark / 12) * 100);

  const score = clamp(
    seaState * 0.28 +
      wind * 0.22 +
      swell * 0.14 +
      range * 0.18 +
      visibility * 0.1 +
      night * 0.08
  );

  const level =
    score >= 70 ? "High" : score >= 50 ? "Elevated" : score >= 30 ? "Moderate" : "Low";

  const recommendations = [
    `Log your trip in SALTY so ${near.name} coastal operations can see your track.`,
    `Carry a charged VHF set and keep Channel 16 monitored throughout the crossing.`,
  ];
  const precautions = [];

  if (seaState >= 45 || swell >= 45) {
    precautions.push(
      `Seas around ${near.waveHeight} m with a ${near.wavePeriod} s period will be uncomfortable for a ${boat.label.toLowerCase()} — take the swell on the bow when turning.`
    );
  }
  if (wind >= 45) {
    precautions.push(
      `Wind is running ${near.windSpeed} kts from ${near.windDirection}; expect it to freshen through the afternoon.`
    );
  }
  if (range >= 50) {
    precautions.push(
      `${crossing.toFixed(1)} NM each way is a long run for this hull — check fuel for the return leg before you commit.`
    );
  }
  if (visibility >= 40) {
    precautions.push(
      `Visibility is down to about ${near.weather.visibility} km. Keep navigation lights on and reduce speed.`
    );
  }
  if (night >= 30) {
    precautions.push(
      `Roughly ${dark} h of this trip falls after dark. Confirm your lights and have a second crew member awake.`
    );
  }
  if (precautions.length === 0) {
    precautions.push(
      "Nothing in the bundled conditions stands out, but check the IMD bulletin on the morning you sail."
    );
  }
  if (score < 30) {
    recommendations.push("Conditions look workable for a normal day trip on this route.");
  } else {
    recommendations.push(
      "Consider an earlier departure so you are back before conditions build."
    );
  }

  return {
    score,
    level,
    summary:
      `Demo estimate for ${request.destinationZoneName} from ${near.name}, worked out from the bundled ` +
      `conditions, a ${crossing.toFixed(1)} NM crossing and a ${boat.label.toLowerCase()}. ` +
      `This is an illustration of the output shape, not a real safety assessment.`,
    safeWindow: score < 50 ? "04:30 – 13:30 IST" : null,
    factors: [
      {
        name: "Sea state",
        value: `${near.waveHeight} m at ${near.wavePeriod} s`,
        score: seaState,
      },
      { name: "Wind", value: `${near.windSpeed} kts ${near.windDirection}`, score: wind },
      { name: "Swell", value: `${near.swellHeight} m`, score: swell },
      {
        name: "Crossing distance",
        value: `${crossing.toFixed(1)} NM each way`,
        score: range,
      },
      { name: "Visibility", value: `${near.weather.visibility} km`, score: visibility },
      { name: "Hours after dark", value: dark > 0 ? `${dark} h` : "None", score: night },
    ],
    recommendations,
    precautions,
  };
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export async function fetchPfzZones(lat, lon, signal) {
  try {
    const data = await call(`/api/fisherman/zones?lat=${lat}&lon=${lon}`, { signal });
    return { data, source: "live" };
  } catch (error) {
    return {
      data: demoZonesNear({ lat, lon }),
      source: "demo",
      reason: describe(error),
    };
  }
}

export async function fetchZoneDetail(zoneId, signal) {
  try {
    const data = await call(`/api/fisherman/zones/${encodeURIComponent(zoneId)}`, {
      signal,
    });
    return { data, source: "live" };
  } catch (error) {
    return {
      data: demoZoneDetail(zoneId),
      source: "demo",
      reason: describe(error),
    };
  }
}

export async function fetchPointConditions(lat, lon, signal) {
  try {
    const data = await call(`/api/fisherman/conditions?lat=${lat}&lon=${lon}`, {
      signal,
    });
    return { data, source: "live" };
  } catch (error) {
    return {
      data: conditionsFromLocation(nearestLocation(lat, lon)),
      source: "demo",
      reason: describe(error),
    };
  }
}

export async function fetchOceanAlerts(lat, lon, signal) {
  try {
    const data = await call(`/api/fisherman/alerts?lat=${lat}&lon=${lon}`, { signal });
    return { data, source: "live" };
  } catch (error) {
    return { data: demoAlerts(), source: "demo", reason: describe(error) };
  }
}

export async function assessTripRisk(request, signal) {
  try {
    const data = await call("/api/fisherman/risk/assess", {
      method: "POST",
      body: JSON.stringify(request),
      signal,
    });
    return { data, source: "live" };
  } catch (error) {
    // The real score is a safety judgement and only the model can give it.
    // Until the backend is up we return a clearly-labelled illustrative
    // estimate so the screen can be built and demonstrated.
    return { data: demoTripRisk(request), source: "demo", reason: describe(error) };
  }
}

export async function startTrip(
  request,

  signal
) {
  const local = {
    tripId: `local-${Date.now()}`,
    startedAt: new Date().toISOString(),
    departurePort: request.departurePort,
    destinationZoneName: request.destinationZoneName,
    boatType: request.boatType,
  };

  try {
    const data = await call("/api/fisherman/trip/start", {
      method: "POST",
      body: JSON.stringify(request),
      signal,
    });
    return { data, source: "live" };
  } catch (error) {
    // The trip still runs on the device so the fisherman keeps their track;
    // it just is not registered with the coastal operator console yet.
    return { data: local, source: "demo", reason: describe(error) };
  }
}

export async function pushTripPing(tripId, point) {
  try {
    await call(`/api/fisherman/trip/${encodeURIComponent(tripId)}/ping`, {
      method: "POST",
      body: JSON.stringify(point),
    });
    return true;
  } catch {
    return false;
  }
}

export async function endTrip(tripId) {
  try {
    await call(`/api/fisherman/trip/${encodeURIComponent(tripId)}/end`, {
      method: "POST",
      body: JSON.stringify({ endedAt: new Date().toISOString() }),
    });
    return true;
  } catch {
    return false;
  }
}
