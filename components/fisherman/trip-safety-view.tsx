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
import {
  assessTripRisk,
  fetchPfzZones,
  fetchPointConditions,
  type BoatType,
  type DataSource,
  type PfzZoneFeature,
  type PointConditions,
  type TripRiskRequest,
  type TripRiskResult,
} from "@/lib/fisherman-api";
import { formatCoord } from "@/lib/geo";

const BOAT_TYPES: { id: BoatType; label: string }[] = [
  { id: "craft", label: "Country craft, non-motorised (under 24 ft)" },
  { id: "motorized", label: "Motorised FRP craft (28–34 ft)" },
  { id: "trawler", label: "Mechanised trawler (48 ft)" },
  { id: "longliner", label: "Deep-sea longliner (65 ft and above)" },
];

/** `datetime-local` wants a local-time string, not an ISO/UTC one. */
function toLocalInput(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
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
  const searchParams = useSearchParams();
  const presetZone = searchParams.get("zone");

  const [conditions, setConditions] = React.useState<PointConditions | null>(null);
  const [conditionsSource, setConditionsSource] = React.useState<DataSource>("demo");
  const [conditionsReason, setConditionsReason] = React.useState<string | undefined>();

  const [zones, setZones] = React.useState<PfzZoneFeature[]>([]);
  const [destinationId, setDestinationId] = React.useState<string>(presetZone || "");
  const [boatType, setBoatType] = React.useState<BoatType>("motorized");
  const [departureAt, setDepartureAt] = React.useState(() =>
    toLocalInput(new Date(Date.now() + 60 * 60 * 1000))
  );
  const [returnAt, setReturnAt] = React.useState(() =>
    toLocalInput(new Date(Date.now() + 9 * 60 * 60 * 1000))
  );

  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [assessing, setAssessing] = React.useState(false);
  const [result, setResult] = React.useState<TripRiskResult | null>(null);
  const [resultSource, setResultSource] = React.useState<DataSource>("demo");
  const [resultReason, setResultReason] = React.useState<string | undefined>();
  // The exact trip that was assessed, so "add to my trips" saves what the
  // fisherman actually saw a score for rather than whatever the form says now.
  const [assessed, setAssessed] = React.useState<TripRiskRequest | null>(null);
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!destination || !canSubmit) return;

    setSheetOpen(true);
    setAssessing(true);
    setResult(null);
    setResultReason(undefined);
    setAdded(false);

    const request: TripRiskRequest = {
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
          <DataBadge source={conditionsSource} reason={conditionsReason} />
        </div>

        <div className="p-3">
          {conditions ? (
            <ConditionsGrid conditions={conditions} columns={4} />
          ) : (
            <div className="flex items-center gap-2 py-6 text-xs text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading conditions at your coast…</span>
            </div>
          )}
        </div>

        <div className="border-t border-zinc-100 px-4 py-2.5">
          <label className="flex items-center justify-between gap-3 text-[11px] text-zinc-500">
            <span>Not your coast?</span>
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
          <h2 className="text-sm font-bold text-zinc-950">Plan your trip</h2>
          <p className="mt-0.5 text-[11px] text-zinc-500">
            SALTY checks these against the forecast for the water you will cross.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          <div>
            <label htmlFor="port" className={LABEL}>
              <Anchor className="h-3 w-3" />
              <span>Port you are leaving from</span>
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
              <span>Fishing zone or sector you are heading to</span>
            </label>
            <select
              id="destination"
              value={destinationId}
              onChange={(event) => setDestinationId(event.target.value)}
              className={FIELD}
              disabled={zones.length === 0}
            >
              {zones.length === 0 && <option value="">Loading zones…</option>}
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
            {destination && (
              <p className="mt-1.5 font-sans text-[11px] text-zinc-500">
                {destination.distanceNM} NM · bearing {destination.bearing} (
                {destination.bearingDeg}°) · depth {destination.depthMeters} m
              </p>
            )}
          </div>

          <div>
            <label htmlFor="boat" className={LABEL}>
              <Sailboat className="h-3 w-3" />
              <span>Type of boat</span>
            </label>
            <select
              id="boat"
              value={boatType}
              onChange={(event) => setBoatType(event.target.value as BoatType)}
              className={FIELD}
            >
              {BOAT_TYPES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="departure" className={LABEL}>
                <Clock className="h-3 w-3" />
                <span>Departure</span>
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
                <span>Expected return</span>
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
              Your return time is before your departure time.
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
            <span>{assessing ? "Checking…" : "Check this trip"}</span>
          </Button>

          <p className="text-center text-[10px] leading-relaxed text-zinc-400">
            SALTY supports your judgement, it does not replace official IMD and
            INCOIS warnings.
          </p>
        </form>
      </section>

      <RiskResultSheet
        open={sheetOpen}
        loading={assessing}
        result={result}
        source={resultSource}
        reason={resultReason}
        destinationName={destination?.name || "your destination"}
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
