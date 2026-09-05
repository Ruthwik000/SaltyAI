/**
 * Research analysis layer.
 *
 * Asks the SALTY backend for a dataset's series and, when it cannot be reached,
 * returns a deterministic DEMO series so the console can be built and shown.
 * The demo series is never presented as measurement: every result carries
 * `source`, and the UI badges and captions it accordingly. This is the rule the
 * project handoff sets out — no silent fallback to generated marine values.
 *
 * Backend contract:
 *   POST /api/research/series -> ResearchSeries
 *        { datasetId, variable, region, start, end }
 */

const API_BASE = process.env.NEXT_PUBLIC_SALTY_API_URL || "http://127.0.0.1:8010";
const REQUEST_TIMEOUT_MS = 8000;

/** Same breaker idea as the fisherman layer: stop hammering a dead backend. */
const COOLDOWN_MS = 30_000;
let downUntil = 0;

/* ------------------------------------------------------------------ */
/* Units                                                               */
/* ------------------------------------------------------------------ */

const UNIT_RULES = [
  { match: /sst|temperature|temp/i, unit: "°C", base: 28.2, swing: 1.8 },
  { match: /chlorophyll|chl/i, unit: "mg/m³", base: 0.9, swing: 0.55 },
  { match: /salinity|psal/i, unit: "PSU", base: 33.8, swing: 0.9 },
  { match: /wave|swh|hs/i, unit: "m", base: 1.5, swing: 0.7 },
  { match: /wind/i, unit: "m/s", base: 6.4, swing: 2.6 },
  { match: /current|velocity/i, unit: "m/s", base: 0.45, swing: 0.22 },
  { match: /depth|mld|d20/i, unit: "m", base: 38, swing: 12 },
  { match: /oxygen/i, unit: "µmol/kg", base: 210, swing: 25 },
  { match: /ph\b/i, unit: "pH", base: 8.08, swing: 0.06 },
];

function unitRuleFor(variable) {
  return (
    UNIT_RULES.find((rule) => rule.match.test(variable)) || {
      unit: "",
      base: 1,
      swing: 0.3,
    }
  );
}

export function unitForVariable(variable) {
  return unitRuleFor(variable).unit;
}

/* ------------------------------------------------------------------ */
/* Deterministic demo series                                           */
/* ------------------------------------------------------------------ */

/** Stable 32-bit hash, so the same query always draws the same series. */
function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function monthsBetween(start, end) {
  const out = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor <= end && out.length < 480) {
    out.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return out;
}

function mean(values) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stdDev(values) {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(
    values.reduce((sum, value) => sum + (value - m) ** 2, 0) / (values.length - 1)
  );
}

/** OLS slope of value against month index, scaled to a decade. */
function trendPerDecade(values) {
  const n = values.length;
  if (n < 3) return 0;
  const xMean = (n - 1) / 2;
  const yMean = mean(values);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i += 1) {
    num += (i - xMean) * (values[i] - yMean);
    den += (i - xMean) ** 2;
  }
  return den === 0 ? 0 : (num / den) * 120;
}

function buildHistogram(values, bins = 10) {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return [{ from: min, to: max, count: values.length }];
  const width = (max - min) / bins;
  const counts = new Array(bins).fill(0);
  values.forEach((value) => {
    const index = Math.min(bins - 1, Math.floor((value - min) / width));
    counts[index] += 1;
  });
  return counts.map((count, index) => ({
    from: min + index * width,
    to: min + (index + 1) * width,
    count,
  }));
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * Turn raw observations into the analysis the console shows: monthly means,
 * the climatology those months imply, the baseline expanded across the window,
 * the distribution and the summary statistics.
 *
 * Used for both the real ERDDAP series and the demo one, so the two are
 * analysed identically and only their origin differs.
 */
export function buildSeriesFromPoints(
  request,

  raw,
  unit
) {
  // Aggregate to monthly means, whatever cadence the source publishes at.
  const buckets = new Map();
  raw.forEach((point) => {
    const key = point.t.slice(0, 7);
    if (!Number.isFinite(point.value)) return;
    const list = buckets.get(key) || [];
    list.push(point.value);
    buckets.set(key, list);
  });

  const points = [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, values]) => ({
      t: `${key}-01`,
      value: Number(mean(values).toFixed(3)),
    }));

  const byMonth = Array.from({ length: 12 }, () => []);
  points.forEach((point) => {
    byMonth[new Date(point.t).getMonth()].push(point.value);
  });

  const overall = mean(points.map((point) => point.value));
  const climatology = byMonth.map((values, index) => ({
    month: MONTH_NAMES[index],
    mean: Number(mean(values.length ? values : [overall]).toFixed(3)),
  }));

  const baseline = points.map((point) => ({
    t: point.t,
    value: climatology[new Date(point.t).getMonth()].mean,
  }));

  const values = points.map((point) => point.value);
  const anomalies = points.map((point, index) => point.value - baseline[index].value);

  return {
    datasetId: request.datasetId,
    variable: request.variable,
    unit,
    region: request.region,
    start: request.start,
    end: request.end,
    points,
    baseline,
    climatology,
    histogram: buildHistogram(values),
    stats: {
      count: values.length,
      mean: Number(mean(values).toFixed(3)),
      min: values.length ? Number(Math.min(...values).toFixed(3)) : 0,
      max: values.length ? Number(Math.max(...values).toFixed(3)) : 0,
      stdDev: Number(stdDev(values).toFixed(3)),
      trendPerDecade: Number(trendPerDecade(values).toFixed(3)),
      anomalyMean: Number(mean(anomalies).toFixed(3)),
    },
  };
}

function demoSeries(request) {
  const rule = unitRuleFor(request.variable);
  const random = mulberry32(
    hash(`${request.datasetId}|${request.variable}|${request.region.minLat}`)
  );

  // A shape with the parts a marine series actually has: an annual cycle, a
  // slow drift, and month-to-month noise.
  const phase = random() * Math.PI * 2;
  const drift = (random() - 0.35) * rule.swing * 0.5;
  const noiseScale = rule.swing * 0.22;

  const from = new Date(request.start);
  const to = new Date(request.end);
  const months = monthsBetween(
    Number.isFinite(from.getTime()) ? from : new Date(),
    Number.isFinite(to.getTime()) ? to : new Date()
  );

  const seasonal = (monthIndex) =>
    rule.base + rule.swing * Math.sin((monthIndex / 12) * Math.PI * 2 + phase);

  const points = months.map((date, index) => {
    const years = index / 12;
    const value =
      seasonal(date.getMonth()) + drift * years + (random() - 0.5) * 2 * noiseScale;
    return {
      t: date.toISOString().slice(0, 10),
      value: Number(value.toFixed(3)),
    };
  });

  // Climatology from the window itself, which is what the baseline line shows.
  const byMonth = Array.from({ length: 12 }, () => []);
  points.forEach((point) => {
    byMonth[new Date(point.t).getMonth()].push(point.value);
  });
  const climatology = byMonth.map((values, index) => ({
    month: MONTH_NAMES[index],
    mean: Number(mean(values.length ? values : [seasonal(index)]).toFixed(3)),
  }));

  const baseline = points.map((point) => ({
    t: point.t,
    value: climatology[new Date(point.t).getMonth()].mean,
  }));

  const values = points.map((point) => point.value);
  const anomalies = points.map((point, index) => point.value - baseline[index].value);

  return {
    datasetId: request.datasetId,
    variable: request.variable,
    unit: rule.unit,
    region: request.region,
    start: request.start,
    end: request.end,
    points,
    baseline,
    climatology,
    histogram: buildHistogram(values),
    stats: {
      count: values.length,
      mean: Number(mean(values).toFixed(3)),
      min: Number(Math.min(...values).toFixed(3)),
      max: Number(Math.max(...values).toFixed(3)),
      stdDev: Number(stdDev(values).toFixed(3)),
      trendPerDecade: Number(trendPerDecade(values).toFixed(3)),
      anomalyMean: Number(mean(anomalies).toFixed(3)),
    },
  };
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export async function fetchResearchSeries(
  request,

  signal
) {
  if (Date.now() < downUntil) {
    return {
      data: demoSeries(request),
      source: "demo",
      reason: "SALTY backend is not reachable",
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  if (signal) signal.addEventListener("abort", () => controller.abort());

  let responded = false;
  try {
    const response = await fetch(`${API_BASE}/api/research/series`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: controller.signal,
      cache: "no-store",
    });
    responded = true;
    downUntil = 0;
    if (!response.ok) throw new Error(`SALTY API ${response.status}`);
    return { data: await response.json(), source: "live" };
  } catch (error) {
    if (!responded) downUntil = Date.now() + COOLDOWN_MS;
    return {
      data: demoSeries(request),
      source: "demo",
      reason: error instanceof Error ? error.message : "SALTY backend unreachable",
    };
  } finally {
    clearTimeout(timer);
  }
}

/** ERDDAP griddap request the researcher can copy or run themselves. */
export function erddapQueryUrl(options) {
  const base = options.server.replace(/\/+$/, "");
  const format = options.format || "csv";
  const slice =
    `[(${options.start}T00:00:00Z):1:(${options.end}T23:59:59Z)]` +
    `[(${options.region.minLat}):1:(${options.region.maxLat})]` +
    `[(${options.region.minLon}):1:(${options.region.maxLon})]`;
  return `${base}/griddap/${options.datasetId}.${format}?${options.variable}${slice}`;
}
