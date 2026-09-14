"use client";

/**
 * Research data.
 *
 * Everything comes from the SALTY backend's /api/research/* endpoints, which
 * read the real INCOIS ERDDAP server. There is no synthetic fallback: a dataset
 * that fails to load shows the real error instead of a made-up series or image.
 */

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TimeSeriesChart } from "@/components/research/charts";
import { KnowMore } from "@/components/ui/know-more";

const API_BASE = process.env.NEXT_PUBLIC_SALTY_API_URL || "http://127.0.0.1:8010";

function readJson(url, signal) {
  return fetch(url, { signal, cache: "no-store" }).then((response) => {
    if (!response.ok) throw new Error(`SALTY API ${response.status}`);
    return response.json();
  });
}

function year(value) {
  return value ? value.slice(0, 10) : "—";
}

export function ResearchCatalog() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requested = searchParams.get("dataset");

  const [catalog, setCatalog] = React.useState({ loaded: false, datasets: [], error: null });
  const [chosenId, setChosenId] = React.useState(null);
  const detailRef = React.useRef(null);

  React.useEffect(() => {
    const controller = new AbortController();
    readJson(`${API_BASE}/api/research/catalog`, controller.signal)
      .then((body) => setCatalog({ loaded: true, datasets: body.datasets || [], error: null }))
      .catch((error) => {
        if (error.name !== "AbortError") {
          setCatalog({ loaded: true, datasets: [], error: error.message || "Could not reach the SALTY data API" });
        }
      });
    return () => controller.abort();
  }, []);

  // The link wins, then the last pick, then the first dataset.
  const selectedId =
    chosenId ||
    (requested && catalog.datasets.some((item) => item.id === requested) ? requested : null) ||
    catalog.datasets[0]?.id ||
    null;
  const selected = catalog.datasets.find((item) => item.id === selectedId) || null;

  const choose = (id) => {
    setChosenId(id);
    router.replace(`/app/research?dataset=${encodeURIComponent(id)}`, { scroll: false });
    if (window.matchMedia("(max-width: 1023px)").matches) {
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="space-y-10">
      <header className="grid gap-4 border-b border-[#0b0b0c] pb-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <span className="sw-index">Researcher · INCOIS ERDDAP</span>
          <h1 className="sw-page-title mt-2">Research data</h1>
        </div>
        <div className="flex items-end lg:col-span-4 lg:justify-end">
          <span className="sw-label">
            {catalog.loaded ? `${catalog.datasets.length} datasets · live` : "Loading catalogue"}
          </span>
        </div>
      </header>

      {catalog.error && (
        <p className="border-l-2 border-[#d0182a] pl-3 text-[#d0182a]">Catalogue unavailable: {catalog.error}</p>
      )}

      {catalog.datasets.length > 0 && (
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
          <nav aria-label="Datasets" className="min-w-0 lg:col-span-4">
            <ol className="border-t border-[#0b0b0c]">
              {catalog.datasets.map((dataset, index) => {
                const active = dataset.id === selectedId;
                return (
                  <li key={dataset.id}>
                    <button
                      type="button"
                      onClick={() => choose(dataset.id)}
                      aria-current={active ? "true" : undefined}
                      className={`sw-press grid w-full grid-cols-[2rem_1fr] gap-3 border-b border-[#dcd9d1] px-3 py-3 text-left ${
                        active ? "bg-[#0b0b0c] text-white" : "hover:bg-white"
                      }`}
                    >
                      <span className={`sw-num pt-0.5 text-[11px] font-semibold tracking-[0.12em] ${active ? "text-white/60" : "text-[#6d6c70]"}`}>
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{dataset.title || dataset.id}</span>
                        <span className={`block truncate font-mono text-xs ${active ? "text-white/60" : "text-[#6d6c70]"}`}>
                          {dataset.error ? "unavailable" : `${dataset.variable || "—"}${dataset.unit ? ` · ${dataset.unit}` : ""}`}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          <div ref={detailRef} className="min-w-0 scroll-mt-4 lg:col-span-8">
            {selected && !selected.error && <DatasetDetail key={selected.id} dataset={selected} />}
            {selected && selected.error && (
              <p className="border-l-2 border-[#d0182a] pl-3 text-[#d0182a]">
                INCOIS ERDDAP did not return metadata for {selected.id}: {selected.error}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DatasetDetail({ dataset }) {
  const [series, setSeries] = React.useState({ loaded: false, points: [], point: null, error: null });
  const [frames, setFrames] = React.useState({ loaded: false, times: [], error: null });

  React.useEffect(() => {
    const controller = new AbortController();
    readJson(`${API_BASE}/api/research/timeseries?id=${encodeURIComponent(dataset.id)}`, controller.signal)
      .then((body) =>
        setSeries({
          loaded: true,
          points: body.points || [],
          point: typeof body.lat === "number" && typeof body.lon === "number" ? { lat: body.lat, lon: body.lon } : null,
          error: null,
        })
      )
      .catch((error) => {
        if (error.name !== "AbortError") setSeries({ loaded: true, points: [], point: null, error: error.message });
      });
    readJson(`${API_BASE}/api/research/frames?id=${encodeURIComponent(dataset.id)}&count=12`, controller.signal)
      .then((body) => setFrames({ loaded: true, times: body.times || [], error: null }))
      .catch((error) => {
        if (error.name !== "AbortError") setFrames({ loaded: true, times: [], error: error.message });
      });
    return () => controller.abort();
  }, [dataset.id]);

  const coverage = dataset.timeCoverage || {};
  const geo = dataset.geospatial;
  const variables = dataset.variables || [];

  return (
    <article className="space-y-8">
      <header>
        <span className="sw-label font-mono normal-case tracking-normal">{dataset.id}</span>
        <h2 className="sw-serif mt-1 text-3xl leading-tight sm:text-4xl">{dataset.title || dataset.id}</h2>
      </header>

      <dl className="grid grid-cols-2 gap-px border border-[#dcd9d1] bg-[#dcd9d1] md:grid-cols-4">
        {[
          ["Variable", dataset.variable || "—"],
          ["Unit", dataset.unit || "—"],
          ["Coverage", `${year(coverage.time_coverage_start)} → ${year(coverage.time_coverage_end)}`],
          ["Grid", geo ? `${geo.latMin}°–${geo.latMax}° · ${geo.lonMin}°–${geo.lonMax}°` : "—"],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0 bg-white p-4">
            <dt className="sw-label">{label}</dt>
            <dd className="sw-num mt-2 break-words text-base font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      <section className="sw-panel p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="sw-label text-[#0b0b0c]">Time series · {dataset.variable}</h3>
          {series.point && (
            <span className="sw-label sw-num">
              {series.point.lat.toFixed(2)}°, {series.point.lon.toFixed(2)}°
            </span>
          )}
        </div>
        {!series.loaded && <p className="py-10 text-center text-sm text-[#6d6c70]">Loading series</p>}
        {series.error && <p className="border-l-2 border-[#d0182a] pl-3 text-[#d0182a]">{series.error}</p>}
        {series.loaded && !series.error && <TimeSeriesChart points={series.points} unit={dataset.unit || ""} />}
      </section>

      <section className="sw-panel p-4 sm:p-6">
        <h3 className="sw-label mb-4 text-[#0b0b0c]">Spatial field · {dataset.variable}</h3>
        {!frames.loaded && <p className="py-10 text-center text-sm text-[#6d6c70]">Loading frames</p>}
        {frames.error && <p className="border-l-2 border-[#d0182a] pl-3 text-[#d0182a]">{frames.error}</p>}
        {frames.loaded && frames.times.length > 0 && (
          <FramePlayer key={dataset.id} datasetId={dataset.id} frames={frames.times} />
        )}
      </section>

      {variables.length > 0 && (
        <section>
          <h3 className="sw-label mb-3 text-[#0b0b0c]">Variables · {variables.length}</h3>
          <VariableTable rows={variables.slice(0, 3)} primary={dataset.variable} />
          {variables.length > 3 && (
            <KnowMore summary={`${variables.length - 3} more variables`}>
              <VariableTable rows={variables.slice(3)} primary={dataset.variable} />
            </KnowMore>
          )}
        </section>
      )}

      {dataset.summary && dataset.summary !== dataset.title && (
        <KnowMore summary="Dataset summary">
          <p>{dataset.summary}</p>
          {dataset.institution && <p className="sw-label mt-3">{dataset.institution}</p>}
        </KnowMore>
      )}
    </article>
  );
}

function VariableTable({ rows, primary }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <tbody className="divide-y divide-[#dcd9d1] border-y border-[#dcd9d1]">
          {rows.map((variable) => (
            <tr key={variable.name}>
              <td className="py-2.5 pr-4 font-mono text-xs font-semibold">
                {variable.name}
                {variable.name === primary && <span className="sw-label ml-2">primary</span>}
              </td>
              <td className="px-2 py-2.5 text-[#3a393e]">{variable.units || "—"}</td>
              <td className="max-w-xs truncate py-2.5 pl-2 text-[#6d6c70]" title={variable.longName || undefined}>
                {variable.longName || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FramePlayer({ datasetId, frames }) {
  const urls = React.useMemo(
    () =>
      frames.map(
        (time) => `${API_BASE}/api/research/frame.png?id=${encodeURIComponent(datasetId)}&time=${encodeURIComponent(time)}`
      ),
    [datasetId, frames]
  );
  // Present state is the latest frame; the component is keyed per dataset.
  const [index, setIndex] = React.useState(frames.length - 1);

  React.useEffect(() => {
    // Preload so stepping never flashes blank.
    urls.forEach((url) => {
      const image = new window.Image();
      image.src = url;
    });
  }, [urls]);

  const time = frames[index];
  const label = time.includes("|") ? time.split("|").join(" → ") : time;

  return (
    <div>
      <div className="flex min-h-[280px] items-center justify-center border border-[#dcd9d1] bg-[#f6f5f1] p-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={urls[index]} alt={`Spatial field at ${time}`} className="max-h-[440px] max-w-full object-contain" />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIndex((current) => Math.max(0, current - 1))}
          disabled={index === 0}
          aria-label="Previous frame"
          className="sw-press flex h-10 w-10 shrink-0 items-center justify-center border border-[#0b0b0c] hover:bg-[#0b0b0c] hover:text-white disabled:opacity-30"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={1.75} />
        </button>
        <input
          type="range"
          min={0}
          max={frames.length - 1}
          value={index}
          onChange={(event) => setIndex(Number(event.target.value))}
          className="h-1 min-w-0 flex-1 accent-[#0b0b0c]"
          aria-label="Frame"
        />
        <button
          type="button"
          onClick={() => setIndex((current) => Math.min(frames.length - 1, current + 1))}
          disabled={index === frames.length - 1}
          aria-label="Next frame"
          className="sw-press flex h-10 w-10 shrink-0 items-center justify-center border border-[#0b0b0c] hover:bg-[#0b0b0c] hover:text-white disabled:opacity-30"
        >
          <ChevronRight className="h-5 w-5" strokeWidth={1.75} />
        </button>
      </div>
      <p className="sw-label sw-num mt-2 text-center">
        {label} · {index + 1}/{frames.length}
      </p>
    </div>
  );
}
