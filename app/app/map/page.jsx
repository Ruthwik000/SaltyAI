"use client";

import * as React from "react";
import { Globe2, Layers, MapPin, Radar } from "lucide-react";
import { useMarine } from "@/lib/marine-context";
import { OceanMap } from "@/components/map/ocean-map";
import { fetchPfzZones } from "@/lib/fisherman-api";
import { researchOsfLayers } from "@/lib/incois-layers";
import { OperationsMap } from "@/components/operator/operations-map";

/**
 * Marine Map.
 *
 * Two views, both fed by INCOIS:
 *  - "INCOIS forecast" embeds the official Ocean State Forecast application
 *    through the same-origin proxy, so the real Leaflet app, its WMS layers,
 *    vectors, animation and legends are the ones on screen.
 *  - "Research layers" draws the same verified WMS variables in SALTY's own
 *    map, which adds a point-value readout and the zone overlays.
 *
 * The official page ships with a ministry header and a footer/copyright strip.
 * Both are cropped so the map itself fills the panel — the iframe is taller
 * than its container and pulled up, and the parent clips what hangs off each
 * end. These are the heights of those two bars on the official desktop layout;
 * if INCOIS restyles the page, re-measure them.
 */
const INCOIS_HEADER_PX = 86;
const INCOIS_FOOTER_PX = 120;

export default function MarineMapPage() {
  const { role, location } = useMarine();
  const isResearcher = role === "researcher";
  const isOperator = role === "operator";

  // Operators open on their own picture of the coast; researchers open on the
  // official forecast.
  const [view, setView] = React.useState(role === "operator" ? "operations" : "official");
  const [overlay, setOverlay] = React.useState("sst");
  const [showZones, setShowZones] = React.useState(false);
  const [zones, setZones] = React.useState([]);

  React.useEffect(() => {
    if (!isResearcher) return;
    const controller = new AbortController();
    fetchPfzZones(location.lat, location.lon, controller.signal).then((response) => {
      if (!controller.signal.aborted) setZones(response.data);
    });
    return () => controller.abort();
  }, [isResearcher, location.lat, location.lon]);

  const mapZones = React.useMemo(
    () =>
      zones.map((zone) => ({
        id: zone.id,
        name: zone.name,
        lat: zone.lat,
        lon: zone.lon,
        radiusNM: zone.radiusNM,
        score: zone.suitabilityScore,
      })),
    [zones]
  );

  const official = (
    <div className="relative h-full w-full overflow-hidden bg-white">
      <iframe
        title="INCOIS Ocean State Forecast"
        src="/api/incois/frame/oceanservices/osfforecast.jsp"
        className="absolute left-0 w-full border-0 bg-white"
        style={{
          top: `-${INCOIS_HEADER_PX}px`,
          height: `calc(100% + ${INCOIS_HEADER_PX + INCOIS_FOOTER_PX}px)`,
        }}
        allow="fullscreen"
      />
    </div>
  );

  if (!isResearcher && !isOperator) {
    return (
      <div className="-mx-4 -mt-4 h-[calc(100dvh-4.5rem)] overflow-hidden bg-slate-900 sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8">
        {official}
      </div>
    );
  }

  return (
    <div className="-mx-4 -mt-4 flex h-[calc(100dvh-8.5rem)] flex-col sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8 lg:h-[calc(100dvh-4.5rem)]">
      {/* View switch */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4 py-2">
        <div className="flex overflow-x-auto rounded-lg border border-zinc-200">
          {(isOperator
            ? [
                { id: "operations", label: "Operations", icon: Radar },
                { id: "official", label: "INCOIS forecast", icon: Globe2 },
              ]
            : [
                { id: "official", label: "INCOIS forecast", icon: Globe2 },
                { id: "research", label: "Research layers", icon: Layers },
              ]
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              aria-pressed={view === id}
              className={`flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                view === id ? "bg-zinc-900 text-white" : "bg-white text-zinc-600"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <span className="hidden items-center gap-1.5 text-[11px] text-zinc-500 sm:flex">
          <MapPin className="h-3 w-3 text-sky-600" />
          <span>{location.name}</span>
        </span>
      </div>

      <div className="min-h-0 flex-1 bg-slate-900">
        {view === "official" ? (
          official
        ) : view === "operations" ? (
          <OperationsMap />
        ) : (
          <OceanMap
            className="h-full w-full"
            center={{ lat: location.lat, lon: location.lon }}
            zoom={6}
            zones={mapZones}
            showZones={showZones}
            onToggleZones={setShowZones}
            overlay={overlay}
            onOverlayChange={setOverlay}
            overlayKeys={researchOsfLayers}
            enableValueInspection
            port={{ lat: location.lat, lon: location.lon, name: location.name }}
            showBoundary
          />
        )}
      </div>

      {view === "research" && (
        <p className="shrink-0 border-t border-zinc-200 bg-white px-4 py-1.5 text-[10px] leading-snug text-zinc-500">
          Variables read from the INCOIS Ocean State Forecast WMS. Tap the map to read the
          active variable at that point. Ocean-colour products (chlorophyll, Kd490) are
          not wired yet — their service request has to be captured from the official PFZ
          interface first.
        </p>
      )}
    </div>
  );
}
