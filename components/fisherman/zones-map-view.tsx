"use client";

/**
 * Fisherman Fishing Zones screen: a map of the fisherman's own stretch of
 * coast with PFZ advisory circles drawn as a layer. Tapping a circle opens
 * that zone's species, weather and sea conditions for its coordinates.
 */

import * as React from "react";
import { ChevronDown, ChevronUp, MapPin } from "lucide-react";
import { useMarine } from "@/lib/marine-context";
import { OceanMap, type MapZone } from "@/components/map/ocean-map";
import { ZonePanel } from "@/components/fisherman/zone-panel";
import {
  fetchPfzZones,
  fetchZoneDetail,
  type DataSource,
  type PfzZoneFeature,
  type ZoneDetail,
} from "@/lib/fisherman-api";
import type { OsfLayerKey } from "@/lib/incois-layers";

export function ZonesMapView() {
  const { location } = useMarine();

  const [zones, setZones] = React.useState<PfzZoneFeature[]>([]);
  const [zonesSource, setZonesSource] = React.useState<DataSource>("demo");
  const [zonesReason, setZonesReason] = React.useState<string | undefined>();

  const [selectedZoneId, setSelectedZoneId] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<ZoneDetail | null>(null);
  const [detailSource, setDetailSource] = React.useState<DataSource>("demo");

  const [overlay, setOverlay] = React.useState<OsfLayerKey | null>(null);
  const [showZones, setShowZones] = React.useState(true);
  const [sheetOpen, setSheetOpen] = React.useState(true);

  // Loading is derived from "which request has landed" rather than a flag set
  // at the top of an effect, so no state is written synchronously during one.
  const coastKey = `${location.lat},${location.lon}`;
  const [loadedCoastKey, setLoadedCoastKey] = React.useState<string | null>(null);
  const zonesLoading = loadedCoastKey !== coastKey;

  const [loadedZoneId, setLoadedZoneId] = React.useState<string | null>(null);
  const detailLoading = Boolean(selectedZoneId) && loadedZoneId !== selectedZoneId;
  const shownDetail =
    detail && detail.zoneId === selectedZoneId ? detail : null;

  /* Zones for the fisherman's stretch of coast */
  React.useEffect(() => {
    const controller = new AbortController();
    fetchPfzZones(location.lat, location.lon, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      setZones(result.data);
      setZonesSource(result.source);
      setZonesReason(result.reason);
      setLoadedCoastKey(coastKey);
    });
    return () => controller.abort();
  }, [location.lat, location.lon, coastKey]);

  /* Detail for the tapped zone */
  React.useEffect(() => {
    if (!selectedZoneId) return;
    const controller = new AbortController();
    fetchZoneDetail(selectedZoneId, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      setDetail(result.data);
      setDetailSource(result.source);
      setLoadedZoneId(selectedZoneId);
    });
    return () => controller.abort();
  }, [selectedZoneId]);

  const mapZones: MapZone[] = React.useMemo(
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

  // Centre on the selected zone, otherwise on the fisherman's own coast.
  const center = React.useMemo(() => {
    const zone = zones.find((item) => item.id === selectedZoneId);
    return zone
      ? { lat: zone.lat, lon: zone.lon }
      : { lat: location.lat, lon: location.lon };
  }, [zones, selectedZoneId, location.lat, location.lon]);

  const handleSelect = React.useCallback((zoneId: string | null) => {
    setSelectedZoneId(zoneId);
    if (zoneId) setSheetOpen(true);
  }, []);

  const panel = (
    <ZonePanel
      zones={zones}
      zonesSource={zonesSource}
      zonesReason={zonesReason}
      selectedZoneId={selectedZoneId}
      detail={shownDetail}
      detailSource={detailSource}
      detailLoading={detailLoading}
      onSelect={(id) => handleSelect(id)}
      onBack={() => handleSelect(null)}
      portName={location.name}
    />
  );

  return (
    <div className="-mx-4 -mt-4 h-[calc(100dvh-8.5rem)] sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8 lg:h-[calc(100dvh-4.5rem)]">
      <div className="flex h-full lg:gap-0">
        {/* Map */}
        <div className="relative h-full flex-1">
          <OceanMap
            className="h-full w-full"
            center={center}
            zoom={8}
            zones={mapZones}
            selectedZoneId={selectedZoneId}
            onSelectZone={handleSelect}
            autoFitKey={selectedZoneId ? null : loadedCoastKey}
            autoFitBottomPadding={sheetOpen ? 260 : 90}
            port={{ lat: location.lat, lon: location.lon, name: location.name }}
            overlay={overlay}
            onOverlayChange={setOverlay}
            showZones={showZones}
            onToggleZones={(next) => {
              setShowZones(next);
              // Hiding the layer should not leave a zone selected underneath it.
              if (!next) handleSelect(null);
            }}
            showBoundary
          >
            {/* Location chip */}
            <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white/95 px-2.5 py-1.5 text-[11px] font-medium text-zinc-700 shadow-sm backdrop-blur lg:bottom-3">
              <MapPin className="h-3 w-3 text-sky-600" />
              <span>{location.name}</span>
              {zonesLoading && <span className="text-zinc-400">· loading</span>}
            </div>
          </OceanMap>

          {/* Mobile bottom sheet */}
          <div
            className={`absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-2xl border-t border-zinc-200 bg-white shadow-[0_-8px_24px_rgba(0,0,0,0.10)] transition-[height] duration-200 lg:hidden ${
              !sheetOpen
                ? "h-14"
                : selectedZoneId
                ? "h-[78%]"
                : "h-[56%]"
            }`}
          >
            <button
              type="button"
              onClick={() => setSheetOpen((open) => !open)}
              aria-expanded={sheetOpen}
              className="flex h-14 shrink-0 items-center justify-between px-4 text-left"
            >
              <span className="text-xs font-semibold text-zinc-950">
                {selectedZoneId && detail
                  ? shownDetail?.name || "Zone details"
                  : `${zones.length} fishing ${zones.length === 1 ? "zone" : "zones"} nearby`}
              </span>
              {sheetOpen ? (
                <ChevronDown className="h-4 w-4 text-zinc-400" />
              ) : (
                <ChevronUp className="h-4 w-4 text-zinc-400" />
              )}
            </button>

            {sheetOpen && (
              <div className="min-h-0 flex-1 border-t border-zinc-100">{panel}</div>
            )}
          </div>
        </div>

        {/* Desktop side panel */}
        <aside className="hidden h-full w-[380px] shrink-0 border-l border-zinc-200 bg-white lg:block">
          {panel}
        </aside>
      </div>
    </div>
  );
}
