"use client";

import * as React from "react";
import Link from "next/link";
import { Compass, Eye, Fish, Layers, MapPin, Sparkles, Thermometer, Waves, Wind } from "lucide-react";
import { MarineMap } from "@/components/marine-map";
import { useMarine } from "@/lib/marine-context";
import { marineLocations, pfzZones, MarineLocation } from "@/lib/marine-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type MapLayer = "sst" | "chlorophyll" | "wind" | "waves" | "currents" | "pfz";
const layerControls: { id: MapLayer; label: string; icon: React.ElementType; backend?: string }[] = [
  { id: "sst", label: "SST", icon: Thermometer, backend: "SST" },
  { id: "chlorophyll", label: "Chlorophyll", icon: Eye, backend: "chlorophyll" },
  { id: "wind", label: "Wind flow", icon: Wind, backend: "wind" },
  { id: "waves", label: "Waves", icon: Waves, backend: "wave" },
  { id: "currents", label: "Currents", icon: Compass, backend: "current" },
  { id: "pfz", label: "PFZ", icon: Fish },
];

export default function MarineMapPage() {
  const { location, setLocationId, setIsAiDrawerOpen, backendStatus, backendLayers } = useMarine();
  const [activeLayers, setActiveLayers] = React.useState<MapLayer[]>(["sst", "wind", "pfz"]);
  const [selectedStation, setSelectedStation] = React.useState<MarineLocation>(location);
  const layers = backendLayers;

  const toggle = (layer: MapLayer) => setActiveLayers((current) => current.includes(layer) ? current.filter((item) => item !== layer) : [...current, layer]);

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 border-b border-zinc-200 pb-4 sm:flex-row sm:items-center"><div><h1 className="text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">Marine Spatial Explorer</h1><p className="mt-1 text-xs text-zinc-500">Satellite basemap with source-labelled ocean layers</p></div><div className="flex items-center gap-2"><select aria-label="Select station" value={selectedStation.id} onChange={(event) => { const station = marineLocations.find((item) => item.id === event.target.value) || location; setSelectedStation(station); setLocationId(station.id); }} className="h-8 rounded-md border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-800"><option value={selectedStation.id}>{selectedStation.name}</option>{marineLocations.filter((item) => item.id !== selectedStation.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><Button size="sm" variant="outline" onClick={() => setIsAiDrawerOpen(true)} className="h-8 gap-1 text-xs"><Sparkles className="h-3 w-3" />Ask AI</Button></div></div>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-3"><div className="flex flex-wrap items-center gap-1.5"><span className="mr-2 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400"><Layers className="h-3.5 w-3.5 text-zinc-600" />Layers</span>{layerControls.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => toggle(id)} aria-pressed={activeLayers.includes(id)} className={`flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${activeLayers.includes(id) ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400"}`}><Icon className="h-3 w-3" />{label}</button>)}</div><span className={`text-[10px] font-medium ${backendStatus === "ready" ? "text-emerald-700" : "text-amber-700"}`}>{layers ? `${Object.keys(layers.layers).length} backend layers loaded` : "Waiting for backend"}</span></div>
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]"><section className="overflow-hidden rounded-xl border border-zinc-200 bg-white"><div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 py-2.5 text-xs text-zinc-500"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sky-500" />{selectedStation.name} coast</span><span className="font-sans">{selectedStation.lat.toFixed(2)}°N, {selectedStation.lon.toFixed(2)}°E</span></div><MarineMap activeLayers={activeLayers} layers={layers?.layers || {}} stations={marineLocations} pfzZones={pfzZones} selectedStation={selectedStation} onSelectStation={(station) => { setSelectedStation(station); setLocationId(station.id); }} /></section>
      <aside className="rounded-xl border border-zinc-200 bg-white"><div className="border-b border-zinc-100 p-4"><div className="flex items-center gap-2 text-xs font-semibold text-zinc-950"><MapPin className="h-4 w-4 text-sky-600" />Selected station</div><h2 className="mt-2 text-lg font-bold tracking-tight">{selectedStation.name}</h2><p className="mt-1 text-xs text-zinc-500">{selectedStation.sea} · source station</p></div><div className="grid grid-cols-2 gap-2 p-4 text-xs"><Metric label="SST" value={`${selectedStation.sst}°C`} /><Metric label="Chlorophyll" value={`${selectedStation.chlorophyll} mg/m³`} /><Metric label="Wind" value={`${selectedStation.windSpeed} kts`} /><Metric label="Wave" value={`${selectedStation.waveHeight} m`} /><Metric label="Current" value={`${selectedStation.currentSpeed} m/s`} /><Metric label="Risk" value={`${selectedStation.riskScore}/100`} /></div><div className="border-t border-zinc-100 p-4"><Badge variant="minimal" className="text-[10px]">Layer data</Badge><p className="mt-2 text-xs leading-relaxed text-zinc-600">Click a station or PFZ marker to inspect its location. Toggle layers to compare returned spatial fields.</p><Link href="/app/weather" className="mt-4 block"><Button variant="outline" size="sm" className="w-full text-xs">Detailed forecast</Button></Link></div></aside></div>
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-md border border-zinc-200 bg-zinc-50 p-2.5"><span className="block text-[10px] text-zinc-400">{label}</span><span className="mt-1 block font-semibold text-zinc-900">{value}</span></div>; }
