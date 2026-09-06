"use client";

import * as React from "react";
import { ExternalLink, Map, RefreshCw, Satellite } from "lucide-react";
import { ERDDAP_BASE, graphWorkspaceUrl } from "@/lib/erddap";

const DATASETS = [
  { id: "jplMURSST41", name: "MUR SST Analysis", description: "Global daily SST · 0.01° · 2002–present", defaultVariable: "analysed_sst", defaultDate: "2024-01-15", latDescending: false, depth: undefined, variables: [
    { id: "analysed_sst", label: "Sea-surface temperature", unit: "°C" },
    { id: "analysis_error", label: "Analysis error", unit: "°C" },
    { id: "mask", label: "Land/sea mask", unit: "" },
    { id: "sea_ice_fraction", label: "Sea-ice fraction", unit: "" },
  ] },
  { id: "ncdcOisst2Agg", name: "NOAA OISST v2", description: "Global daily SST · 0.25° · 1982–2020", defaultVariable: "sst", defaultDate: "2019-01-15", latDescending: false, depth: 0, variables: [
    { id: "sst", label: "Sea-surface temperature", unit: "°C" },
  ] },
];

const REGIONS = {
  bay: { label: "Bay of Bengal", minLat: 8, maxLat: 22, minLon: 80, maxLon: 94 },
  arabian: { label: "Arabian Sea", minLat: 8, maxLat: 24, minLon: 60, maxLon: 76 },
  global: { label: "Global", minLat: -60, maxLat: 60, minLon: 0, maxLon: 360 },
};

export function ResearchConsole() {
  const [datasetId, setDatasetId] = React.useState(DATASETS[0].id);
  const dataset = DATASETS.find((item) => item.id === datasetId) || DATASETS[0];
  const [variable, setVariable] = React.useState(DATASETS[0].defaultVariable);
  const [date, setDate] = React.useState("2024-01-15");
  const [regionId, setRegionId] = React.useState<keyof typeof REGIONS>("bay");
  const [bounds, setBounds] = React.useState(REGIONS.bay);
  const [refresh, setRefresh] = React.useState(0);
  const selected = dataset.variables.find((item) => item.id === variable) || dataset.variables[0];

  const updateBounds = (key: "minLat" | "maxLat" | "minLon" | "maxLon", value: string) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return;
    setRegionId("bay");
    setBounds((current) => ({ ...current, [key]: number }));
  };

  const graphUrl = graphWorkspaceUrl({
    datasetId: dataset.id,
    variable,
    start: date,
    end: date,
    minLat: bounds.minLat,
    maxLat: bounds.maxLat,
    minLon: bounds.minLon,
    maxLon: bounds.maxLon,
    latDescending: dataset.latDescending,
    depth: dataset.depth,
  });
  const imageUrl = graphUrl.replace(".graph?", ".png?");

  return (
    <main className="mx-auto max-w-6xl space-y-6 pb-10">
      <header className="flex flex-col gap-3 border-b border-zinc-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-800">
            <Satellite className="h-3 w-3" /> Live NOAA ERDDAP
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">Ocean data explorer</h1>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-500">
            Explore real NOAA gridded ocean datasets. Choose a dataset, variable,
            observation date, and map bounds; the graph below is generated
            directly by ERDDAP.
          </p>
        </div>
        <a href={`${ERDDAP_BASE}/griddap/${dataset.id}.html`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 self-start rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 sm:self-auto">
          Dataset details <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </header>

      <section className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Dataset</p>
            <h2 className="mt-1 text-sm font-bold text-zinc-950">NOAA CoastWatch catalog</h2>
            <p className="mt-0.5 text-[10px] leading-relaxed text-zinc-500">Select a real dataset to explore its variables and map.</p>
          </div>
          <div className="mb-4 space-y-2">
            {DATASETS.map((item) => (
              <button key={item.id} type="button" onClick={() => { setDatasetId(item.id); setVariable(item.defaultVariable); setDate(item.defaultDate); }} className={`w-full rounded-lg border p-2.5 text-left transition-colors ${item.id === dataset.id ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-400"}`}>
                <span className="block text-xs font-semibold">{item.name}</span>
                <span className={`mt-0.5 block text-[10px] ${item.id === dataset.id ? "text-zinc-300" : "text-zinc-500"}`}>{item.description}</span>
              </button>
            ))}
          </div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500" htmlFor="variable">Variable</label>
          <select id="variable" value={variable} onChange={(event) => setVariable(event.target.value)} className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-2.5 text-xs text-zinc-900 focus:border-zinc-900 focus:outline-none">
            {dataset.variables.map((item) => <option key={item.id} value={item.id}>{item.label} ({item.id})</option>)}
          </select>
          <label className="mb-1 mt-4 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500" htmlFor="date">Observation date</label>
          <input id="date" type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-2.5 text-xs text-zinc-900 focus:border-zinc-900 focus:outline-none" />
          <label className="mb-1 mt-4 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500" htmlFor="region">Map region</label>
          <select id="region" value={regionId} onChange={(event) => { const id = event.target.value as keyof typeof REGIONS; setRegionId(id); setBounds(REGIONS[id]); }} className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-2.5 text-xs text-zinc-900 focus:border-zinc-900 focus:outline-none">
            {Object.entries(REGIONS).map(([id, region]) => <option key={id} value={id}>{region.label}</option>)}
          </select>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {(["minLat", "maxLat", "minLon", "maxLon"] as const).map((key) => (
              <label key={key} className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                {key.replace("Lat", " latitude").replace("Lon", " longitude")}
                <input type="number" step="any" value={bounds[key]} onChange={(event) => updateBounds(key, event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-zinc-200 px-2 text-xs font-normal text-zinc-900 focus:border-zinc-900 focus:outline-none" />
              </label>
            ))}
          </div>
          <button type="button" onClick={() => setRefresh((value) => value + 1)} className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-zinc-950 text-xs font-semibold text-white hover:bg-zinc-800">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh graph
          </button>
        </aside>

        <section className="min-w-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-4">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold text-zinc-950"><Map className="h-4 w-4 text-sky-600" /> {selected.label}</h2>
              <p className="mt-1 text-[11px] text-zinc-500">{dataset.name} · {date} · {bounds.label} · unit: {selected.unit || "dimensionless"}</p>
            </div>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">Real ERDDAP result</span>
          </div>
          <div className="flex min-h-[520px] items-center justify-center overflow-auto bg-zinc-50 p-4">
            <img key={refresh} src={imageUrl} alt={`${selected.label} map for ${date}`} className="max-h-[680px] max-w-full rounded-lg border border-zinc-200 bg-white object-contain" />
          </div>
          <div className="border-t border-zinc-200 px-4 py-3 text-[10px] leading-relaxed text-zinc-500">
            This image is generated by NOAA ERDDAP from the selected variable and coordinates. No synthetic fallback is used on this page.
          </div>
        </section>
      </section>
    </main>
  );
}
