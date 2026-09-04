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

  const onSelectStationRef = React.useRef(onSelectStation);
  React.useEffect(() => {
    onSelectStationRef.current = onSelectStation;
  }, [onSelectStation]);

  const initialStationRef = React.useRef(selectedStation);

  // Initialize MapLibre GL map with OpenStreetMap + OpenSeaMap + Satellite raster sources
  React.useEffect(() => {
    if (!mapNode.current || mapRef.current) return;
    const initial = initialStationRef.current;

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
            type: "circle",
            source: sourceId,
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 3, 8, 7],
              "circle-color": layerColors[parameter] || "#38bdf8",
              "circle-opacity": 0.72,
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 0.8,
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
      {/* MapLibre DOM node */}
      <div ref={mapNode} className="absolute inset-0" />

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
