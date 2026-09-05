"use client";

/**
 * Fisherman Vessel / GPS screen.
 *
 * Starts a trip, follows the device GPS live on an ocean map with the coastline
 * boundary, PFZ zones and hazard areas drawn as layers, and keeps the weather
 * for the boat's own position beside the map.
 */

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Compass,
  Gauge,
  History,
  Loader2,
  Navigation,
  Play,
  Sailboat,
  Square,
  Timer,
  Trash2,
} from "lucide-react";
import { useMarine } from "@/lib/marine-context";
import { Button } from "@/components/ui/button";
import { OceanMap, type MapHazard, type MapZone } from "@/components/map/ocean-map";
import { ConditionsGrid } from "@/components/fisherman/conditions-grid";
import { DataBadge } from "@/components/fisherman/data-badge";
import { OfflineMapCard } from "@/components/fisherman/offline-map-card";
import { useGeolocation } from "@/lib/use-geolocation";
import { compassPoint, distanceNM, formatCoord } from "@/lib/geo";
import {
  addTripRecord,
  removePlannedTrip,
  usePlannedTrips,
  useTripHistory,
  type PlannedTrip,
} from "@/lib/trip-store";
import {
  endTrip,
  fetchOceanAlerts,
  fetchPfzZones,
  fetchPointConditions,
  pushTripPing,
  startTrip,
  type BoatType,
  type DataSource,
  type OceanAlert,
  type PfzZoneFeature,
  type PointConditions,
  type TripSession,
} from "@/lib/fisherman-api";
import type { OsfLayerKey } from "@/lib/incois-layers";
import { useT, type TranslationKey } from "@/lib/i18n";
import { SpeakButton } from "@/components/fisherman/speak-button";
import { conditionsSpeech } from "@/components/fisherman/speech-text";

const BOAT_TYPES: { id: BoatType; labelKey: TranslationKey }[] = [
  { id: "craft", labelKey: "boat.craft" },
  { id: "motorized", labelKey: "boat.motorized" },
  { id: "trawler", labelKey: "boat.trawler" },
  { id: "longliner", labelKey: "boat.longliner" },
];

const PING_INTERVAL_MS = 30_000;
const FIELD =
  "h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10";
const LABEL =
  "mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500";

function whenLabel(iso: string): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function elapsedLabel(fromMs: number, nowMs: number): string {
  const minutes = Math.max(0, Math.floor((nowMs - fromMs) / 60_000));
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-zinc-400">
        <Icon className="h-3 w-3" />
        <span>{label}</span>
      </div>
      <div className="mt-1 text-sm font-semibold text-zinc-950">{value}</div>
      {hint && <div className="text-[10px] text-zinc-500">{hint}</div>}
    </div>
  );
}

export function TripTrackerView() {
  const { location, startJourney } = useMarine();
  const { t } = useT();
  const searchParams = useSearchParams();
  const presetZone = searchParams.get("zone");

  const [zones, setZones] = React.useState<PfzZoneFeature[]>([]);
  const [alerts, setAlerts] = React.useState<OceanAlert[]>([]);
  const [destinationId, setDestinationId] = React.useState(presetZone || "");
  const [boatType, setBoatType] = React.useState<BoatType>("motorized");

  const [trip, setTrip] = React.useState<TripSession | null>(null);
  const [tripSource, setTripSource] = React.useState<DataSource>("demo");
  const [tripReason, setTripReason] = React.useState<string | undefined>();
  const [starting, setStarting] = React.useState(false);

  const [conditions, setConditions] = React.useState<PointConditions | null>(null);
  const [conditionsSource, setConditionsSource] = React.useState<DataSource>("demo");

  const [overlay, setOverlay] = React.useState<OsfLayerKey | null>(null);
  const [showZones, setShowZones] = React.useState(true);
  const [sheetOpen, setSheetOpen] = React.useState(true);
  const [now, setNow] = React.useState(() => Date.now());
  const [follow, setFollow] = React.useState(true);

  const { fix, track, status, message, reset } = useGeolocation(Boolean(trip));
  const planned = usePlannedTrips();
  const history = useTripHistory();

  /* Zones + hazards for the coast */
  React.useEffect(() => {
    const controller = new AbortController();
    fetchPfzZones(location.lat, location.lon, controller.signal).then((response) => {
      if (controller.signal.aborted) return;
      setZones(response.data);
      setDestinationId((current) =>
        current && response.data.some((zone) => zone.id === current)
          ? current
          : response.data[0]?.id || ""
      );
    });
    fetchOceanAlerts(location.lat, location.lon, controller.signal).then((response) => {
      if (!controller.signal.aborted) setAlerts(response.data);
    });
    return () => controller.abort();
  }, [location.lat, location.lon]);

  /* Tick the elapsed clock while a trip runs */
  React.useEffect(() => {
    if (!trip) return;
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [trip]);

  /* Weather for wherever the boat actually is; refetched when it moves */
  const positionKey = fix
    ? `${fix.lat.toFixed(1)},${fix.lon.toFixed(1)}`
    : `${location.lat.toFixed(1)},${location.lon.toFixed(1)}`;

  React.useEffect(() => {
    const [lat, lon] = positionKey.split(",").map(Number);
    const controller = new AbortController();
    fetchPointConditions(lat, lon, controller.signal).then((response) => {
      if (controller.signal.aborted) return;
      setConditions(response.data);
      setConditionsSource(response.source);
    });
    return () => controller.abort();
  }, [positionKey]);

  /* Report position to the coastal operator console */
  const fixRef = React.useRef(fix);
  React.useEffect(() => {
    fixRef.current = fix;
  }, [fix]);

  React.useEffect(() => {
    if (!trip) return;
    const timer = window.setInterval(() => {
      const current = fixRef.current;
      if (!current) return;
      void pushTripPing(trip.tripId, {
        lat: current.lat,
        lon: current.lon,
        at: new Date(current.at).toISOString(),
        speedKnots: current.speedKnots,
        headingDeg: current.headingDeg,
        accuracyM: current.accuracyM,
      });
    }, PING_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [trip]);

  const destination = zones.find((zone) => zone.id === destinationId) || null;

  const beginTrip = async (options: {
    zoneId: string | null;
    zoneName: string | null;
    boat: BoatType;
    distanceNM: number | null;
    expectedReturnAt: string | null;
  }) => {
    setStarting(true);
    const response = await startTrip({
      departurePort: location.name,
      departureLat: location.lat,
      departureLon: location.lon,
      destinationZoneId: options.zoneId,
      destinationZoneName: options.zoneName,
      boatType: options.boat,
      expectedReturnAt: options.expectedReturnAt,
    });
    setTrip(response.data);
    setTripSource(response.source);
    setTripReason(response.reason);
    setStarting(false);
    setFollow(true);
    setSheetOpen(false);
    // Keeps the existing operator notification behaviour working.
    if (options.zoneName) {
      startJourney(options.zoneName, options.distanceNM ?? 0);
    }
  };

  const handleStart = () =>
    beginTrip({
      zoneId: destination?.id || null,
      zoneName: destination?.name || null,
      boat: boatType,
      distanceNM: destination?.distanceNM ?? null,
      expectedReturnAt: null,
    });

  const handleStartPlanned = (plan: PlannedTrip) => {
    setDestinationId(plan.destinationZoneId);
    setBoatType(plan.boatType);
    removePlannedTrip(plan.id);
    return beginTrip({
      zoneId: plan.destinationZoneId,
      zoneName: plan.destinationZoneName,
      boat: plan.boatType,
      distanceNM: plan.distanceNM,
      expectedReturnAt: plan.returnAt || null,
    });
  };

  const handleEnd = async () => {
    if (!trip) return;
    void endTrip(trip.tripId);

    // Keep the run in the fisherman's own history, measured from the track we
    // actually recorded rather than from the plan.
    const covered = track.reduce(
      (total, point, index) =>
        index === 0 ? 0 : total + distanceNM(track[index - 1], point),
      0
    );
    const speeds = track
      .map((point) => point.speedKnots)
      .filter((value): value is number => value != null);

    addTripRecord({
      startedAt: trip.startedAt,
      endedAt: new Date().toISOString(),
      departurePort: trip.departurePort,
      destinationZoneName: trip.destinationZoneName,
      boatType: trip.boatType,
      distanceNM: Number(covered.toFixed(1)),
      maxSpeedKnots: speeds.length ? Number(Math.max(...speeds).toFixed(1)) : null,
      pointCount: track.length,
      offline: tripSource === "demo",
    });

    setTrip(null);
    setSheetOpen(true);
    reset();
  };

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

  const mapHazards: MapHazard[] = React.useMemo(
    () =>
      alerts
        .filter((alert) => alert.lat != null && alert.lon != null)
        .map((alert) => ({
          id: alert.id,
          title: alert.title,
          lat: alert.lat as number,
          lon: alert.lon as number,
          radiusNM: alert.radiusNM || 30,
          severity: alert.severity,
        })),
    [alerts]
  );

  const center = React.useMemo(() => {
    if (follow && fix) return { lat: fix.lat, lon: fix.lon };
    return { lat: location.lat, lon: location.lon };
  }, [follow, fix, location.lat, location.lon]);

  const distanceFromPort = fix
    ? distanceNM({ lat: location.lat, lon: location.lon }, fix)
    : null;
  const distanceToZone =
    fix && destination
      ? distanceNM(fix, { lat: destination.lat, lon: destination.lon })
      : null;

  const severeAlerts = alerts.filter(
    (alert) => alert.severity === "Critical" || alert.severity === "Severe"
  );

  /* -------------------------------------------------------------- */

  const panel = (
    <div className="flex h-full flex-col overflow-y-auto">
      {!trip ? (
        <div className="space-y-6 p-4">
          {/* Trips saved from a safety check */}
          {planned.length > 0 && (
            <section className="space-y-2">
              <h2 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                <CalendarClock className="h-3 w-3" />
                <span>{t("trip.plannedCount", { count: planned.length })}</span>
              </h2>

              {planned.map((plan) => (
                <div
                  key={plan.id}
                  className="rounded-xl border border-zinc-200 bg-white p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold text-zinc-950">
                        {plan.destinationZoneName}
                      </div>
                      <div className="mt-0.5 font-sans text-[11px] text-zinc-500">
                        {whenLabel(plan.departureAt)} &middot; {plan.distanceNM}{" "}
                        {t("common.unit.nm")}
                      </div>
                    </div>
                    {plan.risk && (
                      <span
                        title={
                          plan.risk.source === "demo"
                            ? t("trip.riskDemoNote")
                            : t("trip.riskLiveNote")
                        }
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          plan.risk.level === "Low"
                            ? "bg-emerald-50 text-emerald-700"
                            : plan.risk.level === "Moderate"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {plan.risk.score}
                        {plan.risk.source === "demo" ? "*" : ""}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      onClick={() => void handleStartPlanned(plan)}
                      disabled={starting}
                      className="h-9 flex-1 gap-1.5 bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      <Play className="h-3.5 w-3.5" />
                      <span>{t("trip.startThis")}</span>
                    </Button>
                    <button
                      type="button"
                      onClick={() => removePlannedTrip(plan.id)}
                      aria-label={t("trip.removePlanned", { zone: plan.destinationZoneName })}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-200 text-zinc-400 active:bg-zinc-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* Ad-hoc trip */}
          <section className="space-y-4">
            <div>
              <h2 className="text-sm font-bold text-zinc-950">
                {planned.length > 0 ? t("trip.orStartNew") : t("trip.start")}
              </h2>
            <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">
              {t("trip.trackHint")}
            </p>
          </div>

          <div>
            <label htmlFor="trip-zone" className={LABEL}>
              {t("trip.whereHeading")}
            </label>
            <select
              id="trip-zone"
              value={destinationId}
              onChange={(event) => setDestinationId(event.target.value)}
              className={FIELD}
              disabled={zones.length === 0}
            >
              {zones.length === 0 && <option value="">{t("risk.loadingZones")}</option>}
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
            {destination && (
              <p className="mt-1.5 font-sans text-[11px] text-zinc-500">
                {destination.distanceNM} {t("common.unit.nm")} · {destination.bearing} (
                {destination.bearingDeg}°)
              </p>
            )}
          </div>

          <div>
            <label htmlFor="trip-boat" className={LABEL}>
              {t("trip.boat")}
            </label>
            <select
              id="trip-boat"
              value={boatType}
              onChange={(event) => setBoatType(event.target.value as BoatType)}
              className={FIELD}
            >
              {BOAT_TYPES.map((item) => (
                <option key={item.id} value={item.id}>
                  {t(item.labelKey)}
                </option>
              ))}
            </select>
          </div>

          <Button
            onClick={handleStart}
            disabled={starting}
            className="h-12 w-full gap-2 bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            {starting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            <span>{starting ? t("trip.starting") : t("trip.startAndTrack")}</span>
          </Button>

          </section>

          <OfflineMapCard
            areaLabel={t("trip.offlineArea", { port: location.name })}
          />

          {/* Past trips */}
          <section className="space-y-2">
            <h2 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              <History className="h-3 w-3" />
              <span>{t("trip.history")}</span>
            </h2>

            {history.length === 0 ? (
              <p className="rounded-xl border border-dashed border-zinc-200 px-3 py-4 text-center text-[11px] leading-relaxed text-zinc-500">
                {t("trip.noHistoryLong")}
              </p>
            ) : (
              <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200">
                {history.map((record) => (
                  <li key={record.id} className="bg-white px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold text-zinc-950">
                          {record.destinationZoneName || t("trip.openWater")}
                        </div>
                        <div className="mt-0.5 font-sans text-[11px] text-zinc-500">
                          {whenLabel(record.startedAt)} &middot;{" "}
                          {elapsedLabel(
                            new Date(record.startedAt).getTime(),
                            new Date(record.endedAt).getTime()
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 text-right font-sans text-[11px]">
                        <div className="font-semibold text-zinc-900">
                          {record.distanceNM} {t("common.unit.nm")}
                        </div>
                        {record.maxSpeedKnots != null && (
                          <div className="text-zinc-400">
                            {t("trip.max")} {record.maxSpeedKnots} {t("common.unit.knots")}
                          </div>
                        )}
                      </div>
                    </div>
                    {record.offline && (
                      <p className="mt-1 text-[10px] text-amber-700">
                        {t("trip.notRegistered")}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {severeAlerts.length > 0 && (
            <div className="space-y-2 rounded-xl border border-rose-200 bg-rose-50/70 p-3">
              <h3 className="flex items-center gap-1.5 text-xs font-bold text-rose-900">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>{t("trip.warnings")}</span>
              </h3>
              {severeAlerts.map((alert) => (
                <div key={alert.id} className="text-[11px] leading-relaxed text-rose-900">
                  <strong className="block">{alert.title}</strong>
                  <span className="text-rose-800/80">{alert.action}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-1.5 text-sm font-bold text-zinc-950">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
                </span>
                <span>{t("trip.active")}</span>
              </h2>
              <p className="mt-0.5 text-[11px] text-zinc-500">
                {trip.destinationZoneName
                  ? t("trip.fromTo", {
                      port: trip.departurePort,
                      zone: trip.destinationZoneName,
                    })
                  : t("trip.fromOnly", { port: trip.departurePort })}
              </p>
            </div>
            <DataBadge source={tripSource} reason={tripReason} />
          </div>

          {tripSource === "demo" && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-900">
              {t("trip.demoTrack")}
            </p>
          )}

          {status !== "tracking" && (
            <div className="flex items-start gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-[11px] leading-relaxed text-zinc-700">
              {status === "locating" ? (
                <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-zinc-500" />
              ) : (
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
              )}
              <span>{message || t("trip.gpsWaiting")}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Stat
              icon={Gauge}
              label={t("trip.speed")}
              value={
                fix?.speedKnots != null ? `${fix.speedKnots.toFixed(1)} kts` : "—"
              }
            />
            <Stat
              icon={Compass}
              label={t("trip.heading")}
              value={
                fix?.headingDeg != null
                  ? `${Math.round(fix.headingDeg)}° ${compassPoint(fix.headingDeg)}`
                  : "—"
              }
            />
            <Stat
              icon={Navigation}
              label={t("trip.fromPort")}
              value={distanceFromPort != null ? `${distanceFromPort.toFixed(1)} NM` : "—"}
              hint={trip.departurePort}
            />
            <Stat
              icon={Sailboat}
              label={t("trip.toZone")}
              value={distanceToZone != null ? `${distanceToZone.toFixed(1)} NM` : "—"}
              hint={destination?.name.split("(")[0].trim()}
            />
            <Stat
              icon={Timer}
              label={t("trip.elapsed")}
              value={elapsedLabel(new Date(trip.startedAt).getTime(), now)}
            />
            <Stat
              icon={Activity}
              label={t("trip.accuracy")}
              value={fix?.accuracyM != null ? `±${Math.round(fix.accuracyM)} m` : "—"}
              hint={t("trip.pointsLogged", { count: track.length })}
            />
          </div>

          {fix && (
            <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-center font-sans text-[11px] text-zinc-700">
              {formatCoord(fix.lat, fix.lon)}
            </p>
          )}

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                {t("trip.weatherHere")}
              </h3>
              <div className="flex items-center gap-1.5">
                {conditions && (
                  <SpeakButton
                    size="sm"
                    text={conditionsSpeech(t, location.name, conditions)}
                  />
                )}
                <DataBadge source={conditionsSource} />
              </div>
            </div>
            {conditions ? (
              <ConditionsGrid conditions={conditions} columns={2} />
            ) : (
              <div className="flex items-center gap-2 py-4 text-xs text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t("common.loading")}</span>
              </div>
            )}
          </section>

          {severeAlerts.length > 0 && (
            <div className="space-y-2 rounded-xl border border-rose-200 bg-rose-50/70 p-3">
              <h3 className="flex items-center gap-1.5 text-xs font-bold text-rose-900">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>{t("trip.warnings")}</span>
              </h3>
              {severeAlerts.map((alert) => (
                <div key={alert.id} className="text-[11px] leading-relaxed text-rose-900">
                  <strong className="block">{alert.title}</strong>
                  <span className="text-rose-800/80">{alert.action}</span>
                </div>
              ))}
            </div>
          )}

          <Button
            onClick={handleEnd}
            variant="outline"
            className="h-12 w-full gap-2 border-rose-200 bg-rose-50 text-sm font-semibold text-rose-700 hover:bg-rose-100"
          >
            <Square className="h-4 w-4" />
            <span>{t("trip.end")}</span>
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="-mx-4 -mt-4 h-[calc(100dvh-8.5rem)] sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8 lg:h-[calc(100dvh-4.5rem)]">
      <div className="flex h-full">
        <div className="relative h-full flex-1">
          <OceanMap
            className="h-full w-full"
            center={center}
            zoom={fix ? 10 : 8}
            zones={mapZones}
            selectedZoneId={destinationId}
            onSelectZone={(id) => id && setDestinationId(id)}
            hazards={mapHazards}
            vessel={
              fix
                ? { lat: fix.lat, lon: fix.lon, headingDeg: fix.headingDeg }
                : null
            }
            track={track}
            port={{ lat: location.lat, lon: location.lon, name: location.name }}
            overlay={overlay}
            onOverlayChange={setOverlay}
            showZones={showZones}
            onToggleZones={setShowZones}
            showBoundary
            onFollowVessel={fix ? () => setFollow(true) : undefined}
            autoFitKey={trip ? null : `${location.lat},${location.lon}`}
            autoFitBottomPadding={sheetOpen ? 280 : 90}
          />

          {/* Mobile bottom sheet */}
          <div
            className={`absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-2xl border-t border-zinc-200 bg-white shadow-[0_-8px_24px_rgba(0,0,0,0.10)] transition-[height] duration-200 lg:hidden ${
              sheetOpen ? (trip ? "h-[78%]" : "h-[64%]") : "h-14"
            }`}
          >
            <button
              type="button"
              onClick={() => setSheetOpen((open) => !open)}
              aria-expanded={sheetOpen}
              className="flex h-14 shrink-0 items-center justify-between px-4 text-left"
            >
              <span className="text-xs font-semibold text-zinc-950">
                {trip ? t("trip.active") : t("trip.start")}
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

        <aside className="hidden h-full w-[380px] shrink-0 border-l border-zinc-200 bg-white lg:block">
          {panel}
        </aside>
      </div>
    </div>
  );
}
