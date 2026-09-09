import { NextResponse } from "next/server";

/**
 * Live sea state at one position, straight from the INCOIS Ocean State Forecast.
 *
 * This card used to show bundled sample numbers because the endpoint it asked
 * for, /api/fisherman/conditions on the Python service, does not exist any
 * more. The data itself was never the problem: INCOIS publishes the forecast
 * over THREDDS NCSS, which answers a single point as CSV, and five of the six
 * tiles on that card come straight out of it.
 *
 * Two things about this service are not guessable and were found by reading it:
 *
 *   1. The dataset FILENAME changes every forecast cycle, and the only place
 *      it is published is an inline `var rsmc_combined_ww3 = "..."` in the
 *      official OSF page. So the page is scraped for the names first. Guessing
 *      a filename gets a 404 the moment INCOIS runs the next cycle.
 *   2. The documented `time=present` is rejected by this THREDDS build with a
 *      bare HTTP 400 and an HTML error page. OMITTING the time parameter
 *      returns the current step, which is what this does.
 *
 * A coastal request often lands on a land cell, where the model holds no value
 * and NCSS returns NaN. Rather than report nothing, the request steps seaward
 * in rings and reports the coordinate that actually produced the reading, so
 * the answer says where it came from.
 *
 * Visibility is not in the ocean model at all — it is air, not water — so that
 * one tile comes from Open-Meteo and is labelled separately.
 */

const OSF_PAGE = "https://www.incois.gov.in/oceanservices/osfforecast.jsp";
const NCSS_BASE = "https://www.incois.gov.in/thredds/ncss/grid/osf";
const AIR = "https://api.open-meteo.com/v1/forecast";
const TIMEOUT_MS = 20000;
const MS_TO_KNOTS = 1.94384;

/** Dataset directory, the OSF page variable naming its file, and its variables. */
const DATASETS = {
  ww3: { directory: "ww3", pageVar: "rsmc_combined_ww3", variables: ["HS", "PHS01", "T02", "UWND", "VWND"] },
  currents: { directory: "currents", pageVar: "currentsFile2", variables: ["CURRENT"] },
  sst: { directory: "winds", pageVar: "sstnio", variables: ["SST"] },
};

const COMPASS_16 = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
];

function compass16(degrees) {
  if (degrees == null) return null;
  return COMPASS_16[Math.round(((degrees % 360) + 360) % 360 / 22.5) % 16];
}

/**
 * Rings of offsets, tried outward until a cell has data. The grid is about
 * 0.1 degrees, so these reach roughly 11, 22 and 44 km offshore. Each ring is
 * fetched in parallel, so a point well inland still costs four round trips
 * rather than twenty-five.
 */
const RING_STEPS = [0.1, 0.2, 0.4];
const RING_DIRECTIONS = [
  [0, 1], [-1, 1], [-1, 0], [0, -1], [1, 0], [1, 1], [-1, -1], [1, -1],
];
const RINGS = [
  [[0, 0]],
  ...RING_STEPS.map((step) => RING_DIRECTIONS.map(([dy, dx]) => [dy * step, dx * step])),
];

async function getText(url, revalidate) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "SALTY/1.0", Accept: "*/*" },
      next: { revalidate },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

/** Today's OSF filenames, read from the official page's inline JavaScript. */
async function discoverFiles() {
  const html = await getText(OSF_PAGE, 1800);
  const files = {};
  for (const name of ["sstnio", "currentsFile2", "rsmc_combined_ww3", "mldnio"]) {
    const match = html.match(new RegExp(`var\\s+${name}\\s*=\\s*["']([^"']+)`, "i"));
    if (match) files[name] = match[1];
  }
  if (!Object.keys(files).length) {
    throw new Error("The OSF page did not expose the expected dataset variables");
  }
  return files;
}

/** `HS[unit="m"]` -> `HS`. */
function cleanColumn(name) {
  return name.replace(/\[.*?\]/g, "").trim();
}

/** CSV rows to objects. NaN becomes null: it means land, or outside the grid. */
function parseNcssCsv(body) {
  const lines = body.trim().split(/\r?\n/);
  if (!lines.length) return [];
  const header = lines[0].split(",").map(cleanColumn);
  return lines.slice(1).filter(Boolean).map((line) => {
    const cells = line.split(",");
    const row = {};
    header.forEach((column, i) => {
      const text = (cells[i] || "").trim();
      if (column === "time" || column === "station") {
        row[column] = text;
        return;
      }
      const number = Number(text);
      row[column] = text === "" || Number.isNaN(number) ? null : number;
    });
    return row;
  });
}

function ncssUrl(key, files, lat, lon) {
  const definition = DATASETS[key];
  const file = files[definition.pageVar];
  if (!file) throw new Error(`The OSF page did not name the ${key} dataset`);
  const query = new URLSearchParams({
    var: definition.variables.join(","),
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    accept: "csv",
  });
  // No time parameter at all means "the current step".
  return `${NCSS_BASE}/${definition.directory}/${file}?${query}`;
}

/** First cell in this dataset that holds a value, stepping seaward by rings. */
async function readDataset(key, files, lat, lon) {
  const wanted = DATASETS[key].variables;
  for (const ring of RINGS) {
    const attempts = await Promise.all(
      ring.map(async ([dLat, dLon]) => {
        try {
          const body = await getText(ncssUrl(key, files, lat + dLat, lon + dLon), 900);
          const row = parseNcssCsv(body)[0];
          if (!row) return null;
          const usable = wanted.some((name) => row[name] != null);
          return usable ? { row, lat: lat + dLat, lon: lon + dLon } : null;
        } catch {
          return null;
        }
      })
    );
    const hit = attempts.find(Boolean);
    if (hit) return hit;
  }
  return null;
}

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "lat and lon are required" }, { status: 400 });
  }

  let files;
  try {
    files = await discoverFiles();
  } catch (error) {
    return NextResponse.json(
      { error: `Could not read the INCOIS forecast catalogue: ${error.message}` },
      { status: 504 }
    );
  }

  const [ww3, currents, sst, air] = await Promise.all([
    readDataset("ww3", files, lat, lon),
    readDataset("currents", files, lat, lon),
    readDataset("sst", files, lat, lon),
    // Visibility is air, not ocean, and INCOIS does not model it.
    (async () => {
      try {
        const query = new URLSearchParams({
          latitude: lat.toFixed(4),
          longitude: lon.toFixed(4),
          current: "visibility,temperature_2m,relative_humidity_2m,surface_pressure",
          timezone: "auto",
        });
        const body = await getText(`${AIR}?${query}`, 900);
        return JSON.parse(body).current || null;
      } catch {
        return null;
      }
    })(),
  ]);

  const unavailable = [];
  if (!ww3) unavailable.push("waveHeight", "swellHeight", "wavePeriod", "windSpeed");
  if (!currents) unavailable.push("currentSpeed");
  if (!sst) unavailable.push("seaSurfaceTemperature");
  if (!air) unavailable.push("visibility");

  if (!ww3 && !currents && !sst) {
    return NextResponse.json(
      {
        error: "The INCOIS forecast returned no values at or near this position.",
        unavailable,
      },
      { status: 504 }
    );
  }

  const row = ww3?.row || {};
  const u = row.UWND;
  const v = row.VWND;
  const windMs = u != null && v != null ? Math.hypot(u, v) : null;
  // Meteorological convention: the direction the wind comes FROM.
  const windDeg =
    u != null && v != null
      ? ((270 - (Math.atan2(v, u) * 180) / Math.PI) % 360 + 360) % 360
      : null;

  const round = (value, digits) =>
    value == null ? null : Number(value.toFixed(digits));

  return NextResponse.json({
    source: "INCOIS Ocean State Forecast (THREDDS NetCDF Subset Service)",
    note:
      "Live INCOIS forecast at the nearest sea cell. Visibility, air temperature " +
      "and pressure are Open-Meteo: the INCOIS ocean model does not carry them.",
    requested: { latitude: lat, longitude: lon },
    // Where the reading actually came from, which is not always where it was
    // asked for — a harbour coordinate sits on a land cell.
    readAt: ww3 ? { latitude: round(ww3.lat, 4), longitude: round(ww3.lon, 4) } : null,
    observedAt: row.time || null,

    sst: round(sst?.row?.SST, 1),
    waveHeight: round(row.HS, 1),
    wavePeriod: round(row.T02, 1),
    swellHeight: round(row.PHS01, 1),
    currentSpeed: round(currents?.row?.CURRENT, 2),
    // The INCOIS current product publishes speed only, so there is no
    // direction to report and none is invented.
    currentDirection: null,
    windSpeed: round(windMs == null ? null : windMs * MS_TO_KNOTS, 1),
    windSpeedMs: round(windMs, 1),
    windDirection: compass16(windDeg),
    windDirectionDeg: round(windDeg, 0),

    visibility: air?.visibility == null ? null : Math.round(air.visibility / 1000),
    airTemp: air?.temperature_2m ?? null,
    humidity: air?.relative_humidity_2m ?? null,
    pressure: air?.surface_pressure ?? null,

    unavailable,
  });
}
