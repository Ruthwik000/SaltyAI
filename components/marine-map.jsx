"use client";

import * as React from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { Layers, Play, Pause, RefreshCw } from "lucide-react";

const OSF = "https://www.incois.gov.in/thredds/wms/osf";
const defs = {
  wind: {
    path: "ww3/rsmc_combined_ww3_latest.nc",
    layer: "UWND:VWND-mag",
    style: "raster/x-Occam",
    label: "Winds (m/s)",
  },
  waves: {
    path: "ww3/rsmc_combined_ww3_latest.nc",
    layer: "HS",
    style: "raster/x-Rainbow",
    label: "Significant Wave Height (m)",
  },
  swell: {
    path: "ww3/rsmc_combined_ww3_latest.nc",
    layer: "PHS01",
    style: "raster/x-Rainbow",
    label: "Swell Height (m)",
  },
  wavePeriod: {
    path: "ww3/rsmc_combined_ww3_latest.nc",
    layer: "T02",
    style: "raster/x-Rainbow",
    label: "Wave Period (s)",
  },
  swellPeriod: {
    path: "ww3/rsmc_combined_ww3_latest.nc",
    layer: "PTP01",
    style: "raster/x-Rainbow",
    label: "Swell Period (s)",
  },
  currents: {
    path: "currents/CURRENTS_NIO_latest.nc",
    layer: "U:V-mag",
    style: "raster/x-Rainbow",
    label: "Surface Currents (m/s)",
  },
  sst: {
    path: "winds/SST_NIO_latest.nc",
    layer: "SST",
    style: "raster/x-Rainbow",
    label: "Sea Surface Temperature",
  },
  mld: {
    path: "winds/MLD_NIO_latest.nc",
    layer: "MLD",
    style: "raster/x-Rainbow",
    label: "Mixed Layer Depth",
  },
  d20: {
    path: "winds/MLD_NIO_latest.nc",
    layer: "D20",
    style: "raster/x-Rainbow",
    label: "D20",
  },
};

const issue = () =>
  new Date(Date.now() - 86400000).toISOString().slice(0, 10).replaceAll("-", "");

const fileFor = (key, files) => {
  const discovered =
    key === "sst"
      ? files?.sst
      : key === "currents"
        ? files?.currents
        : key === "mld" || key === "d20"
          ? files?.mld
          : files?.waves;
  return discovered || defs[key].path.replace("latest", issue());
};
const wms = (key, time, files) => {
  const d = defs[key];
  const p = new URLSearchParams({
    SERVICE: "WMS",
    VERSION: "1.1.1",
    REQUEST: "GetMap",
    LAYERS: d.layer,
    STYLES: d.style,
    FORMAT: "image/png",
    TRANSPARENT: "true",
    SRS: "EPSG:3857",
    WIDTH: "256",
    HEIGHT: "256",
    COLORSCALERANGE: "auto",
  });
  if (time) p.set("TIME", time);
  return (
    "/api/incois/wms?dataset=" +
    encodeURIComponent(fileFor(key, files)) +
    "&" +
    p.toString() +
    "&BBOX={bbox-epsg-3857}"
  );
};
const legend = (key, files) =>
  "/api/incois/wms?dataset=" +
  encodeURIComponent(fileFor(key, files)) +
  "&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetLegendGraphic&FORMAT=image/png&LAYER=" +
  encodeURIComponent(key === "currents" ? "CURRENT" : defs[key].layer) +
  "&COLORSCALERANGE=auto&numcolorbands=250&transparent=TRUE&styles=" +
  encodeURIComponent(defs[key].style);

export function MarineMap({ activeLayers, stations, geofences = [], selectedStation }) {
  const node = React.useRef(null);
  const map = React.useRef(null);
  const [basemap, setBasemap] = React.useState("satellite");
  const [times, setTimes] = React.useState([]);
  const [index, setIndex] = React.useState(0);
  const [playing, setPlaying] = React.useState(false);
  const [files, setFiles] = React.useState(null);
  const [status, setStatus] = React.useState("Connecting to INCOIS OSF…");
  const [inspection, setInspection] = React.useState(null);
  const active = Object.keys(defs).find((key) => activeLayers.includes(key));
  const selectedTime = times[index];

  React.useEffect(() => {
    const controller = new AbortController();
    fetch("/api/incois/osf-config", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error())))
      .then((config) => {
        setFiles(config.files);
        return fetch(
          "/api/incois/wms?dataset=" +
            encodeURIComponent(config.files.waves) +
            "&SERVICE=WMS&REQUEST=GetCapabilities",
          { signal: controller.signal }
        );
      })
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error())))
      .then((xml) => {
        const match = xml.match(
          /<Dimension[^>]*name=["']time["'][^>]*>([\s\S]*?)<\/Dimension>/i
        );
        const found = match
          ? match[1]
              .trim()
              .split(/[,\s]+/)
              .filter((t) => /^\d{4}-\d{2}-\d{2}T/.test(t))
          : [];
        setTimes(Array.from(new Set(found)));
        setStatus(
          found.length ? "INCOIS OSF connected" : "INCOIS OSF connected · latest forecast"
        );
      })
      .catch(() => setStatus("INCOIS OSF unavailable from this network"));
    return () => controller.abort();
  }, []);

  React.useEffect(() => {
    if (!playing || !times.length) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % times.length), 1000);
    return () => window.clearInterval(timer);
  }, [playing, times.length]);

  React.useEffect(() => {
    if (!node.current || map.current) return;
    const m = new maplibregl.Map({
      container: node.current,
      center: [selectedStation.lon, selectedStation.lat],
      zoom: 5,
      minZoom: 3,
      maxZoom: 13,
      attributionControl: false,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
          },
          satellite: {
            type: "raster",
            tiles: [
              "https://basemap.nationalmap.gov/ArcGIS/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
          },
          boundaries: {
            type: "raster",
            tiles: [
              "https://www.incois.gov.in/geoserver/BaseMaps-Common/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=BaseMaps-Common:gdam_410_l0_india_corrected&FORMAT=image/png&TRANSPARENT=true&SRS=EPSG:3857&WIDTH=256&HEIGHT=256&BBOX={bbox-epsg-3857}",
            ],
            tileSize: 256,
          },
          ...Object.fromEntries(
            Object.keys(defs).map((key) => [
              "osf-" + key,
              {
                type: "raster",
                tiles: [wms(key, undefined, files || undefined)],
                tileSize: 256,
              },
            ])
          ),
        },
        layers: [
          { id: "osm", type: "raster", source: "osm", layout: { visibility: "none" } },
          { id: "satellite", type: "raster", source: "satellite" },
          {
            id: "boundaries",
            type: "raster",
            source: "boundaries",
            paint: { "raster-opacity": 0.8 },
          },
          ...Object.keys(defs).map((key) => ({
            id: "osf-" + key,
            type: "raster",
            source: "osf-" + key,
            layout: { visibility: "none" },
            paint: { "raster-opacity": 0.78 },
          })),
        ],
      },
    });
    m.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");
    m.addControl(new maplibregl.ScaleControl({ unit: "nautical" }), "bottom-right");
    m.on("error", () => setStatus("INCOIS OSF or basemap tiles could not be loaded"));
    m.on("load", () => {
      stations.forEach((station) =>
        new maplibregl.Marker({ color: "#0284c7" })
          .setLngLat([station.lon, station.lat])
          .setPopup(new maplibregl.Popup().setText(station.name))
          .addTo(m)
      );
      geofences
        .filter((zone) => zone.points.length > 1)
        .forEach((zone) => {
          const coords = zone.points.map((p) => [p.lon, p.lat]);
          coords.push(coords[0]);
          m.addSource("geo-" + zone.id, {
            type: "geojson",
            data: {
              type: "Feature",
              geometry: { type: "Polygon", coordinates: [coords] },
              properties: { name: zone.name },
            },
          });
          m.addLayer({
            id: "geo-" + zone.id,
            type: "line",
            source: "geo-" + zone.id,
            paint: { "line-color": "#ef4444", "line-width": 2, "line-dasharray": [3, 2] },
          });
        });
      Object.keys(defs).forEach((key) => {
        m.setLayoutProperty(
          "osf-" + key,
          "visibility",
          activeLayers.includes(key) ? "visible" : "none"
        );
        const source = m.getSource("osf-" + key);
        source?.setTiles?.([wms(key, selectedTime, files || undefined)]);
      });
      setStatus("INCOIS OSF connected · latest forecast");
    });
    m.on("click", async (event) => {
      const coordinate =
        event.lngLat.lat.toFixed(4) + "°N, " + event.lngLat.lng.toFixed(4) + "°E";
      if (!active) {
        setInspection(coordinate);
        return;
      }
      const d = defs[active];
      const p = new URLSearchParams({
        SERVICE: "WMS",
        VERSION: "1.1.1",
        REQUEST: "GetFeatureInfo",
        LAYERS: d.layer,
        QUERY_LAYERS: d.layer,
        INFO_FORMAT: "text/plain",
        SRS: "EPSG:4326",
        WIDTH: "101",
        HEIGHT: "101",
        X: "50",
        Y: "50",
        BBOX:
          event.lngLat.lng -
          0.05 +
          "," +
          (event.lngLat.lat - 0.05) +
          "," +
          (event.lngLat.lng + 0.05) +
          "," +
          (event.lngLat.lat + 0.05),
      });
      try {
        const r = await fetch(
          "/api/incois/wms?dataset=" +
            encodeURIComponent(fileFor(active, files || undefined)) +
            "&" +
            p.toString()
        );
        setInspection(coordinate + "\\n" + (await r.text()).slice(0, 180));
      } catch {
        setInspection(coordinate + "\\nINCOIS value inspection unavailable");
      }
    });
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  React.useEffect(() => {
    const m = map.current;
    if (!m || !m.isStyleLoaded()) return;
    m.setLayoutProperty("osm", "visibility", basemap === "osm" ? "visible" : "none");
    m.setLayoutProperty(
      "satellite",
      "visibility",
      basemap === "satellite" ? "visible" : "none"
    );
    Object.keys(defs).forEach((key) => {
      m.setLayoutProperty(
        "osf-" + key,
        "visibility",
        activeLayers.includes(key) ? "visible" : "none"
      );
      const source = m.getSource("osf-" + key);
      source?.setTiles?.([wms(key, selectedTime, files || undefined)]);
    });
  }, [activeLayers, basemap, selectedTime, files]);

  React.useEffect(() => {
    map.current?.flyTo({
      center: [selectedStation.lon, selectedStation.lat],
      duration: 500,
    });
  }, [selectedStation.lat, selectedStation.lon]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-900">
      <div ref={node} className="absolute inset-0" />
      <div className="absolute left-3 top-3 z-10 flex rounded bg-white/95 p-1 shadow">
        <button
          className={
            "px-3 py-1 text-xs " + (basemap === "osm" ? "bg-zinc-900 text-white" : "")
          }
          onClick={() => setBasemap("osm")}
        >
          <Layers className="mr-1 inline h-3 w-3" />
          Open Marine Map (OSM)
        </button>
        <button
          className={
            "px-3 py-1 text-xs " +
            (basemap === "satellite" ? "bg-zinc-900 text-white" : "")
          }
          onClick={() => setBasemap("satellite")}
        >
          Satellite
        </button>
      </div>
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2 rounded bg-white/95 px-2 py-1.5 text-xs shadow">
        <button
          aria-label={playing ? "Pause forecast" : "Play forecast"}
          disabled={!times.length}
          onClick={() => setPlaying((p) => !p)}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <input
          aria-label="INCOIS forecast time"
          type="range"
          min={0}
          max={Math.max(0, times.length - 1)}
          value={index}
          disabled={!times.length}
          onChange={(e) => setIndex(Number(e.target.value))}
          className="w-44"
        />
        <span className="min-w-36 text-[10px]">
          {selectedTime
            ? new Date(selectedTime).toLocaleString()
            : "INCOIS time loading…"}
        </span>
        <button
          aria-label="Refresh INCOIS forecast"
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="absolute right-3 top-3 z-10 rounded bg-white/95 px-2 py-1 text-[10px] shadow">
        {status}
      </div>
      {active && (
        <img
          src={legend(active, files || undefined)}
          alt={defs[active].label + " legend"}
          className="absolute bottom-3 right-3 z-10 max-h-52 max-w-28 rounded bg-white p-1 shadow"
        />
      )}
      {inspection && (
        <pre className="absolute left-3 top-14 z-10 max-w-xs whitespace-pre-wrap rounded bg-white/95 p-2 text-[10px] shadow">
          {inspection}
        </pre>
      )}
    </div>
  );
}
