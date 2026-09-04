"use client";

import * as React from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FeatureCollection, Polygon, LineString } from "geojson";
import { Crosshair, Fish, Layers, Map, Satellite, Waves } from "lucide-react";
import { circleRing, formatCoord } from "@/lib/geo";
import {
  basicOsfLayers,
  boundaryTileUrl,
  osfFeatureInfoUrl,
  osfLayers,
  osfLegendUrl,
  osfTileUrl,
  osmTileUrl,
  satelliteTileUrl,
  type DiscoveredOsfFiles,
  type OsfLayerKey,
} from "@/lib/incois-layers";

export type Basemap = "ocean" | "streets" | "satellite";

export interface MapZone {
  id: string;
  name: string;
  lat: number;
  lon: number;
  radiusNM: number;
  /** 0-100. Drives the zone fill colour when present. */
  score?: number;
}

export interface MapHazard {
  id: string;
  title: string;
  lat: number;
  lon: number;
  radiusNM: number;
  severity: "Critical" | "Severe" | "Warning" | "Advisory" | "Informational";
}

export interface MapFleetUnit {
  id: string;
  label: string;
  lat: number;
  lon: number;
  headingDeg?: number | null;
  /** Drives the pin colour: normal, watch, or emergency. */
  tone?: "normal" | "watch" | "alert";
}

export interface MapSearchZone {
  id: string;
  label: string;
  lat: number;
  lon: number;
  radiusNM: number;
}

export interface MapPath {
  id: string;
  points: { lat: number; lon: number }[];
  /** "drift" is the SAR projection, "track" a vessel's own breadcrumb. */
  kind?: "drift" | "track";
}

export interface MapVessel {
  lat: number;
  lon: number;
  headingDeg?: number | null;
  label?: string;
}

export interface OceanMapProps {
  center: { lat: number; lon: number };
  zoom?: number;
  zones?: MapZone[];
  selectedZoneId?: string | null;
  onSelectZone?: (zoneId: string | null) => void;
  hazards?: MapHazard[];
  vessel?: MapVessel | null;
  track?: { lat: number; lon: number }[];
  /** Tracked boats, each selectable. */
  fleet?: MapFleetUnit[];
  selectedFleetId?: string | null;
  onSelectFleetUnit?: (id: string) => void;
  /** Probability areas for open search cases. */
  searchZones?: MapSearchZone[];
  selectedSearchZoneId?: string | null;
  onSelectSearchZone?: (id: string) => void;
  /** Drift projections and breadcrumbs. */
  paths?: MapPath[];
  port?: { lat: number; lon: number; name: string } | null;
  /** Ocean parameter raster drawn under the vector layers. */
  overlay?: OsfLayerKey | null;
  onOverlayChange?: (overlay: OsfLayerKey | null) => void;
  /** Which forecast variables to offer. Defaults to the fisherman set. */
  overlayKeys?: readonly OsfLayerKey[];
  /**
   * Let the reader tap the map to read the active variable's value there
   * (WMS GetFeatureInfo). Research surfaces want this; a phone at sea does not.
   */
  enableValueInspection?: boolean;
  /**
   * Draw the potential fishing zones. Toggled independently of the raster
   * overlays above, which are mutually exclusive with each other.
   */
  showZones?: boolean;
  onToggleZones?: (next: boolean) => void;
  showBoundary?: boolean;
  onFollowVessel?: () => void;
  /**
   * When this value changes the map frames every zone, the port and the vessel.
   * Pass the number of pixels the bottom sheet covers so nothing important is
   * framed underneath it.
   */
  autoFitKey?: string | null;
  autoFitBottomPadding?: number;
  className?: string;
  /** Extra UI rendered above the map canvas. */
  children?: React.ReactNode;
}

const EMPTY_POLYGONS: FeatureCollection<Polygon> = {
  type: "FeatureCollection",
  features: [],
};

const EMPTY_LINES: FeatureCollection<LineString> = {
  type: "FeatureCollection",
  features: [],
};

const HAZARD_COLOR: Record<MapHazard["severity"], string> = {
  Critical: "#be123c",
  Severe: "#e11d48",
  Warning: "#f59e0b",
  Advisory: "#0ea5e9",
  Informational: "#71717a",
};

function zonesToGeoJson(
  zones: MapZone[],
  selectedZoneId: string | null | undefined
): FeatureCollection<Polygon> {
  return {
    type: "FeatureCollection",
    features: zones.map((zone) => ({
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [circleRing({ lat: zone.lat, lon: zone.lon }, zone.radiusNM)],
      },
      properties: {
        id: zone.id,
        name: zone.name,
        score: zone.score ?? 0,
        selected: zone.id === selectedZoneId,
      },
    })),
  };
}

function hazardsToGeoJson(hazards: MapHazard[]): FeatureCollection<Polygon> {
  return {
    type: "FeatureCollection",
    features: hazards
      .filter((hazard) => Number.isFinite(hazard.lat) && Number.isFinite(hazard.lon))
      .map((hazard) => ({
        type: "Feature",
        id: hazard.id,
        geometry: {
          type: "Polygon",
          coordinates: [
            circleRing({ lat: hazard.lat, lon: hazard.lon }, hazard.radiusNM || 25),
          ],
        },
        properties: {
          id: hazard.id,
          title: hazard.title,
          color: HAZARD_COLOR[hazard.severity] || HAZARD_COLOR.Advisory,
        },
      })),
  };
}

function trackToGeoJson(
  track: { lat: number; lon: number }[]
): FeatureCollection<LineString> {
  if (track.length < 2) return EMPTY_LINES;
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: track.map((point) => [point.lon, point.lat]),
        },
        properties: {},
      },
    ],
  };
}

function setGeoJson(
  map: maplibregl.Map,
  id: string,
  data: FeatureCollection<Polygon> | FeatureCollection<LineString>
) {
  const source = map.getSource(id) as maplibregl.GeoJSONSource | undefined;
  source?.setData(data as GeoJSON.GeoJSON);
}

export function OceanMap({
  center,
  zoom = 7,
  zones = [],
  selectedZoneId = null,
  onSelectZone,
  hazards = [],
  vessel = null,
  track = [],
  fleet = [],
  selectedFleetId = null,
  onSelectFleetUnit,
  searchZones = [],
  selectedSearchZoneId = null,
  onSelectSearchZone,
  paths = [],
  port = null,
  overlay = null,
  onOverlayChange,
  overlayKeys = basicOsfLayers,
  enableValueInspection = false,
  showZones = true,
  onToggleZones,
  showBoundary = true,
  onFollowVessel,
  autoFitKey = null,
  autoFitBottomPadding = 0,
  className,
  children,
}: OceanMapProps) {
  const container = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<maplibregl.Map | null>(null);
  const vesselMarker = React.useRef<maplibregl.Marker | null>(null);
  const portMarker = React.useRef<maplibregl.Marker | null>(null);
  const zoneMarkers = React.useRef<maplibregl.Marker[]>([]);
  const overlayMarkers = React.useRef<maplibregl.Marker[]>([]);

  const [ready, setReady] = React.useState(false);
  const [basemap, setBasemap] = React.useState<Basemap>("ocean");
  const [files, setFiles] = React.useState<DiscoveredOsfFiles | null>(null);
  const [overlayState, setOverlayState] = React.useState<
    "loading" | "ready" | "unavailable"
  >("loading");
  const [tileError, setTileError] = React.useState(false);
  const [inspection, setInspection] = React.useState<{
    coord: string;
    value: string;
    /** Readings are tied to the variable they were taken for. */
    forOverlay: OsfLayerKey;
  } | null>(null);

  // Kept in a ref so the map is built once and never torn down when the parent
  // passes a new callback identity.
  const selectRef = React.useRef(onSelectZone);
  React.useEffect(() => {
    selectRef.current = onSelectZone;
  }, [onSelectZone]);

  // Held in a ref for the same reason as selectRef: the map is built once.
  const fleetRef = React.useRef(onSelectFleetUnit);
  const searchRef = React.useRef(onSelectSearchZone);
  React.useEffect(() => {
    fleetRef.current = onSelectFleetUnit;
    searchRef.current = onSelectSearchZone;
  }, [onSelectFleetUnit, onSelectSearchZone]);

  const inspectRef = React.useRef<((lat: number, lon: number) => Promise<void>) | null>(
    null
  );
  React.useEffect(() => {
    if (!enableValueInspection || !overlay) {
      inspectRef.current = null;
      return;
    }
    inspectRef.current = async (lat, lon) => {
      const coord = formatCoord(lat, lon);
      setInspection({ coord, value: "Reading…", forOverlay: overlay });
      try {
        const response = await fetch(osfFeatureInfoUrl(overlay, lat, lon, files));
        const body = await response.text();
        // THREDDS answers with a short text block; the value line is enough.
        const line =
          body
            .split("\n")
            .map((row) => row.trim())
            .find((row) => /^value/i.test(row)) || body.trim().slice(0, 120);
        setInspection({
          coord,
          value: line || "No value at this point",
          forOverlay: overlay,
        });
      } catch {
        setInspection({ coord, value: "Value could not be read", forOverlay: overlay });
      }
    };
  }, [enableValueInspection, overlay, files]);

  /* ---- discover the live INCOIS dataset filenames ---- */
  React.useEffect(() => {
    const controller = new AbortController();
    fetch("/api/incois/osf-config", { signal: controller.signal })
      .then((response) =>
        response.ok ? response.json() : Promise.reject(new Error("config"))
      )
      .then((config: { files: DiscoveredOsfFiles }) => {
        setFiles(config.files);
        setOverlayState("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) setOverlayState("unavailable");
      });
    return () => controller.abort();
  }, []);

  /* ---- map construction (once) ---- */
  React.useEffect(() => {
    const node = container.current;
    if (!node || mapRef.current) return;

    const map = new maplibregl.Map({
      container: node,
      center: [center.lon, center.lat],
      zoom,
      minZoom: 3,
      maxZoom: 14,
      attributionControl: false,
      style: {
        version: 8,
        sources: {
          "base-streets": { type: "raster", tiles: [osmTileUrl], tileSize: 256 },
          "base-satellite": {
            type: "raster",
            tiles: [satelliteTileUrl],
            tileSize: 256,
          },
          boundary: { type: "raster", tiles: [boundaryTileUrl], tileSize: 256 },
          ...Object.fromEntries(
            (Object.keys(osfLayers) as OsfLayerKey[]).map((key) => [
              `osf-${key}`,
              { type: "raster", tiles: [osfTileUrl(key)], tileSize: 256 },
            ])
          ),
          zones: { type: "geojson", data: EMPTY_POLYGONS },
          hazards: { type: "geojson", data: EMPTY_POLYGONS },
          track: { type: "geojson", data: EMPTY_LINES },
          paths: { type: "geojson", data: EMPTY_LINES },
        },
        layers: [
          // Self-contained sea backdrop. Everything above it is either
          // same-origin (the INCOIS coastline proxy) or drawn from data we
          // already hold, so zones stay visible even with no tile access.
          {
            id: "base-ocean",
            type: "background",
            paint: { "background-color": "#0e2a45" },
          },
          {
            id: "base-streets",
            type: "raster",
            source: "base-streets",
            layout: { visibility: "none" },
          },
          {
            id: "base-satellite",
            type: "raster",
            source: "base-satellite",
            layout: { visibility: "none" },
          },
          ...(Object.keys(osfLayers) as OsfLayerKey[]).map((key) => ({
            id: `osf-${key}`,
            type: "raster" as const,
            source: `osf-${key}`,
            layout: { visibility: "none" as const },
            paint: { "raster-opacity": 0.72 },
          })),
          {
            id: "boundary",
            type: "raster",
            source: "boundary",
            paint: { "raster-opacity": 0.85 },
          },
          {
            id: "hazards-fill",
            type: "fill",
            source: "hazards",
            paint: { "fill-color": ["get", "color"], "fill-opacity": 0.12 },
          },
          {
            id: "hazards-line",
            type: "line",
            source: "hazards",
            paint: {
              "line-color": ["get", "color"],
              "line-width": 1.5,
              "line-dasharray": [2, 2],
            },
          },
          {
            id: "zones-fill",
            type: "fill",
            source: "zones",
            paint: {
              "fill-color": [
                "interpolate",
                ["linear"],
                ["get", "score"],
                0, "#a1a1aa",
                60, "#f59e0b",
                80, "#22c55e",
                95, "#059669",
              ],
              "fill-opacity": [
                "case",
                ["boolean", ["get", "selected"], false],
                0.42,
                0.22,
              ],
            },
          },
          {
            id: "track-line",
            type: "line",
            source: "track",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": "#0284c7", "line-width": 3, "line-opacity": 0.9 },
          },
          // Two layers rather than one: line-dasharray is not data-driven,
          // so the dashed drift projection and the solid breadcrumb have to be
          // separated by filter.
          {
            id: "paths-track",
            type: "line",
            source: "paths",
            filter: ["!=", ["get", "kind"], "drift"],
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": "#0284c7", "line-width": 2.5, "line-opacity": 0.85 },
          },
          {
            id: "paths-drift",
            type: "line",
            source: "paths",
            filter: ["==", ["get", "kind"], "drift"],
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": "#e11d48",
              "line-width": 2.5,
              "line-opacity": 0.95,
              "line-dasharray": [2, 1.5],
            },
          },
        ],
      },
    });

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "bottom-right"
    );
    map.addControl(new maplibregl.ScaleControl({ unit: "nautical" }), "top-right");
    map.touchZoomRotate.disableRotation();

    // "style.load" fires once the style is parsed. "load" additionally waits
    // for the first tiles, so gating on it would hide the zone overlays
    // entirely whenever a basemap host is unreachable.
    let disposed = false;
    const markReady = () => {
      // In development React may tear down and recreate this effect while
      // MapLibre is still finishing its first style event. Do not publish
      // readiness for an instance that has already been removed.
      if (!disposed && mapRef.current === map) setReady(true);
    };
    map.on("style.load", markReady);
    map.on("load", markReady);

    map.on("error", (event) => {
      const detail = (event as { error?: { message?: string } })?.error?.message || "";
      if (/tile|fetch|network|load/i.test(detail)) {
        setTileError(true);
      }
    });

    // The sheet and the surrounding layout settle after the map is built, so
    // MapLibre needs telling that its box changed.
    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => map.resize())
        : null;
    observer?.observe(node);

    map.on("click", "zones-fill", (event) => {
      const feature = event.features?.[0];
      const id = feature?.properties?.id;
      if (typeof id === "string") selectRef.current?.(id);
    });

    map.on("click", (event) => {
      const hits = map.queryRenderedFeatures(event.point, {
        layers: ["zones-fill"],
      });
      if (hits.length === 0) selectRef.current?.(null);
      if (hits.length === 0) void inspectRef.current?.(event.lngLat.lat, event.lngLat.lng);
    });

    map.on("mouseenter", "zones-fill", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "zones-fill", () => {
      map.getCanvas().style.cursor = "";
    });

    mapRef.current = map;

    return () => {
      // React StrictMode (dev) tears this effect down and sets it up again
      // immediately, which can reach MapLibre before its WebGL painter exists
      // and make remove() throw. Release the ref FIRST and swallow teardown
      // errors: if a throw got here with the ref still set, the second setup
      // would bail on its own guard and the map would never appear at all.
      disposed = true;
      mapRef.current = null;
      setReady(false);

      const safely = (run: () => void) => {
        try {
          run();
        } catch {
          // teardown raced the map's own initialisation; nothing to recover
        }
      };

      zoneMarkers.current.forEach((marker) => safely(() => marker.remove()));
      zoneMarkers.current = [];
      overlayMarkers.current.forEach((marker) => safely(() => marker.remove()));
      overlayMarkers.current = [];
      safely(() => vesselMarker.current?.remove());
      vesselMarker.current = null;
      safely(() => portMarker.current?.remove());
      portMarker.current = null;
      safely(() => observer?.disconnect());
      safely(() => map.remove());

      // A half-finished remove() can leave the canvas behind, and MapLibre
      // refuses to build into a container that is not empty.
      if (node.childNodes.length > 0) node.innerHTML = "";
    };
    // Constructed once; every prop below is synced by its own effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- basemap + boundary + overlay visibility ---- */
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.setLayoutProperty(
      "base-streets",
      "visibility",
      basemap === "streets" ? "visible" : "none"
    );
    map.setLayoutProperty(
      "base-satellite",
      "visibility",
      basemap === "satellite" ? "visible" : "none"
    );
    map.setLayoutProperty("boundary", "visibility", showBoundary ? "visible" : "none");
    map.setLayoutProperty(
      "zones-fill",
      "visibility",
      showZones ? "visible" : "none"
    );
    (Object.keys(osfLayers) as OsfLayerKey[]).forEach((key) => {
      map.setLayoutProperty(
        `osf-${key}`,
        "visibility",
        overlay === key ? "visible" : "none"
      );
    });
  }, [basemap, showBoundary, overlay, showZones, ready]);

  /* ---- point the overlay sources at the live forecast files ---- */
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !files) return;
    (Object.keys(osfLayers) as OsfLayerKey[]).forEach((key) => {
      const source = map.getSource(`osf-${key}`) as
        | { setTiles?: (tiles: string[]) => void }
        | undefined;
      source?.setTiles?.([osfTileUrl(key, files)]);
    });
  }, [files, ready]);

  /* ---- zone circles ----
   *
   * Drawn as DOM markers sized to the zone's real radius rather than left to
   * the GeoJSON fill alone. Vector layers are tiled in MapLibre's web worker,
   * and when a bundler fails to serve that worker the fill silently never
   * paints; the ring below always does. The fill still shows underneath when
   * the worker is healthy.
   */
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    setGeoJson(map, "zones", zonesToGeoJson(zones, selectedZoneId));

    zoneMarkers.current.forEach((marker) => marker.remove());
    zoneMarkers.current = [];
    if (!showZones) return;

    /** Ground resolution at this latitude, so the ring matches real miles. */
    const diameterPx = (zone: MapZone) => {
      const metresPerPixel =
        (156543.03392 * Math.cos((zone.lat * Math.PI) / 180)) /
        Math.pow(2, map.getZoom());
      return (2 * zone.radiusNM * 1852) / metresPerPixel;
    };

    const elements = zones.map((zone) => {
      const element = document.createElement("button");
      element.type = "button";
      element.className =
        "salty-zone-circle" + (zone.id === selectedZoneId ? " is-selected" : "");
      element.setAttribute("aria-label", `${zone.name}, tap for details`);

      const label = document.createElement("span");
      label.className = "salty-zone-label";
      label.textContent =
        zone.score != null ? `${Math.round(zone.score)}%` : "PFZ";
      element.appendChild(label);

      element.addEventListener("click", (event) => {
        event.stopPropagation();
        selectRef.current?.(zone.id);
      });

      return { zone, element };
    });

    const resize = () => {
      elements.forEach(({ zone, element }) => {
        // Never shrink below a comfortable tap target.
        const size = Math.max(30, Math.round(diameterPx(zone)));
        element.style.width = `${size}px`;
        element.style.height = `${size}px`;
        element.classList.toggle("is-tiny", size < 52);
      });
    };

    resize();
    map.on("zoom", resize);

    zoneMarkers.current = elements.map(({ zone, element }) =>
      new maplibregl.Marker({ element })
        .setLngLat([zone.lon, zone.lat])
        .addTo(map)
    );

    return () => {
      map.off("zoom", resize);
    };
  }, [zones, selectedZoneId, showZones, ready]);

  /* ---- hazards ---- */
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    setGeoJson(map, "hazards", hazardsToGeoJson(hazards));
  }, [hazards, ready]);

  /* ---- drift projections and breadcrumbs ---- */
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    setGeoJson(map, "paths", {
      type: "FeatureCollection",
      features: paths
        .filter((path) => path.points.length > 1)
        .map((path) => ({
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: path.points.map((point) => [point.lon, point.lat]),
          },
          properties: { id: path.id, kind: path.kind || "track" },
        })),
    });
  }, [paths, ready]);

  /* ---- track ---- */
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    setGeoJson(map, "track", trackToGeoJson(track));
  }, [track, ready]);

  /* ---- hazards, search areas, fleet and waypoints (DOM) ----
   *
   * Same reasoning as the zone circles: vector layers are tiled in MapLibre's
   * worker, and when a bundler fails to serve that worker they silently never
   * paint. Everything an operator has to see is drawn in the DOM.
   */
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    overlayMarkers.current.forEach((marker) => marker.remove());
    overlayMarkers.current = [];

    const metresPerPixel = (lat: number) =>
      (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, map.getZoom());
    const diameterPx = (lat: number, radiusNM: number) =>
      (2 * radiusNM * 1852) / metresPerPixel(lat);

    const sized: { lat: number; radiusNM: number; element: HTMLElement; min: number }[] = [];

    const addCircle = (
      item: { id: string; lat: number; lon: number; radiusNM: number; label: string },
      className: string,
      onClick?: (id: string) => void,
      colour?: string
    ) => {
      const element = document.createElement(onClick ? "button" : "div");
      if (onClick) (element as HTMLButtonElement).type = "button";
      element.className = className;
      element.setAttribute("aria-label", item.label);
      element.title = item.label;
      if (colour) element.style.setProperty("--salty-ring", colour);
      if (onClick) {
        element.addEventListener("click", (event) => {
          event.stopPropagation();
          onClick(item.id);
        });
      }
      sized.push({ lat: item.lat, radiusNM: item.radiusNM, element, min: 26 });
      overlayMarkers.current.push(
        new maplibregl.Marker({ element }).setLngLat([item.lon, item.lat]).addTo(map)
      );
    };

    hazards
      .filter((hazard) => Number.isFinite(hazard.lat) && Number.isFinite(hazard.lon))
      .forEach((hazard) =>
        addCircle(
          { ...hazard, label: hazard.title, radiusNM: hazard.radiusNM || 25 },
          "salty-hazard-circle",
          undefined,
          HAZARD_COLOR[hazard.severity] || HAZARD_COLOR.Advisory
        )
      );

    searchZones.forEach((zone) =>
      addCircle(
        zone,
        "salty-search-circle" +
          (zone.id === selectedSearchZoneId ? " is-selected" : ""),
        (id) => searchRef.current?.(id)
      )
    );

    // Waypoints along each path, so a projection reads as a track even when
    // the line layer cannot tile.
    paths.forEach((path) =>
      path.points.forEach((point, index) => {
        const dot = document.createElement("div");
        dot.className =
          "salty-waypoint" +
          (path.kind === "drift" ? " is-drift" : "") +
          (index === path.points.length - 1 ? " is-last" : "");
        overlayMarkers.current.push(
          new maplibregl.Marker({ element: dot }).setLngLat([point.lon, point.lat]).addTo(map)
        );
      })
    );

    fleet.forEach((unit) => {
      const element = document.createElement("button");
      element.type = "button";
      element.className =
        `salty-fleet-pin tone-${unit.tone || "normal"}` +
        (unit.id === selectedFleetId ? " is-selected" : "");
      element.setAttribute("aria-label", unit.label);
      element.title = unit.label;
      element.innerHTML = '<span class="salty-fleet-arrow"></span>';
      element.addEventListener("click", (event) => {
        event.stopPropagation();
        fleetRef.current?.(unit.id);
      });
      const marker = new maplibregl.Marker({ element })
        .setLngLat([unit.lon, unit.lat])
        .addTo(map);
      marker.setRotation(unit.headingDeg ?? 0);
      overlayMarkers.current.push(marker);
    });

    const resize = () => {
      sized.forEach(({ lat, radiusNM, element, min }) => {
        const size = Math.max(min, Math.round(diameterPx(lat, radiusNM)));
        element.style.width = `${size}px`;
        element.style.height = `${size}px`;
      });
    };
    resize();
    map.on("zoom", resize);
    return () => {
      map.off("zoom", resize);
    };
  }, [hazards, searchZones, selectedSearchZoneId, fleet, selectedFleetId, paths, ready]);

  /* ---- vessel marker ---- */
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || mapRef.current !== map) return;

    if (
      !vessel ||
      !Number.isFinite(vessel.lat) ||
      !Number.isFinite(vessel.lon) ||
      vessel.lat < -90 ||
      vessel.lat > 90 ||
      vessel.lon < -180 ||
      vessel.lon > 180 ||
      !map.getContainer().isConnected
    ) {
      vesselMarker.current?.remove();
      vesselMarker.current = null;
      return;
    }

    try {
      if (!vesselMarker.current) {
        const element = document.createElement("div");
        element.className = "salty-vessel-pin";
        element.innerHTML = '<span class="salty-vessel-dot"></span>';
        vesselMarker.current = new maplibregl.Marker({ element }).addTo(map);
      }
      vesselMarker.current.setLngLat([vessel.lon, vessel.lat]);
      vesselMarker.current.setRotation(vessel.headingDeg ?? 0);
    } catch (error) {
      // A map can be removed between the checks above and Marker.addTo during
      // a route transition. Retry naturally on the next ready/prop update.
      console.warn("Could not update vessel marker", error);
      vesselMarker.current = null;
    }
  }, [vessel, ready]);

  /* ---- home port marker ---- */
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    portMarker.current?.remove();
    portMarker.current = null;
    if (!port) return;

    const element = document.createElement("div");
    element.className = "salty-port-pin";
    element.title = port.name;
    portMarker.current = new maplibregl.Marker({ element })
      .setLngLat([port.lon, port.lat])
      .addTo(map);
  }, [port, ready]);

  /* ---- frame everything once the data lands ---- */
  const fittedKey = React.useRef<string | null>(null);
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !autoFitKey || fittedKey.current === autoFitKey) return;

    const points: [number, number][] = [
      ...zones.map((zone) => [zone.lon, zone.lat] as [number, number]),
      ...(port ? [[port.lon, port.lat] as [number, number]] : []),
      ...(vessel ? [[vessel.lon, vessel.lat] as [number, number]] : []),
    ];
    if (points.length < 2) return;

    fittedKey.current = autoFitKey;
    const bounds = points.reduce(
      (acc, point) => acc.extend(point),
      new maplibregl.LngLatBounds(points[0], points[0])
    );
    map.fitBounds(bounds, {
      padding: {
        top: 110,
        right: 56,
        bottom: Math.max(40, autoFitBottomPadding),
        left: 56,
      },
      maxZoom: 10,
      duration: 700,
    });
  }, [autoFitKey, autoFitBottomPadding, zones, port, vessel, ready]);

  /* ---- recentre ---- */
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.easeTo({ center: [center.lon, center.lat], duration: 600 });
  }, [center.lat, center.lon, ready]);

  const offeredOverlays = overlayKeys;

  return (
    <div className={`relative overflow-hidden bg-slate-900 ${className || ""}`}>
      {/* Sized with h/w rather than inset-0: maplibre-gl.css sets
          .maplibregl-map { position: relative } and, loading after the
          Tailwind layer, it wins over `absolute` — which collapsed this box to
          zero height and hid the canvas, controls and markers inside it. */}
      <div ref={container} className="h-full w-full" />

      {/* Basemap switch */}
      <div className="pointer-events-auto absolute left-3 top-3 z-10 flex overflow-hidden rounded-lg border border-zinc-200 bg-white/95 shadow-sm backdrop-blur">
        {(
          [
            { id: "ocean", label: "Ocean", icon: Waves },
            { id: "streets", label: "Map", icon: Map },
            { id: "satellite", label: "Satellite", icon: Satellite },
          ] as { id: Basemap; label: string; icon: React.ElementType }[]
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setBasemap(id)}
            aria-pressed={basemap === id}
            className={`flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium transition-colors ${
              basemap === id ? "bg-zinc-900 text-white" : "text-zinc-600"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Layer chips: PFZ toggles on its own, the rasters are one-of-many */}
      {(onOverlayChange || onToggleZones) && (
        <div className="pointer-events-auto absolute left-3 right-3 top-14 z-10 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:right-auto">
          {onToggleZones && (
            <>
              <button
                type="button"
                onClick={() => onToggleZones(!showZones)}
                aria-pressed={showZones}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium shadow-sm backdrop-blur transition-colors ${
                  showZones
                    ? "border-emerald-700 bg-emerald-600 text-white"
                    : "border-zinc-200 bg-white/95 text-zinc-600"
                }`}
              >
                <Fish className="h-3 w-3" />
                <span>Fishing zones</span>
                {zones.length > 0 && (
                  <span
                    className={`rounded-full px-1 text-[10px] font-semibold ${
                      showZones ? "bg-emerald-700/60" : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {zones.length}
                  </span>
                )}
              </button>
              <span
                aria-hidden
                className="my-1 w-px shrink-0 self-stretch bg-zinc-300/70"
              />
            </>
          )}

          {onOverlayChange && (
          <button
            type="button"
            onClick={() => onOverlayChange(null)}
            aria-pressed={overlay === null}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium shadow-sm backdrop-blur transition-colors ${
              overlay === null
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-200 bg-white/95 text-zinc-600"
            }`}
          >
            <Layers className="h-3 w-3" />
            <span>No layer</span>
          </button>
          )}
          {onOverlayChange && offeredOverlays.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => onOverlayChange(key)}
              aria-pressed={overlay === key}
              disabled={overlayState === "unavailable"}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-medium shadow-sm backdrop-blur transition-colors disabled:opacity-40 ${
                overlay === key
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 bg-white/95 text-zinc-600"
              }`}
            >
              {osfLayers[key].label}
            </button>
          ))}
        </div>
      )}

      {/* Legend for the active overlay */}
      {overlay && files && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={osfLegendUrl(overlay, files)}
          alt={`${osfLayers[overlay].label} legend`}
          className="absolute bottom-16 right-3 z-10 max-h-44 max-w-24 rounded-md bg-white/95 p-1 shadow-sm"
        />
      )}

      {tileError && basemap !== "ocean" && (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 mx-auto max-w-56 -translate-y-1/2 rounded-lg bg-white/95 px-3 py-2 text-center text-[11px] leading-snug text-zinc-700 shadow-sm">
          Basemap imagery could not be reached. Switch to Ocean to keep working
          offline — zones and your position still show.
        </div>
      )}

      {overlayState === "unavailable" && (
        <div className="pointer-events-none absolute bottom-3 left-3 right-24 z-10 rounded-md bg-white/95 px-2 py-1 text-[10px] leading-snug text-zinc-600 shadow-sm sm:right-auto sm:max-w-56">
          INCOIS forecast layers unreachable from this network
        </div>
      )}

      {enableValueInspection && inspection && inspection.forOverlay === overlay && (
        <div className="absolute bottom-3 left-3 z-10 max-w-64 rounded-lg border border-zinc-200 bg-white/95 px-2.5 py-2 shadow-sm backdrop-blur">
          <div className="font-sans text-[10px] text-zinc-500">{inspection.coord}</div>
          <div className="mt-0.5 font-sans text-[11px] font-medium text-zinc-900">
            {inspection.value}
          </div>
          <button
            type="button"
            onClick={() => setInspection(null)}
            className="mt-1 text-[10px] text-zinc-500 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {onFollowVessel && (
        <button
          type="button"
          onClick={onFollowVessel}
          aria-label="Centre on my position"
          className="absolute bottom-16 left-3 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white/95 text-zinc-700 shadow-sm backdrop-blur active:scale-95"
        >
          <Crosshair className="h-5 w-5" />
        </button>
      )}

      {children}
    </div>
  );
}
