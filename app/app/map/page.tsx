"use client";

import * as React from "react";
import Link from "next/link";
import {
  Compass,
  Eye,
  Fish,
  Layers,
  MapPin,
  Sparkles,
  Thermometer,
  Waves,
  Wind,
  ShieldAlert,
  Navigation,
  AlertTriangle,
} from "lucide-react";
import { MarineMap, MapLayer } from "@/components/marine-map";
import { useMarine } from "@/lib/marine-context";
import {
  marineLocations,
  pfzZones,
  geofenceZones,
  MarineLocation,
} from "@/lib/marine-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const layerControls: {
  id: MapLayer;
  label: string;
  icon: React.ElementType;
  color?: string;
}[] = [
  { id: "geofence", label: "Geofences & IMBL", icon: ShieldAlert, color: "#ef4444" },
  { id: "pfz", label: "PFZ Catch Zones", icon: Fish, color: "#eab308" },
  { id: "sst", label: "SST Fronts", icon: Thermometer, color: "#f97316" },
  { id: "wind", label: "Wind Stream", icon: Wind, color: "#38bdf8" },
  { id: "chlorophyll", label: "Chlorophyll", icon: Eye, color: "#22c55e" },
  { id: "waves", label: "Wave State", icon: Waves, color: "#818cf8" },
  { id: "currents", label: "Currents", icon: Compass, color: "#14b8a6" },
];

function getGeofenceProximity(station: MarineLocation) {
  const distances = geofenceZones.map((z) => {
    const minD = Math.min(
      ...z.points.map((p) => {
        const dLat = (p.lat - station.lat) * 60;
        const dLon = (p.lon - station.lon) * 60 * Math.cos((station.lat * Math.PI) / 180);
        return Math.sqrt(dLat * dLat + dLon * dLon);
      })
    );
    return { zone: z, distanceNM: Math.round(minD) };
  });

  distances.sort((a, b) => a.distanceNM - b.distanceNM);
  const nearest = distances[0];
  const imbl = distances.find((d) => d.zone.id === "geo-imbl-srilanka");

  return {
    nearestZone: nearest.zone,
    nearestDistanceNM: nearest.distanceNM,
    imblDistanceNM: imbl ? imbl.distanceNM : 120,
    isCaution: nearest.distanceNM < 25,
  };
}

export default function MarineMapPage() {
  const { role, location, setLocationId, setIsAiDrawerOpen, backendStatus, backendLayers, refreshBackendLayers } =
    useMarine();
  const isFisherman = role === "fisherman";

  const [activeLayers, setActiveLayers] = React.useState<MapLayer[]>([
    "geofence",
    "pfz",
    "sst",
    "wind",
  ]);
  const [selectedStation, setSelectedStation] = React.useState<MarineLocation>(location);
  const layers = backendLayers;

  const effectiveActiveLayers = React.useMemo(() => {
    return isFisherman ? activeLayers : activeLayers.filter((l) => l !== "geofence");
  }, [activeLayers, isFisherman]);

  const visibleLayerControls = React.useMemo(() => {
    return layerControls.filter((layer) => layer.id !== "geofence" || isFisherman);
  }, [isFisherman]);

  const toggle = (layer: MapLayer) => {
    if (layer === "geofence" && !isFisherman) return;
    setActiveLayers((current) =>
      current.includes(layer)
        ? current.filter((item) => item !== layer)
        : [...current, layer]
    );
  };

  const proximity = React.useMemo(() => {
    return getGeofenceProximity(selectedStation);
  }, [selectedStation]);

  const nearbyPFZ = React.useMemo(() => {
    return (
      pfzZones.find((z) => z.referencePort === selectedStation.name) || pfzZones[0]
    );
  }, [selectedStation]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-zinc-200 pb-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {isFisherman && effectiveActiveLayers.includes("geofence") && (
              <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] px-1.5 py-0">
                Geofencing Active
              </Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
            Marine Spatial Explorer
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <select
            aria-label="Select station"
            value={selectedStation.id}
            onChange={(event) => {
              const station =
                marineLocations.find((item) => item.id === event.target.value) || location;
              setSelectedStation(station);
              setLocationId(station.id);
            }}
            className="h-8 rounded-md border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-800"
          >
            <option value={selectedStation.id}>{selectedStation.name}</option>
            {marineLocations
              .filter((item) => item.id !== selectedStation.id)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
          </select>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsAiDrawerOpen(true)}
            className="h-8 gap-1 text-xs"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Ask AI</span>
          </Button>
        </div>
      </div>

      {/* Layer Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-2 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            <Layers className="h-3.5 w-3.5 text-zinc-600" />
            Layers
          </span>
          {visibleLayerControls.map(({ id, label, icon: Icon }) => {
            const isActive = effectiveActiveLayers.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggle(id)}
                aria-pressed={isActive}
                className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? id === "geofence"
                      ? "border-rose-900 bg-rose-900 text-white shadow-xs"
                      : "border-zinc-900 bg-zinc-900 text-white shadow-xs"
                    : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-zinc-500">
          <span className={`h-2 w-2 rounded-full ${backendStatus === "ready" ? "bg-emerald-500" : backendStatus === "loading" ? "bg-amber-400 animate-pulse" : "bg-rose-500"}`} />
          <span>{backendStatus === "ready" ? "Live telemetry connected" : backendStatus === "loading" ? "Loading telemetry…" : "Telemetry offline"}</span>
          {backendStatus === "offline" && (
            <button type="button" onClick={refreshBackendLayers} className="font-medium text-zinc-900 underline underline-offset-2">
              Retry
            </button>
          )}
        </div>
      </div>

      {/* Main Map View and Inspector Sidebar */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        {/* Map Container */}
        <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs">
          <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 py-2.5 text-xs text-zinc-600">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="h-2 w-2 rounded-full bg-sky-500" />
              {selectedStation.name} Marine Sector
            </span>
            <span className="font-sans text-zinc-500">
              {selectedStation.lat.toFixed(2)}°N, {selectedStation.lon.toFixed(2)}°E
            </span>
          </div>

          <MarineMap
            activeLayers={effectiveActiveLayers}
            layers={layers?.layers || {}}
            stations={marineLocations}
            pfzZones={pfzZones}
            geofences={isFisherman ? geofenceZones : []}
            selectedStation={selectedStation}
            onSelectStation={(station) => {
              setSelectedStation(station);
              setLocationId(station.id);
            }}
          />
        </section>

        {/* Right Inspector Sidebar */}
        <aside className="space-y-4">
          {/* Station Card */}
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-950">
                <MapPin className="h-4 w-4 text-sky-600" />
                <span>Current Station</span>
              </div>
              <Badge variant="minimal" className="text-[10px]">
                {selectedStation.sea}
              </Badge>
            </div>

            <div className="mt-3">
              <h2 className="text-base font-bold text-zinc-950">{selectedStation.name}</h2>
              <p className="text-xs text-zinc-500 font-sans">
                {selectedStation.lat.toFixed(2)}°N, {selectedStation.lon.toFixed(2)}°E
              </p>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-sans">
              <div className="rounded-md border border-zinc-200 bg-zinc-50 p-2">
                <span className="block text-[10px] text-zinc-400 uppercase">SST</span>
                <span className="font-semibold text-zinc-900">{selectedStation.sst}°C</span>
              </div>
              <div className="rounded-md border border-zinc-200 bg-zinc-50 p-2">
                <span className="block text-[10px] text-zinc-400 uppercase">Wind</span>
                <span className="font-semibold text-zinc-900">
                  {selectedStation.windSpeed} kts {selectedStation.windDirection}
                </span>
              </div>
              <div className="rounded-md border border-zinc-200 bg-zinc-50 p-2">
                <span className="block text-[10px] text-zinc-400 uppercase">Wave (SWH)</span>
                <span className="font-semibold text-zinc-900">{selectedStation.waveHeight} m</span>
              </div>
              <div className="rounded-md border border-zinc-200 bg-zinc-50 p-2">
                <span className="block text-[10px] text-zinc-400 uppercase">Marine Risk</span>
                <span
                  className={`font-semibold ${
                    selectedStation.riskLevel === "Low"
                      ? "text-emerald-700"
                      : "text-amber-700"
                  }`}
                >
                  {selectedStation.riskScore}/100
                </span>
              </div>
            </div>
          </div>

          {/* Integrated Geofencing Proximity Card - Fishermen Only */}
          {isFisherman && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/30 p-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-rose-100 pb-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-950">
                  <ShieldAlert className="h-4 w-4 text-rose-600" />
                  <span>Geofencing & Boundary Watch</span>
                </div>
                <Badge
                  className={`text-[10px] px-1.5 py-0 ${
                    proximity.isCaution
                      ? "bg-rose-600 text-white"
                      : "bg-emerald-600 text-white"
                  }`}
                >
                  {proximity.isCaution ? "Caution Area" : "Clear Passage"}
                </Badge>
              </div>

              <div className="mt-3 space-y-2.5 text-xs">
                <div className="p-2.5 rounded-lg border border-rose-200/80 bg-white">
                  <span className="text-[10px] text-zinc-500 block uppercase font-sans">
                    Nearest Restricted Zone
                  </span>
                  <div className="font-semibold text-zinc-950 mt-0.5">
                    {proximity.nearestZone.name}
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[11px] font-sans">
                    <span className="text-zinc-600">
                      Proximity: <strong>{proximity.nearestDistanceNM} NM</strong>
                    </span>
                    <span className="text-rose-700 font-medium">
                      {proximity.nearestZone.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1 line-clamp-2">
                    {proximity.nearestZone.description}
                  </p>
                </div>

                <div className="p-2.5 rounded-lg border border-zinc-200 bg-white flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-zinc-500 block font-sans">
                      Distance to IMBL (Sri Lanka)
                    </span>
                    <span className="font-bold text-zinc-900 text-sm">
                      {proximity.imblDistanceNM} NM
                    </span>
                  </div>
                  <Badge
                    variant="minimal"
                    className={
                      proximity.imblDistanceNM < 25
                        ? "bg-rose-50 text-rose-700 border-rose-200 text-[10px]"
                        : "bg-zinc-100 text-zinc-700 text-[10px]"
                    }
                  >
                    {proximity.imblDistanceNM < 25 ? "Border Warning" : "International Waters"}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* Operator Card: Disaster Prediction & Early Warning */}
          {role === "operator" && (
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-950">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span>Disaster Early Warning</span>
                </div>
                <Badge variant="minimal" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                  Surveillance Active
                </Badge>
              </div>
              <p className="text-xs text-zinc-600 mt-2.5 leading-relaxed">
                Real-time IMD / INCOIS early detection for the {selectedStation.name} sector. Monitor severe weather alerts, storm surges, and coastal safety.
              </p>
              <Link href="/app/alerts" className="mt-3 block">
                <Button variant="outline" size="sm" className="w-full text-xs h-7.5 border-zinc-200 hover:bg-zinc-50">
                  Open Disaster Prediction Radar →
                </Button>
              </Link>
            </div>
          )}

          {/* Researcher Card: Ocean Remote Sensing */}
          {role === "researcher" && (
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-950">
                  <Eye className="h-4 w-4 text-purple-600" />
                  <span>Ocean Remote Sensing</span>
                </div>
                <Badge variant="minimal" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px]">
                  ERDDAP Grid
                </Badge>
              </div>
              <div className="mt-2.5 space-y-2 text-xs font-sans">
                <div className="flex justify-between text-zinc-600">
                  <span>Chlorophyll-a:</span>
                  <span className="font-semibold text-zinc-900">{selectedStation.chlorophyll} mg/m³</span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>Current Speed:</span>
                  <span className="font-semibold text-zinc-900">{selectedStation.currentSpeed} m/s</span>
                </div>
              </div>
              <Link href="/app/research" className="mt-3 block">
                <Button variant="outline" size="sm" className="w-full text-xs h-7.5 border-zinc-200 hover:bg-zinc-50">
                  Explore ERDDAP Datasets →
                </Button>
              </Link>
            </div>
          )}

          {/* Quick PFZ Route Action */}
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-950">
                <Fish className="h-4 w-4 text-emerald-600" />
                <span>PFZ Catch Recommendation</span>
              </div>
              <Badge className="bg-emerald-600 text-white text-[10px] px-1.5 py-0">
                {nearbyPFZ.suitabilityScore}%
              </Badge>
            </div>

            <p className="text-xs text-zinc-600 mt-2">
              <strong>{nearbyPFZ.name}</strong> is {nearbyPFZ.distanceNM} NM bearing{" "}
              {nearbyPFZ.bearing}.
            </p>

            <Link href="/app/fishing-zones" className="mt-3 block">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs h-7.5 gap-1.5 border-zinc-200 hover:bg-zinc-100"
              >
                <Navigation className="h-3.5 w-3.5" />
                <span>View Full Fishing Advisory</span>
              </Button>
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
