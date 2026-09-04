"use client";

/**
 * INCOIS ERDDAP catalogue.
 *
 * Datasets come from the real server rather than a bundled list. Requests go
 * through /api/erddap (ERDDAP sends no CORS header). If the catalogue cannot be
 * read, the console falls back to the known INCOIS griddap dataset ids so the
 * researcher still has something to work with, and says which it is using.
 *
 * Endpoint shapes (standard ERDDAP):
 *   catalogue : /erddap/tabledap/allDatasets.json?datasetID,title,institution,summary,griddap
 *   variables : /erddap/info/<datasetID>/index.json
 *   slice     : /erddap/griddap/<datasetID>.<format>?<variable>[time][lat][lon]
 */

export const ERDDAP_BASE = "https://erddap.incois.gov.in/erddap";
const PROXY = "/api/erddap";

export interface ErddapDataset {
  id: string;
  title: string;
  institution: string;
  summary: string;
  /** Data variables. Empty until the dataset's info document is read. */
  variables: string[];
  griddapUrl: string;
}

/**
 * Griddap datasets published by INCOIS, as listed on their server. Used as the
 * fallback catalogue and to seed the list before the live one arrives.
 */
export const KNOWN_INCOIS_DATASETS: string[] = [
  "AMSRE_MONTHLY_GLOBAL",
  "ascat_daily_datasets",
  "ascat_mnt_datasets",
  "NOAA_AVHRR_AMSR_datasets",
  "incois_argo_10day_McCreary",
  "incois_argo_10d_VAM",
  "incois_argo_mnt_McCreary",
  "incois_argo_mnt_VAM",
  "incois_argo_sst_weekly",
  "incois_oceansat2_datasets",
  "incois_quickscat_daily_datasets",
  "incois_quickscat_mnt_datasets",
  "incois_tmi_3day_datasets",
  "incois_valueadded_products_datasets",
  "IRS_chlorophyll_datasets",
];

/** Turn `incois_argo_mnt_VAM` into `Incois argo mnt VAM`. */
function humanise(id: string): string {
  const words = id.replace(/[_-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function datasetJsonUrl(id: string): string {
  return `${ERDDAP_BASE}/griddap/${id}.json`;
}

function fallbackCatalogue(): ErddapDataset[] {
  return KNOWN_INCOIS_DATASETS.map((id) => ({
    id,
    title: humanise(id),
    institution: "INCOIS",
    summary: "",
    variables: [],
    griddapUrl: datasetJsonUrl(id),
  }));
}

interface ErddapTable {
  table?: {
    columnNames: string[];
    rows: (string | number | null)[][];
  };
}

async function readTable(path: string, signal?: AbortSignal): Promise<ErddapTable> {
  const response = await fetch(`${PROXY}/${path}`, { signal, cache: "no-store" });
  if (!response.ok) throw new Error(`ERDDAP ${response.status}`);
  return (await response.json()) as ErddapTable;
}

export interface CatalogueResult {
  datasets: ErddapDataset[];
  /** True when the list came from the live server. */
  live: boolean;
  reason?: string;
}

export async function fetchErddapCatalogue(
  signal?: AbortSignal
): Promise<CatalogueResult> {
  try {
    const body = await readTable(
      "tabledap/allDatasets.json?datasetID,title,institution,summary,griddap",
      signal
    );
    const table = body.table;
    if (!table?.columnNames || !Array.isArray(table.rows)) {
      throw new Error("Unexpected catalogue shape");
    }

    const col = (name: string) => table.columnNames.indexOf(name);
    const idAt = col("datasetID");
    const titleAt = col("title");
    const instAt = col("institution");
    const summaryAt = col("summary");
    const gridAt = col("griddap");

    const datasets = table.rows
      .map((row) => ({
        id: String(row[idAt] ?? ""),
        title: String(row[titleAt] ?? "") || humanise(String(row[idAt] ?? "")),
        institution: String(row[instAt] ?? "INCOIS"),
        summary: String(row[summaryAt] ?? ""),
        variables: [],
        griddapUrl: String(row[gridAt] ?? "") || datasetJsonUrl(String(row[idAt] ?? "")),
      }))
      // allDatasets lists itself, and tabledap-only entries have no griddap URL.
      .filter((item) => item.id && item.id !== "allDatasets" && item.griddapUrl);

    if (datasets.length === 0) throw new Error("Catalogue returned no griddap datasets");
    return { datasets, live: true };
  } catch (error) {
    return {
      datasets: fallbackCatalogue(),
      live: false,
      reason:
        error instanceof Error ? error.message : "Unable to reach INCOIS ERDDAP",
    };
  }
}

/**
 * Data variables for one dataset. ERDDAP's info document lists every row of the
 * dataset's metadata; the ones with row type "variable" are the fields a
 * researcher can request, minus the axes.
 */
export async function fetchDatasetVariables(
  id: string,
  signal?: AbortSignal
): Promise<{ variables: string[]; axes: string[]; live: boolean }> {
  try {
    const body = await readTable(`info/${encodeURIComponent(id)}/index.json`, signal);
    const table = body.table;
    if (!table?.columnNames) throw new Error("Unexpected info shape");

    const typeAt = table.columnNames.indexOf("Row Type");
    const nameAt = table.columnNames.indexOf("Variable Name");

    const variables: string[] = [];
    const axes: string[] = [];
    table.rows.forEach((row) => {
      const rowType = String(row[typeAt] ?? "");
      const name = String(row[nameAt] ?? "");
      if (!name) return;
      if (rowType === "variable" && !variables.includes(name)) variables.push(name);
      if (rowType === "dimension" && !axes.includes(name)) axes.push(name);
    });

    return { variables, axes, live: true };
  } catch {
    return { variables: [], axes: [], live: false };
  }
}

/**
 * Griddap request for a slice. Axis order follows the usual INCOIS griddap
 * layout (time, latitude, longitude); a dataset with different axes needs its
 * own order, which `fetchDatasetVariables` reports.
 */
export function griddapUrl(options: {
  datasetId: string;
  variable: string;
  start: string;
  end: string;
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
  format?: string;
}): string {
  const format = options.format || "csv";
  const slice =
    `[(${options.start}T00:00:00Z):1:(${options.end}T23:59:59Z)]` +
    `[(${options.minLat}):1:(${options.maxLat})]` +
    `[(${options.minLon}):1:(${options.maxLon})]`;
  return `${ERDDAP_BASE}/griddap/${options.datasetId}.${format}?${options.variable}${slice}`;
}

/* ------------------------------------------------------------------ */
/* Facets inferred from the dataset id                                 */
/* ------------------------------------------------------------------ */

export interface DatasetFacets {
  /** Sensor or programme, where the id names one. */
  platform: string | null;
  /** Publication cadence, where the id names one. */
  cadence: string | null;
  coverage: string | null;
}

const PLATFORMS: [RegExp, string][] = [
  [/amsre/i, "AMSR-E radiometer"],
  [/ascat/i, "ASCAT scatterometer"],
  [/quickscat|quikscat/i, "QuikSCAT scatterometer"],
  [/oceansat/i, "Oceansat-2"],
  [/avhrr/i, "AVHRR radiometer"],
  [/\btmi\b/i, "TRMM Microwave Imager"],
  [/argo/i, "Argo profiling floats"],
  [/\birs\b/i, "IRS satellite"],
  [/noaa/i, "NOAA"],
];

const CADENCES: [RegExp, string][] = [
  [/monthly|_mnt\b|_mnt_/i, "Monthly"],
  [/weekly/i, "Weekly"],
  [/10day|10d\b|10d_/i, "10-day"],
  [/3day/i, "3-day"],
  [/daily/i, "Daily"],
];

/**
 * What can be read off the dataset id itself — nothing more.
 *
 * These are NOT published metadata: they are a reading of the name, shown so a
 * bare catalogue entry is still scannable when ERDDAP's own summary cannot be
 * fetched. Anything the server does return replaces them.
 */
export function inferDatasetFacets(id: string): DatasetFacets {
  const platform = PLATFORMS.find(([pattern]) => pattern.test(id))?.[1] ?? null;
  const cadence = CADENCES.find(([pattern]) => pattern.test(id))?.[1] ?? null;
  const coverage = /global/i.test(id)
    ? "Global"
    : /nio|indian|incois/i.test(id)
    ? "North Indian Ocean"
    : null;
  return { platform, cadence, coverage };
}

/* ------------------------------------------------------------------ */
/* Real series and downloads                                           */
/* ------------------------------------------------------------------ */

/**
 * Same griddap request, routed through this app so it works from the browser
 * and does not depend on the user's machine reaching INCOIS directly.
 */
export function proxyGriddapUrl(options: {
  datasetId: string;
  variable: string;
  start: string;
  end: string;
  lat: number;
  lon: number;
  latTo?: number;
  lonTo?: number;
  format?: string;
}): string {
  const format = options.format || "json";
  const slice =
    `[(${options.start}T00:00:00Z):1:(${options.end}T23:59:59Z)]` +
    `[(${options.lat}):1:(${options.latTo ?? options.lat})]` +
    `[(${options.lon}):1:(${options.lonTo ?? options.lon})]`;
  return `${PROXY}/griddap/${options.datasetId}.${format}?${encodeURIComponent(
    options.variable
  )}${slice}`;
}

export interface ErddapPointSeries {
  points: { t: string; value: number }[];
  lat: number;
  lon: number;
}

/**
 * Time series for one grid point at the centre of the chosen region.
 *
 * A whole region over years is far too much data to pull into a browser, and
 * griddap cannot average spatially, so the honest thing is a single point —
 * and to say so on the chart rather than imply a regional mean.
 */
export async function fetchErddapPointSeries(
  options: {
    datasetId: string;
    variable: string;
    start: string;
    end: string;
    lat: number;
    lon: number;
  },
  signal?: AbortSignal
): Promise<ErddapPointSeries> {
  const url = proxyGriddapUrl({ ...options, format: "json" });
  const response = await fetch(url, { signal, cache: "no-store" });
  if (!response.ok) throw new Error(`ERDDAP ${response.status}`);

  const body = (await response.json()) as ErddapTable;
  const table = body.table;
  if (!table?.columnNames || !Array.isArray(table.rows)) {
    throw new Error("Unexpected griddap response");
  }

  const timeAt = table.columnNames.findIndex((name) => /^time$/i.test(name));
  const valueAt = table.columnNames.findIndex(
    (name) => name.toLowerCase() === options.variable.toLowerCase()
  );
  if (timeAt < 0 || valueAt < 0) throw new Error("Griddap response has no time/value column");

  const points = table.rows
    .map((row) => ({
      t: String(row[timeAt] ?? "").slice(0, 10),
      value: Number(row[valueAt]),
    }))
    .filter((point) => point.t && Number.isFinite(point.value));

  if (points.length === 0) throw new Error("No values returned for this point and window");
  return { points, lat: options.lat, lon: options.lon };
}
