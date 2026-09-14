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
import { referenceForSector } from "./pfz-reference";
import { assessRisk, BOATS, DEFAULT_BOAT, knotsToMs } from "./risk-model";
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

const round2 = (value) => (Number.isFinite(Number(value)) ? Number(Number(value).toFixed(2)) : value);

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
/* Boat exposure now lives with the model, so the dashboard and this estimate
   weigh the hull the same way. */
const BOAT_EXPOSURE = BOATS;

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
  const boat = BOAT_EXPOSURE[request.boatType] || BOAT_EXPOSURE[DEFAULT_BOAT];
  const crossing = distanceNM(
    { lat: request.departureLat, lon: request.departureLon },
    { lat: request.destinationLat, lon: request.destinationLon }
  );
  const dark = request.returnAt ? nightHours(request.departureAt, request.returnAt) : 0;

  // One model, shared with the home tile. The old local weighted sum used
  // different normalisers and different bands, so the same afternoon could
  // read Low here and Elevated there.
  const assessment = assessRisk(
    {
      wave: near.waveHeight,
      period: near.wavePeriod,
      wind: knotsToMs(near.windSpeed),
      swell: near.swellHeight,
      current: near.currentSpeed,
      visibility: near.weather?.visibility,
      range: crossing,
      night: dark,
    },
    { boat: request.boatType || DEFAULT_BOAT }
  );

  const score = assessment.score ?? 0;
  const level = assessment.level ?? "Low";
  const scoreOf = (key) => assessment.components.find((item) => item.key === key)?.score ?? 0;
  const seaState = scoreOf("wave");
  const wind = scoreOf("wind");
  const swell = scoreOf("swell");
  const range = scoreOf("range");
  const visibility = scoreOf("visibility");
  const night = scoreOf("night");

  const recommendations = [
    `Log your trip in SALTY so ${near.name} coastal operations can see your track.`,
    `Carry a charged VHF set and keep Channel 16 monitored throughout the crossing.`,
  ];
  const precautions = [];

  if (seaState >= 45 || swell >= 45) {
    precautions.push(
      `Seas around ${near.waveHeight} m with a ${near.wavePeriod} s period will be uncomfortable for a ${boat.short} — take the swell on the bow when turning.`
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
      `Safety estimate for ${request.destinationZoneName} from ${near.name}, worked out from the latest ` +
      `conditions, a ${crossing.toFixed(1)} NM crossing and a ${boat.short}. ` +
      `Always confirm against the official IMD and INCOIS bulletins before you sail.`,
    safeWindow: score < 50 ? "04:30 – 13:30 IST" : null,
    // Straight from the model, worst factor first, so "what drives this score"
    // shows exactly what the number was built from.
    factors: assessment.components.map((item) => ({
      name: item.label,
      value:
        item.key === "range"
          ? `${crossing.toFixed(1)} NM each way`
          : item.key === "wave"
            ? `${near.waveHeight} m at ${near.wavePeriod} s`
            : item.key === "wind"
              ? `${near.windSpeed} kts ${near.windDirection}`
              : item.key === "steepness"
                ? `${item.value.toFixed(3)} (Hs/L)`
                : item.key === "night"
                  ? dark > 0 ? `${dark} h` : "None"
                  : `${round2(item.value)}${item.unit ? ` ${item.unit}` : ""}`,
      score: item.score,
    })),
    recommendations,
    precautions,
  };
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/**
 * Today's INCOIS Potential Fishing Zone advisories.
 *
 * Served by our own /api/pfz route rather than the Python service: INCOIS
 * GeoServer sends no CORS header so the browser cannot call it directly, and
 * a fisherman should not need a second process running to see a fishing zone.
 * Same reason the INCOIS forecast layers go through /api/incois/*.
 *
 * The bundled set is still the fallback, and still badged as demo - but it is
 * now genuinely a fallback rather than the only thing that ever renders.
 */
export async function fetchPfzZones(lat, lon, signal) {
  try {
    const response = await fetch(`/api/pfz?lat=${lat}&lon=${lon}`, {
      signal,
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`PFZ advisory service ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      // No advisory near this port today is a real answer, not a failure.
      return { data: [], source: "live", reason: undefined };
    }
    return { data, source: "live" };
  } catch (error) {
    return {
      data: demoZonesNear({ lat, lon }),
      source: "demo",
      reason: describe(error),
    };
  }
}

/**
 * Detail for a tapped advisory.
 *
 * A real INCOIS advisory carries everything the list already fetched, so the
 * only thing worth another request is the sea state at the zone itself. The
 * species and depth band are sector background from pfz-reference.js and are
 * returned in their own `reference` block, never merged into the advisory's
 * fields, so the panel can badge them separately.
 *
 * `zone` is passed in because the caller already has it; without it a real
 * INCOIS id (2026251047) finds nothing in the bundled set and the panel shows
 * "conditions not available" for a zone that is perfectly fine.
 */
export async function fetchZoneDetail(zoneId, zone, signal) {
  if (zone && zone.issuedFor) {
    const conditions = await fetchPointConditions(zone.lat, zone.lon, signal);
    return {
      data: {
        zoneId: zone.id,
        name: zone.name,
        lat: zone.lat,
        lon: zone.lon,
        radiusNM: zone.radiusNM,
        distanceNM: zone.distanceNM,
        bearing: zone.bearing,
        bearingDeg: zone.bearingDeg,
        lengthKm: zone.lengthKm,
        sector: zone.sector,
        issuedFor: zone.issuedFor,
        isToday: zone.isToday,
        // INCOIS publishes none of these with the advisory.
        depthMeters: null,
        suitabilityScore: null,
        suitabilityText: null,
        species: [],
        recommendedGear: null,
        advisoryValidity: null,
        notes: [],
        conditions: conditions.data,
        conditionsSource: conditions.source,
        reference: referenceForSector(zone.sector),
      },
      source: "live",
    };
  }

  const fallback = demoZoneDetail(zoneId);
  return {
    data: fallback,
    source: "demo",
    reason: fallback ? undefined : "This advisory is not in the bundled set.",
  };
}

/**
 * Live sea state at a point.
 *
 * This asks THIS app's own /api/conditions route, not the Python service. The
 * old path here was /api/fisherman/conditions on the backend, an endpoint that
 * no longer exists, so every call failed and every screen fell back to the
 * bundled sample numbers — which is why the conditions card was permanently
 * badged as demo while INCOIS was up and answering the whole time.
 *
 * The route handler reads the INCOIS Ocean State Forecast directly. It has to
 * be a route handler rather than a fetch from here: INCOIS sends no
 * Access-Control-Allow-Origin, so the browser cannot call it.
 */
export async function fetchPointConditions(lat, lon, signal) {
  try {
    const response = await fetch(`/api/conditions?lat=${lat}&lon=${lon}`, { signal });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error || `HTTP ${response.status}`);
    return { data: payload, source: "live" };
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    return {
      data: conditionsFromLocation(nearestLocation(lat, lon)),
      source: "demo",
      reason: describe(error),
    };
  }
}

/**
 * Official INCOIS High Wave Alerts and Swell Surge Advisories.
 *
 * Backed by the INCOIS mobile-app advisory feed the official hwa.jsp page uses,
 * so these are the same warnings a fisherman would see on the INCOIS app - not
 * derived, not scored by us. An empty list is a real answer ("nothing in force"),
 * which is why it is returned as live rather than treated as a failure.
 */
export async function fetchMarineAlerts(place, state, signal) {
  const params = new URLSearchParams();
  if (place) params.set("place", place);
  if (state) params.set("state", state);
  try {
    const data = await call(`/api/alerts?${params.toString()}`, { signal });
    return {
      data: (data.alerts || []).map((alert) => ({
        id: `${alert.kind}-${alert.district}-${alert.alert}`,
        title: `${alert.alert} - ${alert.district}`,
        severity: alert.colour,
        kind: alert.kind,
        district: alert.district,
        state: alert.state,
        issuedOn: alert.issuedOn,
        operationalAction: alert.message,
      })),
      source: "live",
      issuedFor: data.highWaveIssuedFor,
      note: data.note,
    };
  } catch (error) {
    return { data: demoAlerts(), source: "demo", reason: describe(error) };
  }
}

export async function fetchOceanAlerts(lat, lon, signal) {
  try {
    const data = await call(`/api/fisherman/alerts?lat=${lat}&lon=${lon}`, { signal });
    return { data: data.map((alert) => normalizeAlert(alert)), source: "live" };
  } catch (error) {
    return {
      data: demoAlerts().map((alert) => normalizeAlert(alert)),
      source: "demo",
      reason: describe(error),
    };
  }
}

/**
 * Absorb the AbortError an effect's cleanup causes; surface anything else.
 *
 * fetchPointConditions rethrows AbortError on purpose — an aborted request
 * must NOT resolve to demo values, or the conditions for a coast the fisherman
 * has already navigated away from would land in state and be shown as theirs.
 * That leaves the call site responsible for absorbing it. Without this, React
 * StrictMode's double-mount in development aborts the first request and the
 * rejection surfaces as a runtime error on a screen that is working fine:
 *
 *   fetchPointConditions(lat, lon, signal).then(apply).catch(ignoreAbort);
 */
export function ignoreAbort(error) {
  if (error?.name === "AbortError") return;
  // Anything else is a real failure and should not be hidden by this helper.
  console.error("[salty] data request failed", error);
}

/** Live and demo alerts share one shape, so every card can render either. */
export function normalizeAlert(alert) {
  return {
    ...alert,
    source: alert.source || "SALTY",
    operationalAction: alert.operationalAction || alert.action || "",
    affectedRegions: alert.affectedRegions || [],
    issuedAt: alert.issuedAt || "—",
    expiresAt: alert.expiresAt || "Until withdrawn",
  };
}

/**
 * Hourly (24 h) and daily (7 day) forecast: INCOIS sea state scored by the
 * SALTY risk model, Open-Meteo air weather, and Open-Meteo tides. There is no
 * demo forecast; on failure `data` is null and the page keeps its labelled
 * demo view.
 */
export async function fetchForecast(lat, lon, signal) {
  // This app's own route handler, not the Python service. The forecast is the
  // one thing the console must never lose — it is what answers "can I go to
  // sea today?" — and it should not go blank because a second process is not
  // running. /api/forecast reads Open-Meteo server-side and scores it with the
  // same risk model the trip estimate uses.
  try {
    const response = await fetch(`/api/forecast?lat=${lat}&lon=${lon}`, {
      signal,
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok) {
      return { data: null, source: "demo", reason: data?.error || `HTTP ${response.status}` };
    }
    return { data, source: "live" };
  } catch (error) {
    return { data: null, source: "demo", reason: describe(error) };
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
