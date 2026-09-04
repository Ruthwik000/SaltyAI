"use client";

import * as React from "react";
import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, Map as MapLibreMap, MapLayerMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { MapLayerRecord } from "@/lib/api";
import { geofenceZones, GeofenceZone, MarineLocation, PFZZone } from "@/lib/marine-data";
import { ShieldAlert, Layers } from "lucide-react";

export type MapLayer =
  | "sst"
  | "chlorophyll"
  | "wind"
  | "waves"
  | "swell"
  | "currents"
  | "pfz"
  | "geofence";

interface MarineMapProps {
  activeLayers: MapLayer[];
  layers: Record<string, MapLayerRecord[]>;
  stations: MarineLocation[];
  pfzZones: PFZZone[];
  geofences?: GeofenceZone[];
  selectedStation: MarineLocation;
  onSelectStation: (station: MarineLocation) => void;
}

const sourceNames: Record<string, MapLayer> = {
  SST: "sst",
  chlorophyll: "chlorophyll",
  wind: "wind",
  wave: "waves",
  swell: "swell",
  current: "currents",
};

const layerColors: Record<string, string> = {
  SST: "#f97316",
  chlorophyll: "#22c55e",
  wind: "#38bdf8",
  wave: "#818cf8",
  current: "#14b8a6",
  swell: "#a78bfa",
};

const heatmapColors: Record<string, string[]> = {
  SST: ["#24126a", "#2146c7", "#12a7d4", "#72d55b", "#f4e64c", "#ef762f"],
  chlorophyll: ["#071b4a", "#064b8f", "#00a6a6", "#53c653", "#d8e64b", "#f4a340"],
  wind: ["#111b69", "#154cc1", "#16b6dc", "#53d6c1", "#f3e95b", "#eb552d"],
  wave: ["#17105b", "#2d55c8", "#1cb6d0", "#75d36d", "#f2df51", "#e85b32"],
  swell: ["#17105b", "#3846bd", "#169dd0", "#7dca71", "#e6d553", "#e45535"],
  current: ["#17105b", "#2254c1", "#12b8d0", "#58d18a", "#e9e34e", "#e95f32"],
};

function pointFeature(record: MapLayerRecord) {
  return {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [record.longitude, record.latitude],
    },
    properties: {
      value: record.value,
      unit: record.unit,
      timestamp: record.timestamp,
      dataset: record.dataset,
      variable: record.variable,
    },
  };
}

export function MarineMap({
  activeLayers,
  layers,
  stations,
  pfzZones,
  geofences = geofenceZones,
  selectedStation,
  onSelectStation,
}: MarineMapProps) {
  const mapNode = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<MapLibreMap | null>(null);
  const particleCanvas = React.useRef<HTMLCanvasElement>(null);
  const [basemap, setBasemap] = React.useState<"openmap" | "satellite">("openmap");
  const [mapError, setMapError] = React.useState<string | null>(null);

  const onSelectStationRef = React.useRef(onSelectStation);
  React.useEffect(() => {
    onSelectStationRef.current = onSelectStation;
  }, [onSelectStation]);

  const initialStationRef = React.useRef(selectedStation);

  // Initialize MapLibre GL map with OpenStreetMap + OpenSeaMap + Satellite raster sources
  React.useEffect(() => {
    if (!mapNode.current || mapRef.current) return;
    const initial = initialStationRef.current;

    try {
      const map = new maplibregl.Map({
      container: mapNode.current,
      center: [initial.lon, initial.lat],
      zoom: 5.25,
      minZoom: 3,
      maxZoom: 14,
      attributionControl: false,
      style: {
        version: 8,
        sources: {
          // OpenStreetMap standard tiles (open map base)
          osm: {
            type: "raster",
            tiles: [
              "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
            ],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
          // OpenSeaMap marine marks overlay (buoys, beacons, seamarks)
          openseamap: {
            type: "raster",
            tiles: [
              "https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png",
            ],
            tileSize: 256,
            attribution: "© OpenSeaMap contributors",
          },
          // Esri satellite imagery
          satellite: {
            type: "raster",
            tiles: [
              "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
            attribution: "Esri World Imagery",
          },
        },
        layers: [
          {
            id: "osm-base",
            type: "raster",
            source: "osm",
            layout: { visibility: "visible" },
          },
          {
            id: "openseamap-marks",
            type: "raster",
            source: "openseamap",
            layout: { visibility: "visible" },
          },
          {
            id: "satellite-base",
            type: "raster",
            source: "satellite",
            layout: { visibility: "none" },
          },
        ],
      },
    });

      map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");
      map.addControl(new maplibregl.ScaleControl({ unit: "nautical" }), "bottom-right");
      map.on("error", (event) => {
        setMapError(event.error?.message || "Map tiles are unavailable");
      });

    map.on("load", () => {
      // 1. Add Station Markers
      stations.forEach((station) => {
        const marker = new maplibregl.Marker({
          color: station.id === initial.id ? "#0284c7" : "#475569",
        })
          .setLngLat([station.lon, station.lat])
          .setPopup(
            new maplibregl.Popup({ offset: 14 }).setHTML(
              `<div style="font-family: sans-serif; font-size: 11px; padding: 2px;">
                <div style="font-weight: bold; color: #09090b; font-size: 12px;">${station.name}</div>
                <div style="color: #64748b; font-size: 10px; margin-top: 2px;">${station.sea} Coast</div>
                <div style="margin-top: 4px; border-top: 1px solid #e2e8f0; padding-top: 4px;">
                  SST: <strong>${station.sst}°C</strong> · Wind: <strong>${station.windSpeed} kts</strong>
                </div>
              </div>`
            )
          )
          .addTo(map);

        marker.getElement().addEventListener("click", () => onSelectStationRef.current(station));
      });

      // 2. Add Potential Fishing Zones (PFZ) points
      const pfzSource = {
        type: "FeatureCollection",
        features: pfzZones.map((zone) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [zone.lon, zone.lat] },
          properties: {
            id: zone.id,
            name: zone.name,
            score: zone.suitabilityScore,
            bearing: zone.bearing,
            distance: zone.distanceNM,
            sst: zone.sstC,
            chl: zone.chlorophyllMgM3,
          },
        })),
      } as GeoJSON.GeoJSON;

      map.addSource("pfz", { type: "geojson", data: pfzSource });

      map.addLayer({
        id: "pfz-points-glow",
        type: "circle",
        source: "pfz",
        paint: {
          "circle-radius": 12,
          "circle-color": "#eab308",
          "circle-opacity": 0.35,
        },
      });

      map.addLayer({
        id: "pfz-points",
        type: "circle",
        source: "pfz",
        paint: {
          "circle-radius": 7,
          "circle-color": "#facc15",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.8,
          "circle-opacity": 0.95,
        },
      });

      map.on("click", "pfz-points", (event: MapLayerMouseEvent) => {
        const feature = event.features?.[0];
        if (!feature) return;
        const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
        const p = feature.properties;
        new maplibregl.Popup({ offset: 12 })
          .setLngLat(coords)
          .setHTML(
            `<div style="font-family: sans-serif; font-size: 11px; max-width: 220px; padding: 2px;">
              <div style="font-size: 9px; font-weight: bold; text-transform: uppercase; color: #16a34a;">
                PFZ Advisory · ${p?.score}% Match
              </div>
              <div style="font-weight: bold; font-size: 12px; color: #09090b; margin-top: 2px;">
                ${p?.name}
              </div>
              <div style="margin-top: 4px; color: #52525b; font-size: 10px;">
                Located <strong>${p?.distance} NM</strong> bearing <strong>${p?.bearing}</strong>.
              </div>
              <div style="margin-top: 4px; border-top: 1px solid #e2e8f0; padding-top: 4px; font-size: 10px; color: #3f3f46;">
                SST: ${p?.sst}°C · Chl-a: ${p?.chl} mg/m³
              </div>
            </div>`
          )
          .addTo(map);
      });

      map.on("mouseenter", "pfz-points", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "pfz-points", () => {
        map.getCanvas().style.cursor = "";
      });

      // 3. Add Geofencing & Restricted Boundaries Layers
      const polygonZones = geofences.filter((z) => z.points.length >= 3 && z.id !== "geo-imbl-srilanka");
      const imblZone = geofences.find((z) => z.id === "geo-imbl-srilanka");

      const geofencePolygonGeoJSON: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: polygonZones.map((z) => ({
          type: "Feature",
          id: z.id,
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                ...z.points.map((p) => [p.lon, p.lat] as [number, number]),
                [z.points[0].lon, z.points[0].lat] as [number, number],
              ],
            ],
          },
          properties: {
            id: z.id,
            name: z.name,
            category: z.category,
            status: z.status,
            description: z.description,
            penalty: z.penaltyWarning,
          },
        })),
      };

      map.addSource("geofence-polygons", {
        type: "geojson",
        data: geofencePolygonGeoJSON,
      });

      // Geofence fill layer
      map.addLayer({
        id: "geofence-fill",
        type: "fill",
        source: "geofence-polygons",
        paint: {
          "fill-color": "#ef4444",
          "fill-opacity": 0.2,
        },
      });

      // Geofence outline layer
      map.addLayer({
        id: "geofence-border",
        type: "line",
        source: "geofence-polygons",
        paint: {
          "line-color": "#ef4444",
          "line-width": 2,
          "line-dasharray": [3, 2],
        },
      });

      // IMBL boundary LineString layer
      if (imblZone) {
        const imblGeoJSON: GeoJSON.FeatureCollection = {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              id: imblZone.id,
              geometry: {
                type: "LineString",
                coordinates: imblZone.points.map((p) => [p.lon, p.lat] as [number, number]),
              },
              properties: {
                id: imblZone.id,
                name: imblZone.name,
                category: imblZone.category,
                status: imblZone.status,
                description: imblZone.description,
                penalty: imblZone.penaltyWarning,
              },
            },
          ],
        };

        map.addSource("geofence-imbl", {
          type: "geojson",
          data: imblGeoJSON,
        });

        map.addLayer({
          id: "geofence-imbl-line",
          type: "line",
          source: "geofence-imbl",
          paint: {
            "line-color": "#dc2626",
            "line-width": 3.5,
            "line-dasharray": [4, 2],
          },
        });
      }

      // Geofence popups on click
      const handleGeofenceClick = (event: MapLayerMouseEvent) => {
        const feature = event.features?.[0];
        if (!feature) return;
        const p = feature.properties;
        new maplibregl.Popup({ offset: 10 })
          .setLngLat(event.lngLat)
          .setHTML(
            `<div style="font-family: sans-serif; font-size: 11px; max-width: 250px; padding: 2px;">
              <div style="font-size: 9px; font-weight: bold; text-transform: uppercase; color: #dc2626; margin-bottom: 2px;">
                ${p?.status} • ${p?.category}
              </div>
              <div style="font-weight: bold; font-size: 12px; color: #09090b; margin-bottom: 4px;">
                ${p?.name}
              </div>
              <div style="color: #52525b; line-height: 1.35; margin-bottom: 6px; font-size: 10px;">
                ${p?.description}
              </div>
              <div style="background: #fef2f2; color: #991b1b; padding: 4px 6px; border-radius: 4px; border: 1px solid #fecaca; font-size: 10px;">
                <strong>Warning:</strong> ${p?.penalty}
              </div>
            </div>`
          )
          .addTo(map);
      };

      map.on("click", "geofence-fill", handleGeofenceClick);
      if (imblZone) {
        map.on("click", "geofence-imbl-line", handleGeofenceClick);
      }

      map.on("mouseenter", "geofence-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "geofence-fill", () => {
        map.getCanvas().style.cursor = "";
      });
    });

      mapRef.current = map;
      return () => {
        map.remove();
        mapRef.current = null;
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Map renderer unavailable";
      window.setTimeout(() => setMapError(message), 0);
    }
  }, [geofences, pfzZones, stations]);

  // Handle basemap switching
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const applyBasemap = () => {
      const isOpen = basemap === "openmap";
      if (map.getLayer("osm-base")) {
        map.setLayoutProperty("osm-base", "visibility", isOpen ? "visible" : "none");
      }
      if (map.getLayer("openseamap-marks")) {
        map.setLayoutProperty("openseamap-marks", "visibility", isOpen ? "visible" : "none");
      }
      if (map.getLayer("satellite-base")) {
        map.setLayoutProperty("satellite-base", "visibility", isOpen ? "none" : "visible");
      }
    };

    if (map.isStyleLoaded()) applyBasemap();
    else map.once("load", applyBasemap);
  }, [basemap]);

  // Handle dynamic ocean telemetry layers
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const updateLayers = () => {
      // 1. Telemetry points from backend
      Object.entries(layers).forEach(([parameter, records]) => {
        const sourceId = `backend-${parameter}`;
        const mapLayer = sourceNames[parameter];
        if (!mapLayer || !records?.length) return;

        const data = {
          type: "FeatureCollection",
          features: records.map(pointFeature),
        } as GeoJSON.GeoJSON;

        const source = map.getSource(sourceId) as GeoJSONSource | undefined;
        if (source) {
          source.setData(data);
        } else {
          map.addSource(sourceId, { type: "geojson", data });
          map.addLayer({
            id: sourceId,
            type: "heatmap",
            source: sourceId,
            paint: {
              "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 3, 18, 6, 30, 10, 48],
              "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 3, 0.7, 8, 1.4],
              "heatmap-opacity": 0.8,
              "heatmap-weight": 1,
              "heatmap-color": [
                "interpolate", ["linear"], ["heatmap-density"],
                0, "rgba(0,0,0,0)",
                0.12, heatmapColors[parameter]?.[0] || "#17105b",
                0.28, heatmapColors[parameter]?.[1] || "#2254c1",
                0.45, heatmapColors[parameter]?.[2] || "#12b8d0",
                0.62, heatmapColors[parameter]?.[3] || "#58d18a",
                0.8, heatmapColors[parameter]?.[4] || "#e9e34e",
                1, heatmapColors[parameter]?.[5] || "#e95f32",
              ],
            },
            layout: {
              visibility: activeLayers.includes(mapLayer) ? "visible" : "none",
            },
          });
        }

        if (map.getLayer(sourceId)) {
          map.setLayoutProperty(
            sourceId,
            "visibility",
            activeLayers.includes(mapLayer) ? "visible" : "none"
          );
        }
      });

      // 2. PFZ layer toggle
      const pfzVis = activeLayers.includes("pfz") ? "visible" : "none";
      if (map.getLayer("pfz-points")) map.setLayoutProperty("pfz-points", "visibility", pfzVis);
      if (map.getLayer("pfz-points-glow"))
        map.setLayoutProperty("pfz-points-glow", "visibility", pfzVis);

      // 3. Geofencing layer toggle
      const geoVis = activeLayers.includes("geofence") ? "visible" : "none";
      if (map.getLayer("geofence-fill"))
        map.setLayoutProperty("geofence-fill", "visibility", geoVis);
      if (map.getLayer("geofence-border"))
        map.setLayoutProperty("geofence-border", "visibility", geoVis);
      if (map.getLayer("geofence-imbl-line"))
        map.setLayoutProperty("geofence-imbl-line", "visibility", geoVis);
    };

    if (map.isStyleLoaded()) updateLayers();
    else map.once("load", updateLayers);
  }, [activeLayers, layers]);

  // Wind particles canvas animation
  React.useEffect(() => {
    const canvas = particleCanvas.current;
    const host = mapNode.current;
    if (!canvas || !host) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let frame = 0;
    const returnedWind = Number(layers.wind?.[0]?.value);
    const windSpeed = Number.isFinite(returnedWind)
      ? Math.max(0.25, Math.min(returnedWind / 12, 2.5))
      : 0.8;

    const particles = Array.from({ length: 260 }, (_, index) => ({
      x: (index * 71) % 1000,
      y: (index * 137) % 520,
      length: 4 + (index % 8),
      speed: windSpeed * (0.7 + (index % 6) / 8),
    }));

    const resize = () => {
      canvas.width = host.clientWidth * devicePixelRatio;
      canvas.height = host.clientHeight * devicePixelRatio;
      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      context.clearRect(0, 0, width, height);

      if (activeLayers.includes("wind")) {
        context.strokeStyle = "rgba(14, 165, 233, 0.75)";
        context.lineWidth = 1.2;
        particles.forEach((particle) => {
          const x = particle.x % width;
          const y = particle.y % height;
          context.beginPath();
          context.moveTo(x, y);
          context.lineTo(x + particle.length, y - particle.length * 0.45);
          context.stroke();
          particle.x += particle.speed;
          particle.y -= particle.speed * 0.45;
          if (particle.x > width + 10) particle.x = -10;
          if (particle.y < -10) particle.y = height + 10;
        });
      }
      frame = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, [activeLayers, layers]);

  // Fly to station when selected
  React.useEffect(() => {
    mapRef.current?.flyTo({
      center: [selectedStation.lon, selectedStation.lat],
      duration: 700,
    });
  }, [selectedStation.lat, selectedStation.lon]);

  return (
    <div className="relative h-[560px] w-full overflow-hidden bg-slate-900">
      {/* Offline-safe geographic basemap. It remains visible when external raster
          tiles are blocked, while MapLibre renders above it when available. */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-[#bfe3eb]">
        <svg
          aria-label="Bay of Bengal marine map"
          className="h-full w-full"
          viewBox="0 0 1000 620"
          preserveAspectRatio="none"
          role="img"
        >
          <rect width="1000" height="620" fill="#bfe3eb" />
          <path
            d="M0 0H318C344 64 361 121 350 180C341 235 365 283 349 329C329 386 290 415 255 455C225 490 210 549 197 620H0Z"
            fill="#e8e2cf"
            stroke="#9aa99a"
            strokeWidth="2"
          />
          <path
            d="M1000 0H890C862 80 853 150 866 221C879 292 855 361 868 438C879 501 909 557 922 620H1000Z"
            fill="#e8e2cf"
            stroke="#9aa99a"
            strokeWidth="2"
          />
          <g fill="none" stroke="#70b5c4" strokeWidth="1" opacity=".55">
            <path d="M0 124H1000M0 248H1000M0 372H1000M0 496H1000" />
            <path d="M166 0V620M332 0V620M498 0V620M664 0V620M830 0V620" />
          </g>
          <g fill="#397f91" fontFamily="sans-serif" fontSize="16" letterSpacing="2" opacity=".8">
            <text x="515" y="290">BAY OF BENGAL</text>
            <text x="515" y="316" fontSize="11" letterSpacing="1">MARINE OPERATIONS CHART</text>
          </g>
          <g fill="#526b62" fontFamily="sans-serif" fontSize="12">
            <text x="205" y="205">INDIA</text>
            <text x="845" y="410">MYANMAR</text>
            <text x="265" y="385">VISAKHAPATNAM</text>
            <text x="220" y="400" fontSize="10">EAST COAST</text>
          </g>
          <circle cx="302" cy="373" r="6" fill="#0284c7" stroke="white" strokeWidth="3" />
          <circle cx="302" cy="373" r="18" fill="none" stroke="#0284c7" strokeWidth="2" opacity=".4" />
        </svg>
      </div>
      {/* MapLibre DOM node */}
      <div ref={mapNode} className="absolute inset-0 z-[1]" />

      {(mapError || Object.keys(layers).length > 0) && (
        <div className="absolute inset-0 z-[2] overflow-hidden bg-transparent text-zinc-800">
          {mapError && <div className="absolute inset-0 bg-[#dcecf0]" />}
          <div className="absolute inset-0 opacity-45" style={{ backgroundImage: "linear-gradient(rgba(14,116,144,.18) 1px, transparent 1px), linear-gradient(90deg, rgba(14,116,144,.18) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
          <div className="absolute left-1/2 top-1/2 h-72 w-[34rem] max-w-[90%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-cyan-700/20 bg-cyan-600/10" />
          <div className="absolute left-4 top-20 rounded-md border border-amber-200 bg-white/90 px-3 py-2 text-[11px] shadow-sm">
            Map tiles unavailable — showing marine data overlay
          </div>
          {stations.map((station) => (
            <button
              key={station.id}
              type="button"
              title={station.name}
              onClick={() => onSelectStation(station)}
              className={`absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow ${station.id === selectedStation.id ? "bg-sky-700 ring-4 ring-sky-700/20" : "bg-slate-600"}`}
              style={{ left: `${30 + ((station.lon - 82.5) / 2) * 55}%`, top: `${65 - ((station.lat - 17) / 1.5) * 45}%` }}
            />
          ))}
          {pfzZones.map((zone) => (
            <button
              key={zone.id}
              type="button"
              title={`${zone.name} (${zone.suitabilityScore}% match)`}
              onClick={() => onSelectStation(selectedStation)}
              className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-amber-400 shadow ring-4 ring-amber-300/30"
              style={{ left: `${30 + ((zone.lon - 82.5) / 2) * 55}%`, top: `${65 - ((zone.lat - 17) / 1.5) * 45}%` }}
            />
          ))}
          {Object.entries(layers).flatMap(([parameter, records]) => {
            const mapLayer = sourceNames[parameter];
            if (!mapLayer || !activeLayers.includes(mapLayer)) return [];
            return records.map((record, index) => (
              <span
                key={`${parameter}-${record.timestamp}-${index}`}
                title={`${parameter}: ${record.value} ${record.unit}`}
                className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white shadow"
                style={{
                  left: `${30 + ((record.longitude - 82.5) / 2) * 55}%`,
                  top: `${65 - ((record.latitude - 17) / 1.5) * 45}%`,
                  backgroundColor: layerColors[parameter] || "#38bdf8",
                }}
              />
            ));
          })}
        </div>
      )}

      {/* Dynamic wind particles canvas */}
      <canvas ref={particleCanvas} className="pointer-events-none absolute inset-0 h-full w-full" />

      {/* Top Left: Basemap Mode Switcher (Open Map vs Satellite) */}
      <div className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-md border border-zinc-200/90 bg-white/95 p-1 shadow-sm backdrop-blur-xs font-sans text-xs">
        <button
          type="button"
          onClick={() => setBasemap("openmap")}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
            basemap === "openmap"
              ? "bg-zinc-950 text-white shadow-xs"
              : "text-zinc-600 hover:text-zinc-950"
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Open Marine Map (OSM)</span>
        </button>

        <button
          type="button"
          onClick={() => setBasemap("satellite")}
          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
            basemap === "satellite"
              ? "bg-zinc-950 text-white shadow-xs"
              : "text-zinc-600 hover:text-zinc-950"
          }`}
        >
          <span>Satellite</span>
        </button>
      </div>

      {/* Top Center-Right: Geofence Active Indicator */}
      {activeLayers.includes("geofence") && (
        <div className="pointer-events-none absolute right-16 top-3 z-10 hidden sm:flex items-center gap-1.5 rounded-md border border-rose-200 bg-white/90 px-2.5 py-1 text-[10px] font-sans font-medium text-rose-700 shadow-sm backdrop-blur-xs">
          <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
          <span>Restricted Boundaries & IMBL Active</span>
        </div>
      )}

      {/* Bottom Left: Map Legend Card */}
      <div className="pointer-events-none absolute bottom-4 left-4 z-10 rounded-md border border-zinc-200/90 bg-white/95 px-3 py-2 text-[10px] font-sans text-zinc-700 shadow-md backdrop-blur-xs max-w-xs space-y-1">
        <div className="flex items-center gap-3 text-[10px] text-zinc-500 pt-0.5 flex-wrap">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-400" /> PFZ Advisories
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-rose-500" /> Restricted Zones
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1 w-3 bg-rose-600 inline-block border-b border-dashed" /> IMBL
          </span>
        </div>
      </div>
    </div>
  );
}
