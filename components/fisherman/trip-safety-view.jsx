"use client";

/**
 * Fisherman Risk & Safety screen.
 *
 * Reads top-down: where the fisherman is right now, then the trip they are
 * planning, then the computed assessment which opens as a sheet. The score,
 * recommendations and precautions all come from the SALTY backend.
 */

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  Anchor,
  CalendarClock,
  Clock,
  Compass,
  Loader2,
  MapPin,
  Sailboat,
  ShieldCheck,
} from "lucide-react";
import { useMarine } from "@/lib/marine-context";
import { marineLocations } from "@/lib/marine-data";
import { Button } from "@/components/ui/button";
import { ConditionsGrid } from "@/components/fisherman/conditions-grid";
import { DataBadge } from "@/components/fisherman/data-badge";
import { RiskResultSheet } from "@/components/fisherman/risk-result-sheet";
import { addPlannedTrip } from "@/lib/trip-store";
import { assessTripRisk, fetchPfzZones, fetchPointConditions } from "@/lib/fisherman-api";
import { formatCoord } from "@/lib/geo";
import { useT } from "@/lib/i18n";
import { SpeakButton } from "@/components/fisherman/speak-button";
import { conditionsSpeech } from "@/components/fisherman/speech-text";

const BOAT_TYPES = [
  { id: "craft", labelKey: "boat.craft" },
  { id: "motorized", labelKey: "boat.motorized" },
  { id: "trawler", labelKey: "boat.trawler" },
  { id: "longliner", labelKey: "boat.longliner" },
];

/** `datetime-local` wants a local-time string, not an ISO/UTC one. */
function toLocalInput(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

const FIELD =
  "h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10";
const LABEL =
  "mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500";

export function TripSafetyView() {
  const { location, setLocationId } = useMarine();
  const { t } = useT();
  const searchParams = useSearchParams();
  const presetZone = searchParams.get("zone");

  const [conditions, setConditions] = React.useState(null);
  const [conditionsSource, setConditionsSource] = React.useState("demo");
  const [conditionsReason, setConditionsReason] = React.useState();

  const [zones, setZones] = React.useState([]);
  const [destinationId, setDestinationId] = React.useState(presetZone || "");
  const [boatType, setBoatType] = React.useState("motorized");
  const [departureAt, setDepartureAt] = React.useState(() =>
    toLocalInput(new Date(Date.now() + 60 * 60 * 1000))
  );
  const [returnAt, setReturnAt] = React.useState(() =>
    toLocalInput(new Date(Date.now() + 9 * 60 * 60 * 1000))
  );

  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [assessing, setAssessing] = React.useState(false);
  const [result, setResult] = React.useState(null);
  const [resultSource, setResultSource] = React.useState("demo");
  const [resultReason, setResultReason] = React.useState();
  // The exact trip that was assessed, so "add to my trips" saves what the
  // fisherman actually saw a score for rather than whatever the form says now.
  const [assessed, setAssessed] = React.useState(null);
  const [added, setAdded] = React.useState(false);

  /* Conditions where the fisherman is */
  React.useEffect(() => {
    const controller = new AbortController();
    fetchPointConditions(location.lat, location.lon, controller.signal).then(
      (response) => {
        if (controller.signal.aborted) return;
        setConditions(response.data);
        setConditionsSource(response.source);
        setConditionsReason(response.reason);
      }
    );
    return () => controller.abort();
  }, [location.lat, location.lon]);

  /* Zones they can head for */
  React.useEffect(() => {
    const controller = new AbortController();
    fetchPfzZones(location.lat, location.lon, controller.signal).then((response) => {
      if (controller.signal.aborted) return;
      setZones(response.data);
      setDestinationId((current) => {
        if (current && response.data.some((zone) => zone.id === current)) {
          return current;
        }
        return response.data[0]?.id || "";
      });
    });
    return () => controller.abort();
  }, [location.lat, location.lon]);

  const destination = zones.find((zone) => zone.id === destinationId) || null;

  const invalidWindow =
    Boolean(departureAt && returnAt) && new Date(returnAt) <= new Date(departureAt);

  const canSubmit = Boolean(destination) && Boolean(departureAt) && !invalidWindow;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!destination || !canSubmit) return;

    setSheetOpen(true);
    setAssessing(true);
    setResult(null);
    setResultReason(undefined);
    setAdded(false);

    const request = {
      departurePort: location.name,
      departureLat: location.lat,
      departureLon: location.lon,
      destinationZoneId: destination.id,
      destinationZoneName: destination.name,
      destinationLat: destination.lat,
      destinationLon: destination.lon,
      boatType,
      departureAt: new Date(departureAt).toISOString(),
      returnAt: returnAt ? new Date(returnAt).toISOString() : "",
    };

    setAssessed(request);
    const response = await assessTripRisk(request);

    setResult(response.data);
    setResultSource(response.source);
    setResultReason(response.reason);
    setAssessing(false);
  };

  return (
    <div className="space-y-5">
      {/* 1 — where you are */}
      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-sky-600" />
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold text-zinc-950">
                {location.name}
              </h1>
              <p className="font-sans text-[11px] text-zinc-500">
                {location.sea} · {formatCoord(location.lat, location.lon)}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {conditions && (
              <SpeakButton
                size="sm"
                text={conditionsSpeech(t, location.name, conditions)}
              />
            )}
            <DataBadge source={conditionsSource} reason={conditionsReason} />
          </div>
        </div>

        <div className="p-3">
          {conditions ? (
            <ConditionsGrid conditions={conditions} columns={4} />
          ) : (
            <div className="flex items-center gap-2 py-6 text-xs text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t("risk.loadingConditions")}</span>
            </div>
          )}
        </div>

        <div className="border-t border-zinc-100 px-4 py-2.5">
          <label className="flex items-center justify-between gap-3 text-[11px] text-zinc-500">
            <span>{t("risk.notYourCoast")}</span>
            <select
              value={location.id}
              onChange={(event) => setLocationId(event.target.value)}
              className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-xs font-medium text-zinc-800"
            >
              {marineLocations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {/* 2 — the trip */}
      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-100 px-4 py-3">
          <h2 className="text-sm font-bold text-zinc-950">{t("risk.planTrip")}</h2>
          <p className="mt-0.5 text-[11px] text-zinc-500">{t("risk.planTripHint")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          <div>
            <label htmlFor="port" className={LABEL}>
              <Anchor className="h-3 w-3" />
              <span>{t("risk.port")}</span>
            </label>
            <select
              id="port"
              value={location.id}
              onChange={(event) => setLocationId(event.target.value)}
              className={FIELD}
            >
              {marineLocations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} — {item.state}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="destination" className={LABEL}>
              <Compass className="h-3 w-3" />
              <span>{t("risk.destination")}</span>
            </label>
            <select
              id="destination"
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
                {destination.distanceNM} {t("common.unit.nm")} · {t("zones.bearing")}{" "}
                {destination.bearing} ({destination.bearingDeg}°) · {t("zones.depth")}{" "}
                {destination.depthMeters} {t("common.unit.m")}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="boat" className={LABEL}>
              <Sailboat className="h-3 w-3" />
              <span>{t("risk.boatType")}</span>
            </label>
            <select
              id="boat"
              value={boatType}
              onChange={(event) => setBoatType(event.target.value)}
              className={FIELD}
            >
              {BOAT_TYPES.map((item) => (
                <option key={item.id} value={item.id}>
                  {t(item.labelKey)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="departure" className={LABEL}>
                <Clock className="h-3 w-3" />
                <span>{t("risk.departure")}</span>
              </label>
              <input
                id="departure"
                type="datetime-local"
                value={departureAt}
                onChange={(event) => setDepartureAt(event.target.value)}
                className={FIELD}
                required
              />
            </div>
            <div>
              <label htmlFor="return" className={LABEL}>
                <CalendarClock className="h-3 w-3" />
                <span>{t("risk.return")}</span>
              </label>
              <input
                id="return"
                type="datetime-local"
                value={returnAt}
                onChange={(event) => setReturnAt(event.target.value)}
                className={FIELD}
              />
            </div>
          </div>

          {invalidWindow && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
              {t("risk.invalidWindow")}
            </p>
          )}

          <Button
            type="submit"
            disabled={!canSubmit || assessing}
            className="h-12 w-full gap-2 bg-zinc-950 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            {assessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            <span>{assessing ? t("risk.checking") : t("risk.check")}</span>
          </Button>

          <p className="text-center text-[10px] leading-relaxed text-zinc-400">
            {t("risk.disclaimer")}
          </p>
        </form>
      </section>

      <RiskResultSheet
        open={sheetOpen}
        loading={assessing}
        result={result}
        source={resultSource}
        reason={resultReason}
        destinationName={destination?.name || t("risk.destinationFallback")}
        added={added}
        onAddToTrips={
          assessed
            ? () => {
                addPlannedTrip({
                  departurePort: assessed.departurePort,
                  departureLat: assessed.departureLat,
                  departureLon: assessed.departureLon,
                  destinationZoneId: assessed.destinationZoneId,
                  destinationZoneName: assessed.destinationZoneName,
                  destinationLat: assessed.destinationLat,
                  destinationLon: assessed.destinationLon,
                  distanceNM: destination?.distanceNM ?? 0,
                  boatType: assessed.boatType,
                  departureAt: assessed.departureAt,
                  returnAt: assessed.returnAt,
                  risk: result
                    ? {
                        score: result.score,
                        level: result.level,
                        source: resultSource,
                      }
                    : null,
                });
                setAdded(true);
              }
            : undefined
        }
        onClose={() => setSheetOpen(false)}
      />
    </div>
  );
}
