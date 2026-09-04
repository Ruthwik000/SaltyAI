"use client";

/**
 * Research & Data console.
 *
 * The catalogue is the live INCOIS ERDDAP server, read through /api/erddap.
 * Pick a dataset and a variable, set a region and window, and get the analysis
 * a marine researcher would otherwise assemble by hand — the series against its
 * own climatology, the departures from it, the seasonal cycle, the distribution
 * and the summary statistics — plus the griddap request to pull the same slice
 * into their own tooling, and a way to hand the selection to the AI agent.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  Database,
  Download,
  ExternalLink,
  Loader2,
  Search,
  Sparkles,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CircleDashed, Radio, Satellite } from "lucide-react";
import {
  AnomalyChart,
  BarChart,
  ChartCard,
  StatTile,
  TimeSeriesChart,
  ValueTable,
} from "@/components/research/charts";
import {
  buildSeriesFromPoints,
  fetchResearchSeries,
  unitForVariable,
  type RegionBounds,
  type ResearchSeries,
} from "@/lib/research-api";
import { setAgentContext } from "@/lib/research-context";
import {
  ERDDAP_BASE,
  fetchDatasetVariables,
  fetchErddapCatalogue,
  fetchErddapPointSeries,
  griddapUrl,
  inferDatasetFacets,
  proxyGriddapUrl,
  type ErddapDataset,
} from "@/lib/erddap";
import { toggleBookmark, useBookmarks } from "@/lib/dataset-bookmarks";

/** Where the numbers on screen actually came from. */
type Origin = "erddap" | "backend" | "demo";

const ORIGIN_BADGE: Record<
  Origin,
  { label: string; icon: React.ElementType; className: string; title: string }
> = {
  erddap: {
    label: "INCOIS ERDDAP",
    icon: Satellite,
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    title: "Measured values pulled from the INCOIS ERDDAP server",
  },
  backend: {
    label: "SALTY backend",
    icon: Radio,
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    title: "Served by the SALTY backend",
  },
  demo: {
    label: "Demo series",
    icon: CircleDashed,
    className: "border-amber-200 bg-amber-50 text-amber-800",
    title: "Generated locally — not measurements",
  },
};

function OriginBadge({ origin, reason }: { origin: Origin; reason?: string }) {
  const badge = ORIGIN_BADGE[origin];
  const Icon = badge.icon;
  return (
    <span
      title={reason ? `${badge.title} — ${reason}` : badge.title}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${badge.className}`}
    >
      <Icon className="h-2.5 w-2.5" />
      <span>{badge.label}</span>
    </span>
  );
}

const REGION_PRESETS: { id: string; label: string; bounds: RegionBounds }[] = [
  { id: "bob", label: "Bay of Bengal", bounds: { minLat: 8, maxLat: 22, minLon: 80, maxLon: 94 } },
  { id: "as", label: "Arabian Sea", bounds: { minLat: 8, maxLat: 24, minLon: 60, maxLon: 76 } },
  { id: "eez", label: "Indian EEZ", bounds: { minLat: 6, maxLat: 24, minLon: 60, maxLon: 94 } },
  { id: "ap", label: "Andhra shelf", bounds: { minLat: 15, maxLat: 19.5, minLon: 82, maxLon: 86 } },
];

const EXPORT_FORMATS = ["csv", "json", "nc", "htmlTable"];

const FIELD =
  "h-10 w-full rounded-lg border border-zinc-200 bg-white px-2.5 text-xs text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10";
const LABEL = "mb-1 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500";

function monthInput(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
const startOfMonth = (value: string) => `${value}-01`;
function endOfMonth(value: string): string {
  const [year, month] = value.split("-").map(Number);
  return new Date(year, month, 0).toISOString().slice(0, 10);
}

export function ResearchConsole() {
  const router = useRouter();
  const bookmarks = useBookmarks();

  /* ---- catalogue ---- */
  const [catalogue, setCatalogue] = React.useState<ErddapDataset[]>([]);
  const [catalogueLive, setCatalogueLive] = React.useState(false);
  const [catalogueReason, setCatalogueReason] = React.useState<string | undefined>();
  const [catalogueLoaded, setCatalogueLoaded] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [starredOnly, setStarredOnly] = React.useState(false);

  React.useEffect(() => {
    const controller = new AbortController();
    fetchErddapCatalogue(controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      setCatalogue(result.datasets);
      setCatalogueLive(result.live);
      setCatalogueReason(result.reason);
      setCatalogueLoaded(true);
      setSelectedId((current) => current ?? result.datasets[0]?.id ?? null);
    });
    return () => controller.abort();
  }, []);

  const dataset =
    catalogue.find((item) => item.id === selectedId) || catalogue[0] || null;

  /* ---- variables for the selected dataset ---- */
  const [variablesById, setVariablesById] = React.useState<Record<string, string[]>>({});
  const [variablesFailed, setVariablesFailed] = React.useState<Record<string, boolean>>({});
  const [variable, setVariable] = React.useState("");
  const [customVariable, setCustomVariable] = React.useState("");

  React.useEffect(() => {
    if (!dataset || variablesById[dataset.id] || variablesFailed[dataset.id]) return;
    const controller = new AbortController();
    fetchDatasetVariables(dataset.id, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      if (result.live && result.variables.length > 0) {
        setVariablesById((current) => ({ ...current, [dataset.id]: result.variables }));
      } else {
        setVariablesFailed((current) => ({ ...current, [dataset.id]: true }));
      }
    });
    return () => controller.abort();
  }, [dataset, variablesById, variablesFailed]);

  const variables = dataset ? variablesById[dataset.id] || [] : [];
  const variablesPending = Boolean(
    dataset && variables.length === 0 && !variablesFailed[dataset.id]
  );
  // Derived, so a dataset change cannot leave a variable from the previous one
  // selected — and so no effect has to correct it afterwards.
  const activeVariable = variables.includes(variable)
    ? variable
    : variables[0] || customVariable.trim();

  /* ---- query window ---- */
  const [regionId, setRegionId] = React.useState("bob");
  const [region, setRegion] = React.useState<RegionBounds>(REGION_PRESETS[0].bounds);
  const [from, setFrom] = React.useState(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 3);
    return monthInput(date);
  });
  const [to, setTo] = React.useState(() => monthInput(new Date()));

  /* ---- series ---- */
  const [series, setSeries] = React.useState<ResearchSeries | null>(null);
  const [origin, setOrigin] = React.useState<Origin>("demo");
  const [pointAt, setPointAt] = React.useState<{ lat: number; lon: number } | null>(null);
  const [reason, setReason] = React.useState<string | undefined>();
  const [copied, setCopied] = React.useState(false);

  const requestKey = dataset && activeVariable
    ? `${dataset.id}|${activeVariable}|${region.minLat},${region.maxLat},${region.minLon},${region.maxLon}|${from}|${to}`
    : "";
  const [loadedKey, setLoadedKey] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!dataset || !activeVariable) return;
    const controller = new AbortController();

    const request = {
      datasetId: dataset.id,
      variable: activeVariable,
      region,
      start: startOfMonth(from),
      end: endOfMonth(to),
    };
    // Grid point at the centre of the chosen region. Griddap cannot average
    // spatially and a whole region over years is far too much to pull into a
    // browser, so one point is what can honestly be shown.
    const lat = Number(((region.minLat + region.maxLat) / 2).toFixed(3));
    const lon = Number(((region.minLon + region.maxLon) / 2).toFixed(3));

    (async () => {
      let erddapReason: string | undefined;

      // 1. real measurements from INCOIS
      try {
        const real = await fetchErddapPointSeries(
          { ...request, lat, lon },
          controller.signal
        );
        if (controller.signal.aborted) return;
        setSeries(
          buildSeriesFromPoints(request, real.points, unitForVariable(activeVariable))
        );
        setOrigin("erddap");
        setPointAt({ lat: real.lat, lon: real.lon });
        setReason(undefined);
        setLoadedKey(requestKey);
        return;
      } catch (error) {
        if (controller.signal.aborted) return;
        erddapReason = error instanceof Error ? error.message : "ERDDAP unavailable";
      }

      // 2. the SALTY backend, 3. the labelled demo series
      const response = await fetchResearchSeries(request, controller.signal);
      if (controller.signal.aborted) return;
      setSeries(response.data);
      setOrigin(response.source === "live" ? "backend" : "demo");
      setPointAt(null);
      setReason(response.source === "live" ? undefined : erddapReason);
      setLoadedKey(requestKey);
    })();

    return () => controller.abort();
  }, [dataset, activeVariable, region, from, to, requestKey]);

  const visible = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    return catalogue
      .filter((item) => (starredOnly ? bookmarks.includes(item.id) : true))
      .filter(
        (item) =>
          !term ||
          item.id.toLowerCase().includes(term) ||
          item.title.toLowerCase().includes(term) ||
          item.summary.toLowerCase().includes(term)
      )
      .sort((a, b) => {
        const aStar = bookmarks.includes(a.id) ? 0 : 1;
        const bStar = bookmarks.includes(b.id) ? 0 : 1;
        return aStar - bStar || a.title.localeCompare(b.title);
      });
  }, [catalogue, bookmarks, query, starredOnly]);

  const unit = series?.unit || unitForVariable(activeVariable);
  const griddap = dataset && activeVariable
    ? griddapUrl({
        datasetId: dataset.id,
        variable: activeVariable,
        start: startOfMonth(from),
        end: endOfMonth(to),
        minLat: region.minLat,
        maxLat: region.maxLat,
        minLon: region.minLon,
        maxLon: region.maxLon,
      })
    : "";

  const handleAskAgent = () => {
    if (!series || !dataset) return;
    setAgentContext({
      datasetId: dataset.id,
      datasetName: dataset.title,
      instrument: dataset.institution,
      variable: activeVariable,
      unit,
      region,
      start: series.start,
      end: series.end,
      source: origin === "demo" ? "demo" : "live",
      stats: series.stats,
      erddapUrl: griddap,
    });
    router.push("/app/ai-agent");
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 border-b border-zinc-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-lg font-bold leading-snug tracking-tight text-zinc-950 sm:text-2xl lg:text-3xl">
            Research &amp; Data
          </h1>
          <p className="mt-1 text-[11px] leading-relaxed text-zinc-500 sm:text-xs">
            {catalogueLive
              ? `${catalogue.length} griddap datasets from the INCOIS ERDDAP server.`
              : "Known INCOIS griddap datasets — the live catalogue could not be read."}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <OriginBadge origin={origin} reason={reason} />
          <button
            type="button"
            onClick={() => setStarredOnly((value) => !value)}
            aria-pressed={starredOnly}
            className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
              starredOnly
                ? "border-amber-300 bg-amber-50 text-amber-800"
                : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            <Star className={`h-3.5 w-3.5 ${starredOnly ? "fill-amber-500 text-amber-500" : ""}`} />
            <span>
              {starredOnly ? "Showing bookmarks" : "Bookmarks"}
              {bookmarks.length > 0 ? ` (${bookmarks.length})` : ""}
            </span>
          </button>
          <Button
            size="sm"
            onClick={handleAskAgent}
            disabled={!series}
            className="h-9 gap-1.5 bg-zinc-950 text-xs text-white hover:bg-zinc-800"
          >
            <Sparkles className="h-3.5 w-3.5 text-zinc-300" />
            <span className="hidden sm:inline">Ask AI about this data</span>
            <span className="sm:hidden">Ask AI</span>
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        {/* Catalogue */}
        <aside className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-3.5 w-3.5 text-zinc-400" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search the INCOIS catalogue…"
              className="h-10 pl-8 text-xs"
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setStarredOnly((value) => !value)}
              aria-pressed={starredOnly}
              className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                starredOnly
                  ? "border-amber-300 bg-amber-50 text-amber-800"
                  : "border-zinc-200 bg-white text-zinc-600"
              }`}
            >
              <Star className={`h-3 w-3 ${starredOnly ? "fill-amber-500 text-amber-500" : ""}`} />
              <span>Starred{bookmarks.length > 0 ? ` (${bookmarks.length})` : ""}</span>
            </button>
            <span className="font-sans text-[10px] text-zinc-400">
              {visible.length} shown
            </span>
          </div>

          <div className="max-h-[22rem] space-y-2 overflow-y-auto lg:max-h-[calc(100dvh-19rem)]">
            {!catalogueLoaded && (
              <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-6 text-xs text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Reading the INCOIS catalogue…</span>
              </div>
            )}

            {visible.map((item) => {
              const active = item.id === dataset?.id;
              const starred = bookmarks.includes(item.id);
              return (
                <div
                  key={item.id}
                  className={`rounded-xl border transition-colors ${
                    active
                      ? "border-zinc-950 bg-zinc-50 ring-1 ring-zinc-950"
                      : "border-zinc-200 bg-white hover:border-zinc-300"
                  }`}
                >
                  <div className="flex items-start gap-1 p-3">
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="truncate font-sans text-[10px] uppercase tracking-wide text-zinc-400">
                        {item.institution}
                      </div>
                      <div className="mt-0.5 text-xs font-semibold leading-snug text-zinc-950">
                        {item.title}
                      </div>
                      <div className="mt-0.5 truncate font-sans text-[10px] text-zinc-400">
                        {item.id}
                      </div>
                      {item.summary ? (
                        <div className="mt-1 line-clamp-2 text-[11px] leading-snug text-zinc-500">
                          {item.summary}
                        </div>
                      ) : (
                        (() => {
                          // No published summary reached us, so show what the id
                          // itself says — labelled as such, never as metadata.
                          const facets = inferDatasetFacets(item.id);
                          const chips = [
                            facets.platform,
                            facets.cadence,
                            facets.coverage,
                          ].filter(Boolean) as string[];
                          if (chips.length === 0) return null;
                          return (
                            <div className="mt-1.5 flex flex-wrap items-center gap-1">
                              {chips.map((chip) => (
                                <span
                                  key={chip}
                                  className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-600"
                                >
                                  {chip}
                                </span>
                              ))}
                              <span className="text-[9px] uppercase tracking-wide text-zinc-300">
                                from id
                              </span>
                            </div>
                          );
                        })()
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleBookmark(item.id)}
                      aria-pressed={starred}
                      aria-label={starred ? `Unstar ${item.title}` : `Star ${item.title}`}
                      className="shrink-0 rounded p-1 text-zinc-300 hover:bg-zinc-100 hover:text-amber-500"
                    >
                      <Star
                        className={`h-4 w-4 ${starred ? "fill-amber-500 text-amber-500" : ""}`}
                      />
                    </button>
                  </div>
                </div>
              );
            })}

            {catalogueLoaded && visible.length === 0 && (
              <p className="rounded-xl border border-dashed border-zinc-200 px-3 py-6 text-center text-[11px] text-zinc-500">
                {starredOnly
                  ? "Nothing starred yet. Tap the star on a dataset to keep it here."
                  : "Nothing matches that search."}
              </p>
            )}
          </div>

          {!catalogueLive && catalogueLoaded && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[10px] leading-snug text-amber-900">
              Showing the known INCOIS griddap dataset ids. The live catalogue at{" "}
              {ERDDAP_BASE} could not be read
              {catalogueReason ? ` (${catalogueReason})` : ""}.
            </p>
          )}
        </aside>

        {/* Analysis */}
        <div className="min-w-0 space-y-4">
          {dataset && (
            <section className="rounded-xl border border-zinc-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-sm font-bold leading-snug text-zinc-950">
                    {dataset.title}
                  </h2>
                  <p className="mt-0.5 truncate font-sans text-[11px] text-zinc-500">
                    {dataset.id} · {dataset.institution}
                  </p>
                </div>
                <a
                  href={`${ERDDAP_BASE}/griddap/${dataset.id}.graph`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex shrink-0 items-center gap-1 rounded-md border border-zinc-200 px-2 py-1 text-[10px] text-zinc-600 hover:bg-zinc-50"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>On ERDDAP</span>
                </a>
              </div>

              <div className="mt-3">
                <span className={LABEL}>Variable</span>
                {variablesPending ? (
                  <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Reading this dataset&rsquo;s variables…</span>
                  </div>
                ) : variables.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {variables.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setVariable(name)}
                        aria-pressed={activeVariable === name}
                        className={`rounded-md px-2.5 py-1 font-sans text-xs transition-colors ${
                          activeVariable === name
                            ? "bg-zinc-900 font-semibold text-white"
                            : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div>
                    <Input
                      value={customVariable}
                      onChange={(event) => setCustomVariable(event.target.value)}
                      placeholder="Variable name, e.g. sst"
                      className="h-10 text-xs"
                    />
                    <p className="mt-1 text-[10px] leading-snug text-zinc-400">
                      This dataset&rsquo;s variable list could not be read from
                      ERDDAP. Type the variable name as it appears on its ERDDAP
                      page.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="col-span-2">
                  <label className={LABEL} htmlFor="region">
                    Region
                  </label>
                  <select
                    id="region"
                    value={regionId}
                    onChange={(event) => {
                      const preset = REGION_PRESETS.find((item) => item.id === event.target.value);
                      setRegionId(event.target.value);
                      if (preset) setRegion(preset.bounds);
                    }}
                    className={FIELD}
                  >
                    {REGION_PRESETS.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={LABEL} htmlFor="from">
                    From
                  </label>
                  <input
                    id="from"
                    type="month"
                    value={from}
                    max={to}
                    onChange={(event) => setFrom(event.target.value)}
                    className={FIELD}
                  />
                </div>
                <div>
                  <label className={LABEL} htmlFor="to">
                    To
                  </label>
                  <input
                    id="to"
                    type="month"
                    value={to}
                    min={from}
                    onChange={(event) => setTo(event.target.value)}
                    className={FIELD}
                  />
                </div>
              </div>

              <p className="mt-2 font-sans text-[10px] text-zinc-400">
                {region.minLat}–{region.maxLat}°N, {region.minLon}–{region.maxLon}°E
              </p>
            </section>
          )}

          {origin === "demo" && series && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-900">
              <strong>Demo series.</strong> The SALTY backend did not answer, so
              these charts show a generated series with the right shape and
              units. Do not cite these values — they are not measurements. The
              griddap request below pulls the real data.
            </p>
          )}

          {!activeVariable ? (
            <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-10 text-center text-xs text-zinc-500">
              Choose a variable to analyse.
            </p>
          ) : !series || loadedKey !== requestKey ? (
            <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-10 text-xs text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading {activeVariable}…</span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
                <StatTile label="Mean" value={`${series.stats.mean}${unit ? ` ${unit}` : ""}`} />
                <StatTile label="Minimum" value={`${series.stats.min}`} tone="cool" />
                <StatTile label="Maximum" value={`${series.stats.max}`} tone="warm" />
                <StatTile label="Std. deviation" value={`${series.stats.stdDev}`} />
                <StatTile
                  label="Trend"
                  value={`${series.stats.trendPerDecade > 0 ? "+" : ""}${series.stats.trendPerDecade}`}
                  hint={`per decade${unit ? ` (${unit})` : ""}`}
                  tone={series.stats.trendPerDecade > 0 ? "warm" : "cool"}
                />
                <StatTile
                  label="Mean anomaly"
                  value={`${series.stats.anomalyMean > 0 ? "+" : ""}${series.stats.anomalyMean}`}
                  hint={`over ${series.stats.count} months`}
                />
              </div>

              <ChartCard
                title={`${activeVariable} over time`}
                caption={
                  (pointAt
                    ? `Grid point ${pointAt.lat}°N, ${pointAt.lon}°E — griddap cannot average a region, so this is the centre of the box. `
                    : "") +
                  `Monthly values against the climatology computed from this window${unit ? `, in ${unit}` : ""}.`
                }
                table={
                  <ValueTable
                    columns={["Month", `Value${unit ? ` (${unit})` : ""}`, "Climatology"]}
                    rows={series.points.map((point, index) => [
                      point.t.slice(0, 7),
                      point.value,
                      series.baseline[index]?.value ?? "—",
                    ])}
                  />
                }
              >
                <TimeSeriesChart points={series.points} baseline={series.baseline} unit={unit} />
              </ChartCard>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <ChartCard
                  title="Departure from climatology"
                  caption="How far each month sat above or below its own seasonal normal."
                  table={
                    <ValueTable
                      columns={["Month", `Anomaly${unit ? ` (${unit})` : ""}`]}
                      rows={series.points.map((point, index) => [
                        point.t.slice(0, 7),
                        Number((point.value - (series.baseline[index]?.value ?? point.value)).toFixed(3)),
                      ])}
                    />
                  }
                >
                  <AnomalyChart points={series.points} baseline={series.baseline} unit={unit} />
                </ChartCard>

                <ChartCard
                  title="Seasonal cycle"
                  caption="Mean by calendar month across the selected window."
                  table={
                    <ValueTable
                      columns={["Month", `Mean${unit ? ` (${unit})` : ""}`]}
                      rows={series.climatology.map((item) => [item.month, item.mean])}
                    />
                  }
                >
                  <BarChart
                    bars={series.climatology.map((item) => ({ label: item.month, value: item.mean }))}
                    unit={unit}
                  />
                </ChartCard>
              </div>

              <ChartCard
                title="Distribution"
                caption="How often the variable fell in each band over the window."
                table={
                  <ValueTable
                    columns={["Band", "Months"]}
                    rows={series.histogram.map((bin) => [
                      `${bin.from.toFixed(2)} – ${bin.to.toFixed(2)}`,
                      bin.count,
                    ])}
                  />
                }
              >
                <BarChart
                  bars={series.histogram.map((bin) => ({
                    label: bin.from.toFixed(1),
                    value: bin.count,
                  }))}
                  valueLabel={(value) => `${value} months`}
                />
              </ChartCard>

              <section className="rounded-xl border border-zinc-200 bg-white p-4">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold text-zinc-950">
                  <Database className="h-3.5 w-3.5 text-zinc-500" />
                  <span>Pull this slice from ERDDAP</span>
                </h3>
                <p className="mt-0.5 text-[11px] text-zinc-500">
                  Griddap request for the dataset, variable, region and window
                  selected above.
                </p>

                <div className="mt-2 flex items-center gap-2 overflow-x-auto rounded-lg bg-zinc-950 p-2.5">
                  <code className="whitespace-nowrap font-sans text-[11px] text-zinc-300">
                    {griddap}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(griddap);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    aria-label="Copy griddap request"
                    className="ml-auto shrink-0 rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {EXPORT_FORMATS.map((format) => (
                    <a
                      key={format}
                      // Routed through this app rather than straight at INCOIS,
                      // so a download works from any network the app works on.
                      href={proxyGriddapUrl({
                        datasetId: dataset!.id,
                        variable: activeVariable,
                        start: startOfMonth(from),
                        end: endOfMonth(to),
                        lat: region.minLat,
                        latTo: region.maxLat,
                        lon: region.minLon,
                        lonTo: region.maxLon,
                        format,
                      })}
                      download={`${dataset!.id}_${activeVariable}.${format}`}
                      className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50"
                    >
                      <Download className="h-3.5 w-3.5 text-zinc-500" />
                      <span>{format}</span>
                    </a>
                  ))}
                </div>
                <p className="mt-2 text-[10px] leading-snug text-zinc-400">
                  Downloads cover the whole region box and are fetched through
                  SALTY; the URL above is the public one for your own tooling.
                  Axis order assumes the usual griddap layout of time, latitude,
                  longitude — a dataset with different dimensions needs its own
                  order, shown on its ERDDAP page.
                </p>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
