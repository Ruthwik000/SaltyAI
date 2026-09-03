"use client";

import * as React from "react";
import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, Map as MapLibreMap, MapLayerMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { MapLayerRecord } from "@/lib/api";
import type { MarineLocation, PFZZone } from "@/lib/marine-data";

type Layer = "sst" | "chlorophyll" | "wind" | "waves" | "currents" | "pfz" | "geofence";

const sourceNames: Record<string, string> = { SST: "sst", chlorophyll: "chlorophyll", wind: "wind", wave: "waves", current: "currents", swell: "swell" };
const layerColors: Record<string, string> = { SST: "#f97316", chlorophyll: "#22c55e", wind: "#38bdf8", wave: "#818cf8", current: "#14b8a6", swell: "#a78bfa" };

function pointFeature(record: MapLayerRecord) {
  return { type: "Feature", geometry: { type: "Point", coordinates: [record.longitude, record.latitude] }, properties: { value: record.value, unit: record.unit, timestamp: record.timestamp, dataset: record.dataset, variable: record.variable } };
}

export function MarineMap({ activeLayers, layers, stations, pfzZones, selectedStation, onSelectStation }: { activeLayers: Layer[]; layers: Record<string, MapLayerRecord[]>; stations: MarineLocation[]; pfzZones: PFZZone[]; selectedStation: MarineLocation; onSelectStation: (station: MarineLocation) => void }) {
  const mapNode = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<MapLibreMap | null>(null);
  const particleCanvas = React.useRef<HTMLCanvasElement>(null);
  const onSelectStationRef = React.useRef(onSelectStation);
  React.useEffect(() => {
    onSelectStationRef.current = onSelectStation;
  }, [onSelectStation]);
  const initialStationRef = React.useRef(selectedStation);

  React.useEffect(() => {
    if (!mapNode.current || mapRef.current) return;
    const initial = initialStationRef.current;
    const map = new maplibregl.Map({
      container: mapNode.current,
      center: [initial.lon, initial.lat],
      zoom: 5.25,
      minZoom: 3,
      maxZoom: 12,
      attributionControl: false,
      style: {
        version: 8,
        sources: {
          satellite: {
            type: "raster",
            tiles: [
              "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
            attribution: "Esri World Imagery",
          },
        },
        layers: [{ id: "satellite", type: "raster", source: "satellite" }],
      },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "nautical" }), "bottom-right");
    map.on("load", () => {
      stations.forEach((station) => {
        const marker = new maplibregl.Marker({
          color: station.id === initial.id ? "#0ea5e9" : "#ffffff",
        })
          .setLngLat([station.lon, station.lat])
          .setPopup(
            new maplibregl.Popup({ offset: 14 }).setHTML(
              `<strong>${station.name}</strong><br/>SST ${station.sst}°C · Wind ${station.windSpeed} kts`
            )
          )
          .addTo(map);
        marker.getElement().addEventListener("click", () => onSelectStationRef.current(station));
      });
      const pfzSource = {
        type: "FeatureCollection",
        features: pfzZones.map((zone) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [zone.lon, zone.lat] },
          properties: { name: zone.name, score: zone.suitabilityScore },
        })),
      } as GeoJSON.GeoJSON;
      map.addSource("pfz", { type: "geojson", data: pfzSource });
      map.addLayer({
        id: "pfz-points",
        type: "circle",
        source: "pfz",
        paint: {
          "circle-radius": 7,
          "circle-color": "#facc15",
          "circle-stroke-color": "#fff",
          "circle-stroke-width": 1.5,
          "circle-opacity": 0.9,
        },
      });
      map.on("click", "pfz-points", (event: MapLayerMouseEvent) => {
        const feature = event.features?.[0];
        if (feature)
          new maplibregl.Popup()
            .setLngLat((feature.geometry as GeoJSON.Point).coordinates as [number, number])
            .setHTML(`<strong>${feature.properties?.name}</strong><br/>Suitability ${feature.properties?.score}%`)
            .addTo(map);
      });
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [pfzZones, stations]);

  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const update = () => {
      Object.entries(layers).forEach(([parameter, records]) => {
        const sourceId = `backend-${parameter}`;
        const mapLayer = sourceNames[parameter];
        if (!mapLayer || !records?.length) return;
        const data = { type: "FeatureCollection", features: records.map(pointFeature) } as GeoJSON.GeoJSON;
        const source = map.getSource(sourceId) as GeoJSONSource | undefined;
        if (source) source.setData(data);
        else {
          map.addSource(sourceId, { type: "geojson", data });
          map.addLayer({ id: sourceId, type: "circle", source: sourceId, paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 3, 8, 7], "circle-color": layerColors[parameter] || "#38bdf8", "circle-opacity": 0.72, "circle-stroke-color": "#ffffff", "circle-stroke-width": 0.8 }, layout: { visibility: activeLayers.includes(mapLayer as Layer) ? "visible" : "none" } });
        }
        if (map.getLayer(sourceId)) map.setLayoutProperty(sourceId, "visibility", activeLayers.includes(mapLayer as Layer) ? "visible" : "none");
      });
      if (map.getLayer("pfz-points")) map.setLayoutProperty("pfz-points", "visibility", activeLayers.includes("pfz") ? "visible" : "none");
    };
    if (map.isStyleLoaded()) update(); else map.once("load", update);
  }, [activeLayers, layers]);

  React.useEffect(() => {
    const canvas = particleCanvas.current;
    const host = mapNode.current;
    if (!canvas || !host) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    let frame = 0;
    const returnedWind = Number(layers.wind?.[0]?.value);
    const windSpeed = Number.isFinite(returnedWind) ? Math.max(0.25, Math.min(returnedWind / 12, 2.5)) : 0.8;
    const particles = Array.from({ length: 260 }, (_, index) => ({ x: (index * 71) % 1000, y: (index * 137) % 520, length: 4 + (index % 8), speed: windSpeed * (0.7 + (index % 6) / 8) }));
    const resize = () => { canvas.width = host.clientWidth * devicePixelRatio; canvas.height = host.clientHeight * devicePixelRatio; context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0); };
    resize(); window.addEventListener("resize", resize);
    const draw = () => { const width = host.clientWidth; const height = host.clientHeight; context.clearRect(0, 0, width, height); if (activeLayers.includes("wind")) { context.strokeStyle = "rgba(210,242,255,.7)"; context.lineWidth = 1; particles.forEach((particle) => { const x = particle.x % width; const y = particle.y % height; context.beginPath(); context.moveTo(x, y); context.lineTo(x + particle.length, y - particle.length * 0.45); context.stroke(); particle.x += particle.speed; particle.y -= particle.speed * 0.45; if (particle.x > width + 10) particle.x = -10; if (particle.y < -10) particle.y = height + 10; }); } frame = requestAnimationFrame(draw); };
    draw();
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", resize); };
  }, [activeLayers, layers]);

  React.useEffect(() => { mapRef.current?.flyTo({ center: [selectedStation.lon, selectedStation.lat], duration: 700 }); }, [selectedStation.lat, selectedStation.lon]);

  return <div className="relative h-[520px] w-full overflow-hidden bg-sky-950"><div ref={mapNode} className="absolute inset-0" /><canvas ref={particleCanvas} className="pointer-events-none absolute inset-0 h-full w-full" /><div className="pointer-events-none absolute left-4 top-4 z-10 rounded-md border border-white/20 bg-zinc-950/65 px-3 py-2 text-[10px] text-white backdrop-blur-sm"><div className="font-semibold tracking-wide">NORTH INDIAN OCEAN</div><div className="mt-1 text-sky-200">Satellite base · live layer overlay</div></div><div className="pointer-events-none absolute bottom-4 left-4 z-10 rounded-md border border-white/20 bg-zinc-950/70 px-3 py-2 text-[10px] text-white backdrop-blur-sm"><div className="mb-1 font-semibold">WIND FLOW</div><div className="flex items-center gap-2"><span className="h-1.5 w-8 rounded bg-sky-200" /><span>stream direction</span></div></div></div>;
}
