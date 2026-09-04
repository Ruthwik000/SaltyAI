/**
 * Coastal operations data layer.
 *
 * Two things the operator console needs that nothing else does: where every
 * tracked fisherman is and which zone they are working toward, and — when one
 * of them goes missing — where the drift model says to look.
 *
 * Both call the SALTY backend first and fall back to a clearly labelled demo
 * so the console can be built and demonstrated. A search datum is a
 * life-safety output, so the fallback is marked everywhere it is shown.
 *
 * Backend contract:
 *   GET  /api/operations/fleet?lat&lon        -> TrackedFisherman[]
 *   POST /api/operations/sar/predict          -> SarPrediction
 */

import { activeVessels, pfzZones, type Vessel } from "./marine-data";
import { bearingDeg, compassPoint, distanceNM, type LatLon } from "./geo";

const API_BASE =
  process.env.NEXT_PUBLIC_SALTY_API_URL || "http://127.0.0.1:8010";
const TIMEOUT_MS = 7000;
const COOLDOWN_MS = 30_000;
let downUntil = 0;

export type DataSource = "live" | "demo";

export interface Sourced<T> {
  data: T;
  source: DataSource;
  reason?: string;
}

export type FishermanStatus =
  | "underway"
  | "fishing"
  | "returning"
  | "overdue"
  | "sos";

export interface TrackedFisherman {
  id: string;
  skipper: string;
  boatName: string;
  regNumber: string;
  vesselType: string;
  crewCount: number;
  homePort: string;
  mmsi: string;
  lat: number;
  lon: number;
  headingDeg: number;
  headingText: string;
  speedKnots: number;
  lastPingAt: string;
  distanceFromPortNM: number;
  status: FishermanStatus;
  /** The zone this boat is working toward, when it has declared one. */
  destinationZoneId: string | null;
  destinationZoneName: string | null;
  destinationLat: number | null;
  destinationLon: number | null;
  distanceToZoneNM: number | null;
  /** Recent breadcrumb, oldest first. */
  track: LatLon[];
}

export interface SarPredictionRequest {
  incidentId: string;
  targetName: string;
  targetType: "piw" | "craft" | "trawler" | "raft";
  lastKnownLat: number;
  lastKnownLon: number;
  elapsedHours: number;
}

export interface SarPrediction {
  datumLat: number;
  datumLon: number;
  driftDistanceNM: number;
  driftBearingDeg: number;
  driftBearingText: string;
  searchRadiusNM: number;
  searchAreaSqNM: number;
  windLeewayKnots: number;
  currentKnots: number;
  tideKnots: number;
  recommendedPattern: string;
  /** Positions between the last known point and the datum, oldest first. */
  driftPath: LatLon[];
}

/* ------------------------------------------------------------------ */
/* Transport                                                           */
/* ------------------------------------------------------------------ */

async function call<T>(path: string, init?: RequestInit, signal?: AbortSignal): Promise<T> {
  if (Date.now() < downUntil) throw new Error("SALTY backend is not reachable");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  if (signal) signal.addEventListener("abort", () => controller.abort());

  let responded = false;
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
      signal: controller.signal,
      cache: "no-store",
    });
    responded = true;
    downUntil = 0;
    if (!response.ok) throw new Error(`SALTY API ${response.status}`);
    return (await response.json()) as T;
  } catch (error) {
    if (!responded) downUntil = Date.now() + COOLDOWN_MS;
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : "SALTY backend unreachable";
}

/* ------------------------------------------------------------------ */
/* Fleet                                                               */
/* ------------------------------------------------------------------ */

/** Step back along the reciprocal of the current heading to sketch a track. */
function trailBehind(
  position: LatLon,
  headingDeg: number,
  legNM: number,
  steps: number
): LatLon[] {
  const back = ((headingDeg + 180) % 360) * (Math.PI / 180);
  const points: LatLon[] = [];
  for (let i = steps; i >= 1; i -= 1) {
    const nm = legNM * i;
    const dLat = (nm / 60) * Math.cos(back);
    const dLon =
      (nm / 60) * Math.sin(back) / Math.cos((position.lat * Math.PI) / 180);
    points.push({
      lat: Number((position.lat + dLat).toFixed(4)),
      lon: Number((position.lon + dLon).toFixed(4)),
    });
  }
  points.push({ lat: position.lat, lon: position.lon });
  return points;
}

function demoFleet(near: LatLon): TrackedFisherman[] {
  return activeVessels.map((vessel: Vessel, index) => {
    const position = { lat: vessel.currentLat, lon: vessel.currentLon };

    // Give each boat the nearest advisory zone as its declared destination.
    const zone = pfzZones
      .map((item) => ({ item, range: distanceNM(position, item) }))
      .sort((a, b) => a.range - b.range)[0];

    const status: FishermanStatus = vessel.sosActive
      ? "sos"
      : vessel.geofenceStatus !== "SAFE"
      ? "overdue"
      : vessel.sogKnots < 1.5
      ? "fishing"
      : index % 3 === 2
      ? "returning"
      : "underway";

    return {
      id: vessel.id,
      skipper: vessel.ownerName,
      boatName: vessel.name,
      regNumber: vessel.regNumber,
      vesselType: vessel.vesselType,
      crewCount: vessel.crewCount,
      homePort: vessel.homePort,
      mmsi: vessel.mmsi,
      lat: position.lat,
      lon: position.lon,
      headingDeg: vessel.cogDegrees,
      headingText: vessel.headingText,
      speedKnots: vessel.sogKnots,
      lastPingAt: vessel.lastPingTime,
      distanceFromPortNM: vessel.distanceFromPortNM,
      status,
      destinationZoneId: zone?.item.id ?? null,
      destinationZoneName: zone?.item.name ?? null,
      destinationLat: zone?.item.lat ?? null,
      destinationLon: zone?.item.lon ?? null,
      distanceToZoneNM: zone ? Number(zone.range.toFixed(1)) : null,
      track: trailBehind(position, vessel.cogDegrees, 1.4, 4),
    };
  });
}

export async function fetchTrackedFleet(
  near: LatLon,
  signal?: AbortSignal
): Promise<Sourced<TrackedFisherman[]>> {
  try {
    const data = await call<TrackedFisherman[]>(
      `/api/operations/fleet?lat=${near.lat}&lon=${near.lon}`,
      undefined,
      signal
    );
    return { data, source: "live" };
  } catch (error) {
    return { data: demoFleet(near), source: "demo", reason: describe(error) };
  }
}

/* ------------------------------------------------------------------ */
/* Search and rescue prediction                                        */
/* ------------------------------------------------------------------ */

/** Leeway multiplier by target, following the usual IAMSAR ordering. */
const LEEWAY: Record<SarPredictionRequest["targetType"], number> = {
  piw: 0.6,
  craft: 1,
  trawler: 0.85,
  raft: 1.4,
};

/**
 * On-device drift estimate.
 *
 * A straight-line set-and-drift from the last known position: a nominal
 * current plus a leeway component for the target type, integrated over the
 * elapsed time, with the search radius growing with the distance run. It is a
 * placeholder for the real model, and everything that displays it says so.
 */
function demoPrediction(request: SarPredictionRequest): SarPrediction {
  const factor = LEEWAY[request.targetType];
  const currentKnots = 0.65;
  const windLeewayKnots = Number((0.9 * factor).toFixed(2));
  const tideKnots = 0.25;

  const setKnots = currentKnots + windLeewayKnots;
  const driftDistanceNM = Number((setKnots * request.elapsedHours).toFixed(1));
  const driftBearingDeg = 62;

  const start: LatLon = { lat: request.lastKnownLat, lon: request.lastKnownLon };
  const radians = (driftBearingDeg * Math.PI) / 180;

  const along = (nm: number): LatLon => {
    const dLat = (nm / 60) * Math.cos(radians);
    const dLon = (nm / 60) * Math.sin(radians) / Math.cos((start.lat * Math.PI) / 180);
    return {
      lat: Number((start.lat + dLat).toFixed(4)),
      lon: Number((start.lon + dLon).toFixed(4)),
    };
  };

  const steps = 6;
  const driftPath: LatLon[] = [start];
  for (let i = 1; i <= steps; i += 1) {
    driftPath.push(along((driftDistanceNM * i) / steps));
  }
  const datum = driftPath[driftPath.length - 1];
  const searchRadiusNM = Number(Math.max(1.5, driftDistanceNM * 0.6).toFixed(1));

  return {
    datumLat: datum.lat,
    datumLon: datum.lon,
    driftDistanceNM,
    driftBearingDeg,
    driftBearingText: compassPoint(driftBearingDeg),
    searchRadiusNM,
    searchAreaSqNM: Number((Math.PI * searchRadiusNM ** 2).toFixed(1)),
    windLeewayKnots,
    currentKnots,
    tideKnots,
    recommendedPattern:
      driftDistanceNM > 8
        ? "Parallel track search, 2 NM spacing"
        : "Expanding square search from the datum",
    driftPath,
  };
}

export async function predictSearchZone(
  request: SarPredictionRequest,
  signal?: AbortSignal
): Promise<Sourced<SarPrediction>> {
  try {
    const data = await call<SarPrediction>(
      "/api/operations/sar/predict",
      { method: "POST", body: JSON.stringify(request) },
      signal
    );
    return { data, source: "live" };
  } catch (error) {
    return { data: demoPrediction(request), source: "demo", reason: describe(error) };
  }
}

/** Bearing helper re-exported so callers do not need two imports. */
export { bearingDeg, compassPoint, distanceNM };
