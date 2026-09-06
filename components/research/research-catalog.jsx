"use client";

/**
 * Research & Data catalog.
 *
 * Everything here comes from the SALTY backend's /api/research/* endpoints,
 * which in turn read straight from the real INCOIS ERDDAP server (see
 * reference.ipynb for how those endpoints were derived). There is no
 * synthetic fallback: a dataset that fails to load shows the real error
 * instead of a made-up series or image.
 */

import * as React from "react";
import { ChevronLeft, ChevronRight, Database, Satellite, Thermometer, Waves } from "lucide-react";
import { TimeSeriesChart } from "@/components/research/charts";

const API_BASE = process.env.NEXT_PUBLIC_SALTY_API_URL || "http://127.0.0.1:8010";

function iconFor(variable) {
  if (!variable) return Database;
  if (/sst|temp/i.test(variable)) return Thermometer;
  if (/wind|wave|current/i.test(variable)) return Waves;
  return Satellite;
}

export function ResearchCatalog() {
  const [datasets, setDatasets] = React.useState(null);
  const [catalogError, setCatalogError] = React.useState(null);
  const [selectedId, setSelectedId] = React.useState(null);

  React.useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE}/api/research/catalog`, { signal: controller.signal, cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`SALTY API ${response.status}`);
        return response.json();
      })
      .then((body) => {
        setDatasets(body.datasets || []);
        if ((body.datasets || []).length > 0) setSelectedId(body.datasets[0].id);
      })
      .catch((error) => {
        if (error.name === "AbortError") return;
        setCatalogError(error instanceof Error ? error.message : "Could not reach the SALTY data API");
      });
    return () => controller.abort();
  }, []);

  const selected = datasets?.find((item) => item.id === selectedId) || null;

  return (
    <main className="mx-auto max-w-6xl space-y-6 pb-10">
      <header className="border-b border-zinc-200 pb-5">
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-800">
          <Satellite className="h-3 w-3" /> Live INCOIS ERDDAP
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">Research &amp; Data</h1>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-500">
          Real dataset metadata, time series, and animations pulled live from
          INCOIS ERDDAP (erddap.incois.gov.in). No synthetic values — a
          dataset that cannot be reached shows the real error instead.
        </p>
      </header>

      {catalogError && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          Could not load the catalog: {catalogError}
        </p>
      )}

      {!datasets && !catalogError && (
        <p className="text-xs text-zinc-500">Loading catalog from INCOIS ERDDAP…</p>
      )}

      {datasets && datasets.length > 0 && (
        <section className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-2">
            {datasets.map((dataset) => {
              const Icon = iconFor(dataset.variable);
              const active = dataset.id === selectedId;
              return (
                <button
                  key={dataset.id}
                  type="button"
                  onClick={() => setSelectedId(dataset.id)}
                  className={`w-full rounded-xl border p-3 text-left transition-colors ${
                    active ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-400"
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-xs font-semibold">
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    {dataset.error ? dataset.id : dataset.title || dataset.id}
                  </span>
                  <span className={`mt-1 block font-mono text-[10px] ${active ? "text-zinc-300" : "text-zinc-500"}`}>
                    {dataset.id}
                  </span>
                  {dataset.error ? (
                    <span className="mt-1 block text-[10px] text-rose-500">{dataset.error}</span>
                  ) : (
                    <span className={`mt-1 block text-[10px] ${active ? "text-zinc-300" : "text-zinc-500"}`}>
                      {dataset.variable} · {dataset.unit || "dimensionless"}
                    </span>
                  )}
                </button>
              );
            })}
          </aside>

          {selected && !selected.error && <DatasetDetail dataset={selected} />}
          {selected && selected.error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-xs text-rose-700">
              INCOIS ERDDAP did not return metadata for {selected.id}: {selected.error}
            </div>
          )}
        </section>
      )}
    </main>
  );
}

function DatasetDetail({ dataset }) {
  const [series, setSeries] = React.useState(null);
  const [seriesError, setSeriesError] = React.useState(null);
  const [point, setPoint] = React.useState(null);

  const [frames, setFrames] = React.useState(null);
  const [framesError, setFramesError] = React.useState(null);

  React.useEffect(() => {
    setSeries(null);
    setSeriesError(null);
    setFrames(null);
    setFramesError(null);

    const controller = new AbortController();
    fetch(`${API_BASE}/api/research/timeseries?id=${encodeURIComponent(dataset.id)}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then((response) => {
        if (!response.ok) throw new Error(`SALTY API ${response.status}`);
        return response.json();
      })
      .then((body) => {
        setSeries(body.points || []);
        setPoint(typeof body.lat === "number" && typeof body.lon === "number" ? { lat: body.lat, lon: body.lon } : null);
      })
      .catch((error) => {
        if (error.name === "AbortError") return;
        setSeriesError(error instanceof Error ? error.message : "Time series unavailable");
      });

    fetch(`${API_BASE}/api/research/frames?id=${encodeURIComponent(dataset.id)}&count=12`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then((response) => {
        if (!response.ok) throw new Error(`SALTY API ${response.status}`);
        return response.json();
      })
      .then((body) => setFrames(body.times || []))
      .catch((error) => {
        if (error.name === "AbortError") return;
        setFramesError(error instanceof Error ? error.message : "Animation frames unavailable");
      });

    return () => controller.abort();
  }, [dataset.id]);

  const coverage = dataset.timeCoverage || {};
  const geo = dataset.geospatial;

  return (
    <section className="min-w-0 space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-bold text-zinc-950">{dataset.title}</h2>
        {dataset.summary && <p className="mt-1 text-xs text-zinc-600">{dataset.summary}</p>}
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] sm:grid-cols-4">
          <div>
            <dt className="text-zinc-400">Institution</dt>
            <dd className="font-medium text-zinc-800">{dataset.institution || "INCOIS"}</dd>
          </div>
          <div>
            <dt className="text-zinc-400">Time coverage</dt>
            <dd className="font-medium text-zinc-800">
              {coverage.time_coverage_start?.slice(0, 10)} → {coverage.time_coverage_end?.slice(0, 10)}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-400">Dimensions</dt>
            <dd className="font-medium text-zinc-800">{(dataset.dimensions || []).join(", ")}</dd>
          </div>
          {geo && (
            <div>
              <dt className="text-zinc-400">Grid extent</dt>
              <dd className="font-medium text-zinc-800">
                {geo.latMin}°–{geo.latMax}° lat, {geo.lonMin}°–{geo.lonMax}° lon · {geo.latRes}° res
              </dd>
            </div>
          )}
        </dl>

        {dataset.variables && dataset.variables.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {dataset.variables.map((variable) => (
              <span
                key={variable.name}
                title={variable.longName || undefined}
                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                  variable.name === dataset.variable
                    ? "border-sky-300 bg-sky-50 text-sky-800"
                    : "border-zinc-200 bg-zinc-50 text-zinc-600"
                }`}
              >
                {variable.name}
                {variable.units ? ` (${variable.units})` : ""}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-bold text-zinc-950">
            {dataset.variable} time series{point ? ` at (${point.lat.toFixed(2)}, ${point.lon.toFixed(2)})` : ""}
          </h3>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            Real ERDDAP values
          </span>
        </div>
        {seriesError && <p className="text-xs text-rose-600">{seriesError}</p>}
        {!series && !seriesError && <p className="text-xs text-zinc-500">Loading time series…</p>}
        {series && <TimeSeriesChart points={series} unit={dataset.unit || ""} />}
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-bold text-zinc-950">{dataset.variable} — present-state animation</h3>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            Rendered by ERDDAP
          </span>
        </div>
        {framesError && <p className="text-xs text-rose-600">{framesError}</p>}
        {!frames && !framesError && <p className="text-xs text-zinc-500">Loading animation frames…</p>}
        {frames && frames.length > 0 && <AnimationPlayer datasetId={dataset.id} frames={frames} />}
      </div>
    </section>
  );
}

function AnimationPlayer({ datasetId, frames }) {
  const urls = React.useMemo(
    () =>
      frames.map(
        (time) =>
          `${API_BASE}/api/research/frame.png?id=${encodeURIComponent(datasetId)}&time=${encodeURIComponent(time)}`
      ),
    [datasetId, frames]
  );
  const [index, setIndex] = React.useState(urls.length - 1);

  React.useEffect(() => {
    // Present state = the dataset's latest available frame.
    setIndex(urls.length - 1);
    // Preload every frame up front so stepping never shows a blank flash —
    // that flicker is what autoplay made obvious, so frames only advance
    // when the buttons below are used.
    urls.forEach((url) => {
      const image = new window.Image();
      image.src = url;
    });
  }, [urls]);

  const time = frames[index];
  const src = urls[index];
  // Argo float frames are 15-day position windows ("start|end"); everything
  // else is a single timestamp.
  const timeLabel = time.includes("|") ? time.split("|").join(" → ") : time;

  return (
    <div>
      <div className="flex min-h-[320px] items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 p-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={`Spatial map at ${time}`} className="max-h-[420px] max-w-full object-contain" />
      </div>
      <div className="mt-2 flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => setIndex((current) => Math.max(0, current - 1))}
          disabled={index === 0}
          className="inline-flex h-8 items-center gap-1 rounded-full border border-zinc-200 bg-white px-3 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Prev
        </button>
        <input
          type="range"
          min={0}
          max={frames.length - 1}
          value={index}
          onChange={(event) => setIndex(Number(event.target.value))}
          className="h-1.5 flex-1 accent-zinc-950"
        />
        <button
          type="button"
          onClick={() => setIndex((current) => Math.min(frames.length - 1, current + 1))}
          disabled={index === frames.length - 1}
          className="inline-flex h-8 items-center gap-1 rounded-full border border-zinc-200 bg-white px-3 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
        >
          Next <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-1.5 text-center font-mono text-[10px] text-zinc-500">
        {timeLabel} · frame {index + 1} of {frames.length}
      </div>
    </div>
  );
}
