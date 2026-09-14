"use client";

/**
 * Ocean colour and sea temperature for the researcher dashboard.
 *
 * What this replaced, and why. The card here used to read "SST & Chlorophyll
 * Front Dynamics", print `location.chlorophyll`, `location.weather.pressure`
 * and `location.currentSpeed` out of the bundled sample set, label them "Bloom
 * active" and "Stable gradient", and sit them under this line:
 *
 *     ERDDAP: incois.gov.in/erddap/griddap/insat_sst_hourly        200 OK
 *
 * No request was made. That dataset does not exist. The green 200 was a string
 * in the markup. On a research console that is the worst possible failure —
 * a fabricated number wearing a citation — and it breaks the project's own
 * first rule: never silently fall back to generated marine values.
 *
 * Everything below now comes from /api/ocean-color, which reads NOAA
 * CoastWatch ERDDAP server-side. Real dataset IDs, real observation dates, a
 * real failure state. Chlorophyll comes from NOAA rather than INCOIS because
 * INCOIS stopped serving it in 2020 — that is recorded in the route.
 */

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Database, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataChart } from "@/components/research/data-chart";
import {
  MarineSciencePanel,
  buildForecastHours,
} from "@/components/research/marine-science-panel";

const TREND_ICON = { rising: TrendingUp, falling: TrendingDown };

function Trend({ trend, unit }) {
  if (!trend || trend.status === "NOT AVAILABLE") {
    return (
      <span className="text-[10px] text-zinc-500">
        Trend not available — {trend?.reason || "insufficient data"}
      </span>
    );
  }
  const Icon = TREND_ICON[trend.direction] || Minus;
  const tone =
    trend.direction === "rising"
      ? "text-emerald-600"
      : trend.direction === "falling"
        ? "text-amber-600"
        : "text-zinc-500";
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${tone}`}>
      <Icon className="h-3 w-3" />
      {trend.direction}
      <span className="text-zinc-500">
        {trend.absoluteChange > 0 ? "+" : ""}
        {trend.absoluteChange} {unit} over {trend.daysCompared}-day means
      </span>
    </span>
  );
}

function Metric({ label, value, unit, observedOn, foot, trend }) {
  return (
    <div className="rounded-lg border border-zinc-200/80 bg-zinc-50 p-2.5 sm:p-3">
      <span className="block text-[10px] text-zinc-400">{label}</span>
      <span className="text-sm font-bold tabular-nums text-zinc-950 sm:text-base">
        {value == null ? "—" : `${value} ${unit}`}
      </span>
      {foot && <span className="mt-0.5 block text-[10px] text-zinc-600">{foot}</span>}
      {trend !== undefined && (
        <span className="mt-0.5 block">
          <Trend trend={trend} unit={unit} />
        </span>
      )}
      <span className="mt-1 block text-[10px] text-zinc-400">
        {observedOn ? `Observed ${observedOn}` : "No observation"}
      </span>
    </div>
  );
}

/** One dataset, with the id actually queried and what came back. */
function Provenance({ dataset, label, observedOn, ok }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white p-2.5 text-xs">
      <div className="flex min-w-0 items-center gap-2">
        <Database className="h-4 w-4 shrink-0 text-purple-600" />
        <span className="min-w-0">
          <span className="block truncate font-sans text-[11px] text-zinc-800">
            coastwatch.noaa.gov/erddap/griddap/{dataset}
          </span>
          <span className="block truncate text-[10px] text-zinc-500">{label}</span>
        </span>
      </div>
      <span
        className={`shrink-0 rounded border px-2 py-0.5 font-sans text-[10px] ${
          ok
            ? "border-emerald-200 bg-emerald-50 text-emerald-600"
            : "border-rose-200 bg-rose-50 text-rose-600"
        }`}
      >
        {ok ? `data to ${observedOn || "—"}` : "unavailable"}
      </span>
    </div>
  );
}

export function ResearcherWidget({ location }) {
  const [ocean, setOcean] = React.useState(null);
  const [error, setError] = React.useState(null);
  const coastKey = `${location.lat},${location.lon}`;
  const [loadedKey, setLoadedKey] = React.useState(null);
  const loading = loadedKey !== coastKey;

  React.useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/ocean-color?lat=${location.lat}&lon=${location.lon}&days=60`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then((response) => response.json().then((body) => ({ ok: response.ok, body })))
      .then(({ ok, body }) => {
        if (controller.signal.aborted) return;
        setOcean(ok ? body : null);
        setError(ok ? null : body?.error || "Ocean-colour service unavailable");
        setLoadedKey(coastKey);
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setError("Ocean-colour service unavailable");
        setLoadedKey(coastKey);
      });
    return () => controller.abort();
  }, [location.lat, location.lon, coastKey]);

  /* Chlorophyll runs 0.2-1.0 mg/m3 and sea temperature 28-30 degC. Sharing one
     axis would draw two flat lines and teach nothing, so these go to
     DataChart as separate series with shareScale off — it draws small
     multiples, one panel and one scale each, sharing the x-axis. */
  const chart = React.useMemo(() => {
    const chlorophyll = ocean?.chlorophyll?.series || [];
    const sst = ocean?.seaSurfaceTemperature?.series || [];
    if (chlorophyll.length === 0 && sst.length === 0) return null;
    const dates = [...new Set([...chlorophyll, ...sst].map((row) => row.date))].sort();
    const at = (series) => {
      const map = new Map(series.map((row) => [row.date, row.value]));
      return dates.map((date) => (map.has(date) ? map.get(date) : null));
    };
    return {
      labels: dates.map((date) => date.slice(5)),
      kind: "line",
      shareScale: false,
      series: [
        { name: `Chlorophyll-a (${ocean.chlorophyll.unit})`, values: at(chlorophyll) },
        { name: `Sea surface temperature (${ocean.seaSurfaceTemperature.unit})`, values: at(sst) },
      ],
    };
  }, [ocean]);

  return (
    <Card className="border-zinc-200">
      <CardHeader className="flex flex-col items-start gap-2 border-b border-zinc-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <Badge variant="minimal" className="mb-1 text-[10px] uppercase">
            Satellite observation
          </Badge>
          <CardTitle className="text-sm font-semibold text-zinc-950 sm:text-base">
            Ocean colour &amp; sea temperature
          </CardTitle>
        </div>
        <Link href="/app/research" className="shrink-0">
          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
            <span>ERDDAP datasets</span>
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {loading && <p className="text-xs text-zinc-500">Reading NOAA CoastWatch…</p>}

        {!loading && error && (
          <p className="rounded-lg border-l-4 border-rose-400 bg-rose-50 px-3 py-2 text-xs text-rose-800">
            {error}. Nothing is shown in place of the measurement.
          </p>
        )}

        {!loading && ocean && (
          <>
            <p className="text-xs leading-relaxed text-zinc-600">
              Satellite reading {ocean.readAt
                ? `at ${ocean.readAt.latitude}°N, ${ocean.readAt.longitude}°E`
                : `near ${location.name}`}
              {" — "}
              chlorophyll-a {ocean.chlorophyll.latest ?? "—"} {ocean.chlorophyll.unit}
              {ocean.chlorophyll.band ? ` (${ocean.chlorophyll.band})` : ""}, sea surface
              temperature {ocean.seaSurfaceTemperature.latest ?? "—"}{" "}
              {ocean.seaSurfaceTemperature.unit}. Chlorophyll is how much food the water
              carries; it is not a count of fish, and this is not the INCOIS PFZ advisory.
            </p>

            <div className="grid grid-cols-1 gap-2 font-sans text-xs sm:grid-cols-3 sm:gap-3">
              <Metric
                label="Chlorophyll-a"
                value={ocean.chlorophyll.latest}
                unit={ocean.chlorophyll.unit}
                observedOn={ocean.chlorophyll.observedOn}
                foot={ocean.chlorophyll.band}
                trend={ocean.chlorophyll.trend}
              />
              <Metric
                label="Sea surface temperature"
                value={ocean.seaSurfaceTemperature.latest}
                unit={ocean.seaSurfaceTemperature.unit}
                observedOn={ocean.seaSurfaceTemperature.observedOn}
                trend={ocean.seaSurfaceTemperature.trend}
              />
              <Metric
                label="SST anomaly vs 1985-2012"
                value={ocean.anomaly.value}
                unit={ocean.anomaly.unit}
                observedOn={ocean.anomaly.observedOn}
                foot={
                  ocean.anomaly.value == null
                    ? null
                    : ocean.anomaly.value > 0
                      ? "warmer than baseline"
                      : "cooler than baseline"
                }
              />
            </div>

            {chart && (
              <DataChart
                chart={chart}
                caption={`Daily means over the last ${ocean.windowDays} days, cloud-free days only.`}
              />
            )}

            <div className="space-y-2">
              <Provenance
                dataset={ocean.chlorophyll.dataset}
                label={ocean.chlorophyll.label}
                observedOn={ocean.chlorophyll.observedOn}
                ok={ocean.chlorophyll.latest != null}
              />
              <Provenance
                dataset={ocean.seaSurfaceTemperature.dataset}
                label={ocean.seaSurfaceTemperature.label}
                observedOn={ocean.seaSurfaceTemperature.observedOn}
                ok={ocean.seaSurfaceTemperature.latest != null}
              />
              <Provenance
                dataset={ocean.anomaly.dataset}
                label={ocean.anomaly.label}
                observedOn={ocean.anomaly.observedOn}
                ok={ocean.anomaly.value != null}
              />
              <p className="text-[10px] leading-snug text-zinc-500">{ocean.note}</p>
            </div>
          </>
        )}

        {/* The physics behind the numbers above, computed on this device, with
            each relation printed under its value. */}
        <div className="border-t border-zinc-100 pt-4">
          <MarineSciencePanel
            location={location}
            hours={buildForecastHours(location)}
            variant="dashboard"
          />
        </div>
      </CardContent>
    </Card>
  );
}
