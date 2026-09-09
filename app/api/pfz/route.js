import { NextResponse } from "next/server";

/**
 * Today's INCOIS Potential Fishing Zone advisories near a position.
 *
 * Discovered from the official PFZ WebGIS at
 * https://www.incois.gov.in/DataInfo/MFASPFZ/index.html by reading the requests
 * that application makes. It draws these as WMS tiles; the same GeoServer also
 * answers WFS, which returns the advisory geometry as GeoJSON rather than a
 * picture. Verified against the live server 2026-09-08: 106 advisories that
 * day nationally, 8 inside the Visakhapatnam box.
 *
 * This lives here rather than in the Python service for the same reason the
 * INCOIS forecast proxies do: GeoServer sends no Access-Control-Allow-Origin,
 * so the browser cannot call it, and the fisherman console should not need a
 * second process running to show a fishing zone.
 *
 * Note the workspace prefix. WFS wants PFZ_EEZ:indiaeez / PFZ_Automation:pfzlines;
 * asking WFS for a prefix the WMS request uses returns "Feature type unknown".
 */

const WFS = "https://www.incois.gov.in/geoserver/PFZ_Automation/ows";
const LAYER = "PFZ_Automation:pfzlines";
const TIMEOUT_MS = 20000;
const EARTH_RADIUS_NM = 3440.065;

/** INCOIS sector ids (SECTORBOUN), from PFZ_Sectors:sector_new. */
const SECTOR_NAMES = {
  1: "Gujarat",
  2: "Daman & Diu",
  3: "Maharashtra",
  4: "Goa",
  5: "Karnataka",
  6: "Kerala",
  7: "Tamil Nadu",
  8: "Puducherry",
  9: "Andhra Pradesh (south)",
  10: "Andhra Pradesh",
  11: "Odisha",
  12: "West Bengal",
};

const COMPASS = [
  "north", "north-east", "east", "south-east",
  "south", "south-west", "west", "north-west",
];

function distanceNM(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const p1 = toRad(lat1);
  const p2 = toRad(lat2);
  const dPhi = p2 - p1;
  const dLambda = toRad(lon2 - lon1);
  const a =
    Math.sin(dPhi / 2) ** 2 +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dLambda / 2) ** 2;
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

/** Flatten a (Multi)LineString to [lat, lon] pairs. GeoJSON stores lon first. */
function vertices(geometry) {
  const parts =
    geometry?.type === "MultiLineString"
      ? geometry.coordinates || []
      : [geometry?.coordinates || []];
  const points = [];
  for (const part of parts) {
    for (const pair of part || []) {
      if (Array.isArray(pair) && pair.length >= 2) {
        points.push([Number(pair[1]), Number(pair[0])]);
      }
    }
  }
  return points;
}

/** INCOIS stamps the advisory with a year and a day-of-year, not a date. */
function fromJulian(year, day) {
  if (!Number.isFinite(year) || !Number.isFinite(day)) return null;
  const date = new Date(Date.UTC(year, 0, 1));
  date.setUTCDate(day);
  return date.toISOString().slice(0, 10);
}

export async function GET(request) {
  const params = request.nextUrl.searchParams;
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));
  const box = Number(params.get("box") || 1.5);
  const limit = Number(params.get("limit") || 6);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "lat and lon are required" }, { status: 400 });
  }

  const upstream = new URL(WFS);
  upstream.searchParams.set("service", "WFS");
  upstream.searchParams.set("version", "1.0.0");
  upstream.searchParams.set("request", "GetFeature");
  upstream.searchParams.set("typeName", LAYER);
  upstream.searchParams.set("outputFormat", "application/json");
  upstream.searchParams.set(
    "BBOX",
    `${lon - box},${lat - box},${lon + box},${lat + box},EPSG:4326`
  );

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let collection;
  try {
    const response = await fetch(upstream, {
      cache: "no-store",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    const body = await response.text();
    // GeoServer answers a bad request with an XML ServiceException, and returns
    // an HTML 503 page when it is being hammered. Neither is a fishing zone.
    if (!body.trimStart().startsWith("{")) {
      return NextResponse.json(
        { error: "INCOIS did not return advisory data", status: response.status },
        { status: 502 }
      );
    }
    collection = JSON.parse(body);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error?.name === "AbortError"
            ? "INCOIS did not answer in time"
            : "Unable to reach the INCOIS PFZ service",
      },
      { status: 502 }
    );
  } finally {
    clearTimeout(timer);
  }

  const today = new Date().toISOString().slice(0, 10);

  const zones = (collection.features || [])
    .map((feature) => {
      const properties = feature.properties || {};
      const points = vertices(feature.geometry);
      if (points.length === 0) return null;

      let nearest = points[0];
      let nearestRange = Infinity;
      for (const point of points) {
        const range = distanceNM(lat, lon, point[0], point[1]);
        if (range < nearestRange) {
          nearestRange = range;
          nearest = point;
        }
      }
      const heading = bearingDeg(lat, lon, nearest[0], nearest[1]);
      const issuedFor = fromJulian(
        Number(properties.Year),
        Number(properties.Julian_day)
      );
      const sector = SECTOR_NAMES[properties.SECTORBOUN] || null;
      const serial = properties.Sno || "?";

      return {
        id: String(properties.UID || `pfz-${serial}`),
        name: `PFZ advisory ${serial}${sector ? ` — ${sector}` : ""}`,
        lat: Number(nearest[0].toFixed(4)),
        lon: Number(nearest[1].toFixed(4)),
        distanceNM: Number(nearestRange.toFixed(1)),
        bearingDeg: Math.round(heading),
        bearing: COMPASS[Math.floor(((heading + 22.5) % 360) / 45)],
        lengthKm: Number(Number(properties.Length || 0).toFixed(1)),
        issuedFor,
        isToday: issuedFor ? issuedFor === today : null,
        sector,
        // INCOIS publishes a line, a length, a sector and a date. It does not
        // publish a radius, a depth, a species list or a suitability score, so
        // these stay null rather than being filled with something plausible.
        radiusNM: null,
        suitabilityScore: null,
        suitabilityText: null,
        depthMeters: null,
        referencePort: null,
        primarySpecies: [],
        geometry: points.map(([a, b]) => [
          Number(a.toFixed(5)),
          Number(b.toFixed(5)),
        ]),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.distanceNM - b.distanceNM)
    .slice(0, limit);

  return NextResponse.json(zones, { headers: { "Cache-Control": "no-store" } });
}
