import { NextResponse } from "next/server";

/**
 * Satellite chlorophyll and sea surface temperature at a point, with recent
 * history — from NOAA CoastWatch ERDDAP.
 *
 * Why NOAA and not INCOIS. INCOIS runs its own ERDDAP and it was the obvious
 * place to look, but its ocean-colour holdings have stopped. Checked against
 * erddap.incois.gov.in/erddap/tabledap/allDatasets.json on 2026-09-08:
 *
 *   IRS_chlorophyll_datasets      IRS P4 OCM chlorophyll   ends 2006-03-21
 *   incois_oceansat2_datasets     Oceansat-2 OCM           ends 2020-05-01
 *   NOAA_AVHRR_AMSR_datasets      Daily OI SST             ends 2011-10-04
 *   incois_argo_sst_weekly        ARGO SST weekly          ends 2010-12-29
 *
 * The newest chlorophyll pixel INCOIS serves is twenty years old; only the
 * ARGO grids still update. Nothing there can answer "where is the water
 * productive today". NOAA CoastWatch can, is free and keyless, and speaks the
 * same ERDDAP grammar. Verified live off Visakhapatnam on 2026-09-08:
 *
 *   noaacwNPPN20VIIRSDINEOFDaily     chlor_a       2026-09-05  0.24-0.98 mg/m3
 *   noaacrwsstDaily                  analysed_sst  2026-09-06  29.4 degC
 *   noaacrwsstanomalybaselineDaily   anomaly       2026-09-01  -0.26 degC
 *
 * Three traps in these grids, all found by querying rather than assuming, and
 * all handled below:
 *   - chlorophyll carries a fourth axis, altitude, and the query fails without it;
 *   - chlorophyll and the anomaly grid run latitude NORTH to SOUTH, so their
 *     range must be written high:low, while the SST grid runs south to north;
 *   - the grids are 9 km, 5 km and 5 km, so their cells never coincide.
 *
 * The gap-filled (DINEOF) chlorophyll product is deliberate. The raw swath is
 * full of cloud holes and over the Bay of Bengal in monsoon it answers "no
 * data" on most days someone would ask.
 *
 * This is NOT the INCOIS PFZ advisory. PFZ is the official product and stays
 * the thing to quote; this is the raw satellite signal behind that kind of
 * advisory. Every response says which dataset each number came from.
 */

const BASE = "https://coastwatch.noaa.gov/erddap/griddap";
/* Per REQUEST, not per route. Three datasets sharing one budget meant the
   slowest killed the other two and the section drew nothing at all. */
const TIMEOUT_MS = 28000;
/* Satellite dailies land once a day, and ERDDAP is not quick. Cache in the
   module rather than through Next's fetch cache: that cache and an abort
   signal do not combine, and losing the signal is what let a slow griddap
   request hang the whole route. */
const CACHE_TTL_MS = 3 * 3600 * 1000;
const cache = new Map();

const CHLOROPHYLL = {
  dataset: "noaacwNPPN20VIIRSDINEOFDaily",
  variable: "chlor_a",
  altitude: true,
  latDescending: true,
  unit: "mg/m3",
  label: "NOAA S-NPP/NOAA-20 VIIRS gap-filled chlorophyll-a, 9 km daily",
};
const SST = {
  dataset: "noaacrwsstDaily",
  variable: "analysed_sst",
  altitude: false,
  latDescending: false,
  unit: "degC",
  label: "NOAA Coral Reef Watch CoralTemp sea surface temperature, 5 km daily",
};
const SST_ANOMALY = {
  dataset: "noaacrwsstanomalybaselineDaily",
  variable: "sea_surface_temperature_anomaly",
  altitude: false,
  latDescending: true,
  unit: "degC",
  label: "NOAA Coral Reef Watch SST anomaly against the 1985-2012 baseline",
};

/* Bands ocean-colour literature uses for case-1 tropical shelf water. They are
   descriptive, not a catch prediction. */
const BANDS = [
  [3.0, "very high"],
  [1.0, "high"],
  [0.3, "moderate"],
  [0.1, "low"],
  [0.0, "very low"],
];

function band(value) {
  if (value == null) return null;
  for (const [threshold, name] of BANDS) if (value >= threshold) return name;
  return "very low";
}

const round = (value, digits) =>
  value == null || Number.isNaN(Number(value))
    ? null
    : Number(Number(value).toFixed(digits));

/** Latitude ranges must be written in the direction the grid runs. */
function span(low, high, descending) {
  const [first, second] = descending ? [high, low] : [low, high];
  return `(${first.toFixed(4)}):(${second.toFixed(4)})`;
}

async function grid(spec, latLow, latHigh, lonLow, lonHigh, when) {
  let query = `${spec.variable}[${when}]`;
  if (spec.altitude) query += "[(0.0)]";
  query += `[${span(latLow, latHigh, spec.latDescending)}]`;
  query += `[${span(lonLow, lonHigh, false)}]`;
  const url =
    `${BASE}/${spec.dataset}.json?` + query.replace(/\[/g, "%5B").replace(/\]/g, "%5D");

  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.rows;

  // Its own controller, so one slow dataset cannot abort its siblings.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response;
  try {
    response = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: { Accept: "application/json", "User-Agent": "SALTY marine console" },
    });
  } catch (error) {
    throw new Error(
      error?.name === "AbortError"
        ? `${spec.dataset} did not answer within ${TIMEOUT_MS / 1000}s`
        : `${spec.dataset} unreachable: ${error?.message || "unknown"}`
    );
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) {
    throw new Error(`${spec.dataset} returned HTTP ${response.status}`);
  }
  const payload = await response.json();
  const table = payload?.table || {};
  const columns = table.columnNames || [];
  const iTime = columns.indexOf("time");
  const iLat = columns.indexOf("latitude");
  const iLon = columns.indexOf("longitude");
  const iValue = columns.indexOf(spec.variable);
  if (iTime < 0 || iLat < 0 || iLon < 0 || iValue < 0) {
    throw new Error(`${spec.dataset} returned an unexpected shape`);
  }
  const rows = (table.rows || []).map((row) => ({
    time: row[iTime],
    latitude: Number(row[iLat]),
    longitude: Number(row[iLon]),
    value: row[iValue] == null ? null : Number(row[iValue]),
  }));
  cache.set(url, { at: Date.now(), rows });
  return rows;
}

/** Closest cell that actually carries a value — the grids differ in resolution. */
function nearest(rows, lat, lon) {
  let best = null;
  let bestGap = null;
  for (const row of rows) {
    if (row.value == null) continue;
    const gap = (row.latitude - lat) ** 2 + (row.longitude - lon) ** 2;
    if (bestGap == null || gap < bestGap) {
      best = row;
      bestGap = gap;
    }
  }
  return best;
}

/**
 * One value per day.
 *
 * A small lat/lon box on a 9 km grid is two cells by two, so a 60-day request
 * comes back as roughly 240 rows, not 60. Flattened into a series that reads
 * as four dates of "recent history" with every date repeated. Average the
 * cells per day instead, and drop days where every cell was cloud.
 */
function daily(rows) {
  const buckets = new Map();
  for (const row of rows) {
    if (row.value == null) continue;
    const date = String(row.time).slice(0, 10);
    if (!buckets.has(date)) buckets.set(date, []);
    buckets.get(date).push(row.value);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, values]) => ({
      date,
      value: round(values.reduce((sum, v) => sum + v, 0) / values.length, 3),
    }));
}

const mean = (values) =>
  values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null;

/**
 * Compare the mean of the first third with the mean of the last third.
 *
 * A least-squares slope over a cloud-affected daily series is dominated by the
 * noisiest days. Thirds are blunt, but they say the same thing and they can be
 * explained to the person reading the answer.
 */
function trend(series, absoluteThreshold) {
  const values = series.map((entry) => entry.value).filter((v) => v != null);
  if (values.length < 6) {
    return { status: "NOT AVAILABLE", reason: "too few clear days" };
  }
  const third = Math.max(2, Math.floor(values.length / 3));
  const earlier = mean(values.slice(0, third));
  const later = mean(values.slice(-third));
  if (earlier == null || earlier === 0 || later == null) {
    return { status: "NOT AVAILABLE", reason: "too few clear days" };
  }
  const changePercent = ((later - earlier) / Math.abs(earlier)) * 100;

  // Percent is the right test for chlorophyll, which moves over an order of
  // magnitude. It is the wrong test for sea temperature: half a degree is a
  // real change to a shoal and only about 1.5% of 29 degC, so temperature is
  // judged on the absolute shift instead.
  let direction;
  if (absoluteThreshold != null) {
    const shift = later - earlier;
    direction =
      shift > absoluteThreshold ? "rising" : shift < -absoluteThreshold ? "falling" : "about the same";
  } else {
    direction = changePercent > 15 ? "rising" : changePercent < -15 ? "falling" : "about the same";
  }
  return {
    earlierMean: round(earlier, 3),
    recentMean: round(later, 3),
    changePercent: round(changePercent, 1),
    absoluteChange: round(later - earlier, 3),
    direction,
    daysCompared: third,
  };
}

export async function GET(request) {
  const params = request.nextUrl.searchParams;
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));
  /* 30 days by default, not 60. A 60-day DINEOF request is four times the
     work for a trend that reads the same, and it was the request that timed
     out. ?days= still opens it up for anyone who wants the longer window. */
  const days = Math.max(14, Math.min(Number(params.get("days") || 30), 180));

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "lat and lon are required" }, { status: 400 });
  }

  const from = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const when = `(${from}):(last)`;

  // Settled, not all-or-nothing: chlorophyll arriving while SST times out is a
  // useful answer, and a blank section is not.
  const [chlorophyllResult, sstResult, anomalyResult] = await Promise.allSettled([
    grid(CHLOROPHYLL, lat - 0.05, lat + 0.05, lon - 0.05, lon + 0.05, when),
    /* Wider box than chlorophyll's. CoralTemp is a 0.05 deg grid, so a
       +/-0.03 request spans barely one cell and lands between cell centres
       often enough to come back empty — which is how sea temperature ended up
       blank while chlorophyll drew fine. +/-0.08 always covers at least three
       cells; `nearest` then picks the closest one that carries a value. */
    grid(SST, lat - 0.08, lat + 0.08, lon - 0.08, lon + 0.08, when),
    grid(SST_ANOMALY, lat - 0.08, lat + 0.08, lon - 0.08, lon + 0.08, "(last)"),
  ]);

  const rowsOf = (result) => (result.status === "fulfilled" ? result.value : []);
  const failure = (result) =>
    result.status === "rejected" ? result.reason?.message || "request failed" : null;

  const chlorophyllRows = rowsOf(chlorophyllResult);
  const sstRows = rowsOf(sstResult);
  const anomalyRows = rowsOf(anomalyResult);

  if (chlorophyllRows.length === 0 && sstRows.length === 0 && anomalyRows.length === 0) {
    return NextResponse.json(
      {
        error: "NOAA CoastWatch returned nothing for this position",
        detail: [failure(chlorophyllResult), failure(sstResult), failure(anomalyResult)]
          .filter(Boolean)
          .join(" · "),
      },
      { status: 502 }
    );
  }

  const chlorophyllSeries = daily(chlorophyllRows);
  const sstSeries = daily(sstRows);
  const latestChlorophyll = chlorophyllSeries[chlorophyllSeries.length - 1] || null;
  const latestSst = sstSeries[sstSeries.length - 1] || null;
  const anomalyCell = nearest(anomalyRows, lat, lon);
  const nearestCell = nearest(chlorophyllRows, lat, lon) || nearest(sstRows, lat, lon);

  return NextResponse.json(
    {
      source: "NOAA CoastWatch satellite (VIIRS chlorophyll, CoralTemp SST)",
      note:
        "Raw satellite chlorophyll and sea surface temperature from NOAA CoastWatch — not an INCOIS product and not a PFZ advisory. INCOIS stopped serving chlorophyll in 2020. Chlorophyll is how much food the water carries; it is not a count of fish.",
      position: { latitude: lat, longitude: lon },
      readAt: nearestCell
        ? { latitude: round(nearestCell.latitude, 4), longitude: round(nearestCell.longitude, 4) }
        : null,
      windowDays: days,
      chlorophyll: {
        dataset: CHLOROPHYLL.dataset,
        label: CHLOROPHYLL.label,
        unit: CHLOROPHYLL.unit,
        latest: latestChlorophyll?.value ?? null,
        observedOn: latestChlorophyll?.date ?? null,
        band: band(latestChlorophyll?.value),
        trend: trend(chlorophyllSeries),
        series: chlorophyllSeries.slice(-30),
        error: failure(chlorophyllResult),
      },
      seaSurfaceTemperature: {
        dataset: SST.dataset,
        label: SST.label,
        unit: SST.unit,
        latest: latestSst?.value ?? null,
        observedOn: latestSst?.date ?? null,
        // Half a degree matters to a shoal and is only ~1.5% of 29 degC.
        trend: trend(sstSeries, 0.3),
        series: sstSeries.slice(-30),
        error: failure(sstResult),
      },
      anomaly: {
        dataset: SST_ANOMALY.dataset,
        label: SST_ANOMALY.label,
        unit: SST_ANOMALY.unit,
        value: anomalyCell ? round(anomalyCell.value, 2) : null,
        observedOn: anomalyCell ? String(anomalyCell.time).slice(0, 10) : null,
        error: failure(anomalyResult),
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
