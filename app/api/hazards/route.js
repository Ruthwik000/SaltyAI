import { NextResponse } from "next/server";

/**
 * What to keep clear of around a position.
 *
 * Two sources, both INCOIS, both fetched here rather than from the browser
 * because neither sends an Access-Control-Allow-Origin header:
 *
 *   1. High Wave Alerts and Swell Surge Advisories, from the INCOIS mobile
 *      REST API that its own advisory page (site/services/hwa.jsp) calls.
 *      Verified live 2026-09-08: 14 high-wave alerts and 64 swell-surge
 *      advisories nationally. Note that HWAJson and SSAJson arrive as JSON
 *      *strings inside* the JSON and need a second parse.
 *
 *   2. The India EEZ boundary from GeoServer WFS. Verified live 2026-09-08:
 *      19 MultiLineString features, 1005 vertices, about 29 KB. The WFS
 *      prefix is PFZ_EEZ:indiaeez even though the WMS request for the same
 *      layer uses PFZ_Automation:indiaeez, and asking WFS for the WMS
 *      spelling returns an empty collection rather than an error. A BBOX
 *      filter also comes back empty, so the whole layer is fetched.
 *
 * WHAT THIS IS NOT: India publishes no machine-readable feed of gazetted
 * restricted or no-fishing areas, so those are not covered and the response
 * says so. "Nothing found" and "could not check" are also kept apart — the
 * response carries which sources actually answered, because an empty hazard
 * list from three dead services would otherwise read as open water.
 */

const ALERTS = "https://sarat.incois.gov.in/incoismobileappdata/rest/incois/hwassalatestdata";
const EEZ_WFS = "https://www.incois.gov.in/geoserver/PFZ_EEZ/ows";
const EEZ_LAYER = "PFZ_EEZ:indiaeez";
const TIMEOUT_MS = 20000;
const EARTH_RADIUS_NM = 3440.065;

const SEVERITY = { red: 4, orange: 3, yellow: 2, green: 1 };
const COMPASS = [
  "north", "north-east", "east", "south-east",
  "south", "south-west", "west", "north-west",
];

function distanceNM(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const p1 = toRad(lat1);
  const p2 = toRad(lat2);
  const a =
    Math.sin((p2 - p1) / 2) ** 2 +
    Math.cos(p1) * Math.cos(p2) * Math.sin(toRad(lon2 - lon1) / 2) ** 2;
  return 2 * EARTH_RADIUS_NM * Math.asin(Math.min(1, Math.sqrt(a)));
}

function bearingDeg(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const p1 = toRad(lat1);
  const p2 = toRad(lat2);
  const dLambda = toRad(lon2 - lon1);
  const y = Math.sin(dLambda) * Math.cos(p2);
  const x =
    Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dLambda);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function compass(degrees) {
  return COMPASS[Math.floor(((degrees + 22.5) % 360) / 45)];
}

async function getJson(url, revalidate) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json", "User-Agent": "SALTY/1.0" },
      next: { revalidate },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

/** HWAJson and SSAJson are JSON strings inside the JSON. Parse twice. */
function inner(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normaliseAlert(row, kind) {
  const colour = String(row.Color || row.Colour || "").trim();
  return {
    kind,
    alert: String(row.Alert || "").trim(),
    colour,
    severity: SEVERITY[colour.toLowerCase()] || 0,
    district: String(row.District || "").trim(),
    state: String(row.STATE || "").trim(),
    issuedOn: String(row["Issue Date"] || "").trim(),
    message: String(row.Message || "").trim(),
  };
}

/** Flatten a (Multi)LineString into [lat, lon]. GeoJSON stores lon,lat. */
function vertices(geometry) {
  const kind = geometry?.type;
  const raw = geometry?.coordinates || [];
  const parts = kind === "MultiLineString" ? raw : [raw];
  const points = [];
  for (const part of parts) {
    for (const pair of part || []) {
      if (Array.isArray(pair) && typeof pair[0] === "number") {
        points.push([pair[1], pair[0]]);
      }
    }
  }
  return points;
}

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));
  const place = (params.get("place") || "").trim().toLowerCase();
  const state = (params.get("state") || "").trim().toLowerCase();

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "lat and lon are required" }, { status: 400 });
  }

  const hazards = [];
  const checked = [];
  const notChecked = [];
  const result = {
    note:
      "Official INCOIS advisories and the published EEZ boundary. India has no " +
      "machine-readable feed of gazetted restricted or no-fishing areas, so those " +
      "are NOT covered here — check the state fisheries notice and the Coast Guard.",
    position: { latitude: lat, longitude: lon },
  };

  /* ---- INCOIS High Wave / Swell Surge advisories ---- */
  try {
    const payload = await getJson(ALERTS, 900);
    const all = [
      ...inner(payload.HWAJson).map((row) => normaliseAlert(row, "High wave")),
      ...inner(payload.SSAJson).map((row) => normaliseAlert(row, "Swell surge")),
    ];
    const matched = all
      .filter((alert) => {
        const district = alert.district.toLowerCase();
        const alertState = alert.state.toLowerCase();
        if (place && district && (district.includes(place) || place.includes(district))) {
          return true;
        }
        return Boolean(state) && alertState.includes(state);
      })
      .sort((a, b) => b.severity - a.severity);

    for (const alert of matched) {
      hazards.push({
        kind: alert.kind.toLowerCase(),
        severity: alert.colour.toLowerCase() || null,
        detail: alert.message || alert.alert,
        area: alert.district,
        issuedOn: alert.issuedOn,
        source: `INCOIS ${alert.kind}`,
      });
    }

    result.advisories = {
      matched: matched.length,
      totalNationwide: all.length,
      issuedFor: {
        highWave: payload.LatestHWADate || null,
        swellSurge: payload.LatestSSADate || null,
      },
    };
    checked.push("INCOIS advisories");
  } catch (error) {
    result.advisories = { status: "NOT AVAILABLE", reason: String(error.message || error) };
    notChecked.push("INCOIS advisories");
  }

  /* ---- India EEZ boundary ---- */
  try {
    const query = new URLSearchParams({
      service: "WFS",
      version: "1.0.0",
      request: "GetFeature",
      typeName: EEZ_LAYER,
      outputFormat: "application/json",
    });
    const collection = await getJson(`${EEZ_WFS}?${query}`, 86400);
    const points = (collection.features || []).flatMap((f) => vertices(f.geometry));
    if (!points.length) throw new Error("The EEZ layer came back empty");

    let nearest = points[0];
    let best = Infinity;
    for (const point of points) {
      const gap = distanceNM(lat, lon, point[0], point[1]);
      if (gap < best) {
        best = gap;
        nearest = point;
      }
    }
    const bearing = bearingDeg(lat, lon, nearest[0], nearest[1]);
    const km = Number((best * 1.852).toFixed(1));
    const proximity =
      best < 10 ? "at the boundary" : best < 30 ? "close to the boundary" : "well inside Indian waters";

    result.eez = {
      distanceNM: Number(best.toFixed(1)),
      distanceKm: km,
      bearingDegrees: Math.round(bearing),
      bearingText: compass(bearing),
      proximity,
      nearestPoint: {
        latitude: Number(nearest[0].toFixed(4)),
        longitude: Number(nearest[1].toFixed(4)),
      },
      note:
        "Distance to the nearest vertex of a coarse published boundary line. " +
        "Approximate, and never a legal position fix.",
    };
    if (best < 30) {
      hazards.push({
        kind: "maritime boundary",
        severity: best < 10 ? "orange" : "yellow",
        detail: `The edge of Indian waters is about ${km} kilometres to the ${compass(bearing)}. Do not cross it.`,
        area: "India EEZ boundary",
        source: "INCOIS GeoServer",
      });
    }
    checked.push("EEZ boundary");
  } catch (error) {
    result.eez = { status: "NOT AVAILABLE", reason: String(error.message || error) };
    notChecked.push("EEZ boundary");
  }

  // Nothing answered: say that, rather than handing back an empty list that
  // reads as open water.
  if (!checked.length) {
    return NextResponse.json(
      {
        ...result,
        error: `Could not reach ${notChecked.join(" or ")}, so this water could not be checked.`,
        hazards: [],
        sourcesChecked: [],
        sourcesNotChecked: notChecked,
      },
      { status: 504 }
    );
  }

  return NextResponse.json({
    ...result,
    hazards,
    hazardCount: hazards.length,
    sourcesChecked: checked,
    sourcesNotChecked: notChecked,
  });
}
