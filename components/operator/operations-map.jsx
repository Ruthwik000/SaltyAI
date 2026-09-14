"use client";

/**
 * Coastal operations map.
 *
 * One picture of the coast: who is out there and which zone they are working
 * toward, what weather is threatening them, and — for anyone missing — the
 * drift track from their last known position with the area to search drawn
 * around the datum.
 */

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Compass,
  Fish,
  Layers,
  LifeBuoy,
  Loader2,
  Radio,
  Ship,
  Timer,
  Users,
  Wind,
  X,
} from "lucide-react";
import { useMarine } from "@/lib/marine-context";
import { Button } from "@/components/ui/button";
import { DataBadge } from "@/components/fisherman/data-badge";
import { OceanMap } from "@/components/map/ocean-map";
import { fetchOceanAlerts, fetchPfzZones } from "@/lib/fisherman-api";
import { fetchTrackedFleet, predictSearchZone } from "@/lib/operations-api";
import {
  closeSearchCase,
  focusSearchCase,
  useFocusedCaseId,
  useSearchCases,
} from "@/lib/sar-store";
import { formatCoord } from "@/lib/geo";

const STATUS_TONE = {
  underway: { label: "Underway", chip: "bg-emerald-50 text-emerald-700", pin: "normal" },
  fishing: { label: "On the grounds", chip: "bg-sky-50 text-sky-700", pin: "normal" },
  returning: { label: "Returning", chip: "bg-zinc-100 text-zinc-700", pin: "normal" },
  overdue: { label: "Overdue", chip: "bg-amber-50 text-amber-800", pin: "watch" },
  sos: { label: "Distress", chip: "bg-rose-100 text-rose-800", pin: "alert" },
};

/** Map a vessel description onto the leeway classes the drift model knows. */
function targetTypeFor(vesselType) {
  const text = vesselType.toLowerCase();
  if (text.includes("trawler")) return "trawler";
  if (text.includes("raft") || text.includes("catamaran")) return "raft";
  return "craft";
}

/** "3 h" reads better than "3.0 h"; half hours still need the decimal. */
function formatHours(hours) {
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} h`;
}

export function OperationsMap() {
  const { location } = useMarine();
  const cases = useSearchCases();
  const focusedId = useFocusedCaseId();

  const [fleet, setFleet] = React.useState([]);
  const [fleetSource, setFleetSource] = React.useState("demo");
  const [fleetReason, setFleetReason] = React.useState();
  const [fleetLoaded, setFleetLoaded] = React.useState(false);
  const [zones, setZones] = React.useState([]);
  const [alerts, setAlerts] = React.useState([]);

  const [layers, setLayers] = React.useState({
    fleet: true,
    hazards: true,
    zones: true,
    search: true,
  });
  const [overlay, setOverlay] = React.useState(null);
  const [selectedFleetId, setSelectedFleetId] = React.useState(null);
  const [selectedCaseId, setSelectedCaseId] = React.useState(null);
  const [sheetOpen, setSheetOpen] = React.useState(true);

  /* Drift projection: how many hours adrift the operator is asking about, the
     result that came back for it, and — when they start one from a boat that
     has no case yet — the boat it is running on. */
  const [boatProjection, setBoatProjection] = React.useState(null);
  const [driftHours, setDriftHours] = React.useState(null);
  const [drift, setDrift] = React.useState(null);

  /* Load everything the console plots */
  React.useEffect(() => {
    const controller = new AbortController();
    const here = { lat: location.lat, lon: location.lon };

    fetchTrackedFleet(here, controller.signal).then((response) => {
      if (controller.signal.aborted) return;
      setFleet(response.data);
      setFleetSource(response.source);
      setFleetReason(response.reason);
      setFleetLoaded(true);
    });
    fetchPfzZones(here.lat, here.lon, controller.signal).then((response) => {
      if (!controller.signal.aborted) setZones(response.data);
    });
    fetchOceanAlerts(here.lat, here.lon, controller.signal).then((response) => {
      if (!controller.signal.aborted) setAlerts(response.data);
    });

    return () => controller.abort();
  }, [location.lat, location.lon]);

  /* Arriving from the SAR console with a case to look at */
  const [handledFocus, setHandledFocus] = React.useState(null);
  if (focusedId && focusedId !== handledFocus) {
    setHandledFocus(focusedId);
    setSelectedCaseId(focusedId);
    setSelectedFleetId(null);
    setSheetOpen(true);
    focusSearchCase(null);
  }

  const activeCases = React.useMemo(
    () => cases.filter((item) => item.status === "active"),
    [cases]
  );
  const selectedCase = cases.find((item) => item.id === selectedCaseId) || null;
  const selectedUnit = fleet.find((item) => item.id === selectedFleetId) || null;

  /* A projection started from a boat only lives as long as that boat is the
     one on screen. */
  if (boatProjection && boatProjection.id !== selectedFleetId) {
    setBoatProjection(null);
  }

  /**
   * What the drift slider is running on. A saved search case brings its own
   * datum and elapsed time; a boat the operator picked starts from its last
   * ping with nothing computed yet. Both feed the same control.
   */
  const subject = React.useMemo(() => {
    if (selectedCase) {
      const known = ["piw", "craft", "trawler", "raft"];
      const targetType = known.includes(selectedCase.targetType)
        ? selectedCase.targetType
        : "craft";
      return {
        key: `case:${selectedCase.id}`,
        zoneId: selectedCase.id,
        title: selectedCase.targetName,
        incidentId: selectedCase.incidentId,
        targetType,
        lat: selectedCase.lastKnownLat,
        lon: selectedCase.lastKnownLon,
        baseHours: selectedCase.elapsedHours,
        basePrediction: selectedCase.prediction,
        baseSource: selectedCase.source,
      };
    }
    if (boatProjection) {
      return {
        key: `boat:${boatProjection.id}`,
        zoneId: `proj-${boatProjection.id}`,
        title: boatProjection.name,
        incidentId: `PROJ-${boatProjection.id}`,
        targetType: boatProjection.targetType,
        lat: boatProjection.lat,
        lon: boatProjection.lon,
        baseHours: 3,
        basePrediction: null,
        baseSource: "demo",
      };
    }
    return null;
  }, [selectedCase, boatProjection]);

  /* Switching subject puts the slider back on that subject's own elapsed time
     rather than carrying the last one across. */
  const [tunedKey, setTunedKey] = React.useState(null);
  if (subject && subject.key !== tunedKey) {
    setTunedKey(subject.key);
    setDriftHours(null);
  }

  const projectionHours = driftHours ?? subject?.baseHours ?? 0;

  /* The numbers on screen: the freshly computed drift when it matches the
     slider, otherwise the case's own saved datum, otherwise nothing yet. */
  const projection = React.useMemo(() => {
    if (!subject) return null;
    if (drift && drift.key === subject.key && drift.hours === projectionHours) {
      return { prediction: drift.prediction, source: drift.source };
    }
    if (subject.basePrediction && projectionHours === subject.baseHours) {
      return { prediction: subject.basePrediction, source: subject.baseSource };
    }
    return null;
  }, [subject, drift, projectionHours]);

  const needsProjection = Boolean(subject) && projection === null;

  React.useEffect(() => {
    if (!subject || !needsProjection) return;
    const controller = new AbortController();
    /* Nothing is written synchronously here — dragging the slider stays
       smooth and the panel keeps the last numbers until the new ones land. */
    const timer = setTimeout(() => {
      predictSearchZone(
        {
          incidentId: subject.incidentId,
          targetName: subject.title,
          targetType: subject.targetType,
          lastKnownLat: subject.lat,
          lastKnownLon: subject.lon,
          elapsedHours: projectionHours,
        },
        controller.signal
      )
        .then((response) => {
          if (controller.signal.aborted) return;
          setDrift({
            key: subject.key,
            hours: projectionHours,
            prediction: response.data,
            source: response.source,
          });
        })
        .catch(() => {
          /* predictSearchZone already falls back; an abort is the only path
             here and needs no handling. */
        });
    }, 180);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [subject, needsProjection, projectionHours]);

  /* ---- map inputs ---- */

  const mapFleet = React.useMemo(
    () =>
      layers.fleet
        ? fleet.map((unit) => ({
            id: unit.id,
            label: `${unit.boatName} · ${STATUS_TONE[unit.status].label}`,
            lat: unit.lat,
            lon: unit.lon,
            headingDeg: unit.headingDeg,
            tone: STATUS_TONE[unit.status].pin,
          }))
        : [],
    [fleet, layers.fleet]
  );

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

  const mapHazards = React.useMemo(
    () =>
      layers.hazards
        ? alerts
            .filter((alert) => alert.lat != null && alert.lon != null)
            .map((alert) => ({
              id: alert.id,
              title: `${alert.type}: ${alert.title}`,
              lat: alert.lat,
              lon: alert.lon,
              radiusNM: alert.radiusNM || 40,
              severity: alert.severity,
            }))
        : [],
    [alerts, layers.hazards]
  );

  /* The subject of the projection is drawn from the slider, not from what was
     saved, so the circle on the chart always matches the hours on screen. */
  const projectedZoneId = projection ? subject?.zoneId : undefined;

  const mapSearchZones = React.useMemo(() => {
    if (!layers.search) return [];
    const out = activeCases
      .filter((item) => item.id !== projectedZoneId)
      .map((item) => ({
        id: item.id,
        label: `${item.incidentId}: ${item.targetName}`,
        lat: item.prediction.datumLat,
        lon: item.prediction.datumLon,
        radiusNM: item.prediction.searchRadiusNM,
      }));

    if (subject && projection) {
      out.push({
        id: subject.zoneId,
        label: `${subject.title} · ${formatHours(projectionHours)} adrift`,
        lat: projection.prediction.datumLat,
        lon: projection.prediction.datumLon,
        radiusNM: projection.prediction.searchRadiusNM,
      });
    }
    return out;
  }, [activeCases, layers.search, projectedZoneId, subject, projection, projectionHours]);

  const mapPaths = React.useMemo(() => {
    const out = [];
    if (layers.search) {
      activeCases.forEach((item) => {
        if (item.id === projectedZoneId) return;
        out.push({
          id: `drift-${item.id}`,
          points: item.prediction.driftPath,
          kind: "drift",
        });
      });
      if (subject && projection) {
        out.push({
          id: `drift-${subject.zoneId}`,
          points: projection.prediction.driftPath,
          kind: "drift",
        });
      }
    }
    if (layers.fleet && selectedUnit) {
      out.push({
        id: `track-${selectedUnit.id}`,
        points: selectedUnit.track,
        kind: "track",
      });
    }
    return out;
  }, [
    activeCases,
    layers.search,
    layers.fleet,
    selectedUnit,
    projectedZoneId,
    subject,
    projection,
  ]);

  const center = React.useMemo(() => {
    if (selectedCase) {
      return {
        lat: selectedCase.prediction.datumLat,
        lon: selectedCase.prediction.datumLon,
      };
    }
    if (selectedUnit) return { lat: selectedUnit.lat, lon: selectedUnit.lon };
    return { lat: location.lat, lon: location.lon };
  }, [selectedCase, selectedUnit, location.lat, location.lon]);

  const distressCount = fleet.filter((unit) => unit.status === "sos").length;
  const watchCount = fleet.filter((unit) => unit.status === "overdue").length;

  /* ---- panel ---- */

  const layerToggles = [
    { key: "search", label: "Search areas", icon: LifeBuoy, count: activeCases.length },
    { key: "fleet", label: "Fishermen", icon: Ship, count: fleet.length },
    {
      key: "hazards",
      label: "Cyclones & hazards",
      icon: AlertTriangle,
      count: mapHazards.length,
    },
    { key: "zones", label: "Fishing zones", icon: Fish, count: zones.length },
  ];

  /**
   * The drift control. One slider for how long the target has been adrift,
   * and the working underneath it: what each component contributes, what they
   * add up to, and the circle that comes out. Rendered twice — floating on
   * the chart on a desktop, inside the panel on a phone — so the operator
   * always has it next to the picture it is driving.
   */
  const renderDrift = (floating) => {
    if (!subject) return null;
    const p = projection?.prediction;
    const hours = projectionHours;

    return (
      <div
        className={
          floating
            ? "w-[264px] rounded-xl border border-zinc-200 bg-white/95 p-3 shadow-lg backdrop-blur"
            : "rounded-xl border border-zinc-200 bg-zinc-50/80 p-3"
        }
      >
        <div className="flex items-center justify-between gap-2">
          <h4 className="flex min-w-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            <Timer className="h-3 w-3 shrink-0" />
            <span className="truncate">Drift projection</span>
          </h4>
          <span className="shrink-0 rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-white">
            {formatHours(hours)}
          </span>
        </div>

        {floating && (
          <p className="mt-1 truncate text-[11px] font-semibold text-zinc-900">
            {subject.title}
          </p>
        )}

        <input
          type="range"
          min={0.5}
          max={24}
          step={0.5}
          value={hours}
          onChange={(event) => setDriftHours(Number(event.target.value))}
          aria-label="Hours adrift"
          className="mt-2.5 w-full accent-rose-600"
        />
        <div className="flex justify-between font-sans text-[9px] text-zinc-400">
          <span>30 min</span>
          <span>12 h</span>
          <span>24 h</span>
        </div>

        {!p ? (
          <div className="mt-2 flex items-center gap-2 text-[11px] text-zinc-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Recomputing drift…</span>
          </div>
        ) : (
          <>
            <dl className="mt-2.5 space-y-1 border-t border-zinc-200 pt-2.5 text-[10px] tabular-nums">
              {[
                {
                  label: "Surface current",
                  working: `${p.currentKnots} kt × ${formatHours(hours)}`,
                  value: `${(p.currentKnots * hours).toFixed(1)} NM`,
                },
                {
                  label: "Wind leeway",
                  working: `${p.windLeewayKnots} kt × ${formatHours(hours)}`,
                  value: `${(p.windLeewayKnots * hours).toFixed(1)} NM`,
                },
                {
                  label: "Tidal stream",
                  working: `${p.tideKnots} kt, reversing`,
                  value: "≈0 NM net",
                },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-baseline justify-between gap-2"
                >
                  <dt className="min-w-0 truncate text-zinc-500">
                    {row.label}
                    <span className="ml-1 font-sans text-[9px] text-zinc-400">
                      {row.working}
                    </span>
                  </dt>
                  <dd className="shrink-0 font-medium text-zinc-900">{row.value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-2 rounded-lg bg-zinc-900 px-2.5 py-2 text-white">
              <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wide text-zinc-400">
                <Wind className="h-3 w-3" />
                <span>Net set &amp; drift</span>
              </div>
              <p className="mt-0.5 text-[13px] font-bold tabular-nums leading-tight">
                {p.driftDistanceNM} NM towards {p.driftBearingText}
              </p>
              <p className="font-sans text-[9px] text-zinc-400">
                {(p.currentKnots + p.windLeewayKnots).toFixed(2)} kt set ·{" "}
                {p.driftBearingDeg}° · datum {formatCoord(p.datumLat, p.datumLon)}
              </p>
            </div>

            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5">
                <div className="font-sans text-[9px] uppercase tracking-wide text-rose-700/70">
                  Search radius
                </div>
                <div className="text-[12px] font-bold tabular-nums text-rose-900">
                  {p.searchRadiusNM} NM
                </div>
              </div>
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5">
                <div className="font-sans text-[9px] uppercase tracking-wide text-rose-700/70">
                  Area to cover
                </div>
                <div className="text-[12px] font-bold tabular-nums text-rose-900">
                  {p.searchAreaSqNM} sq NM
                </div>
              </div>
            </div>

            <p className="mt-1.5 font-sans text-[10px] leading-snug text-zinc-500">
              {p.recommendedPattern}
            </p>

            <div className="mt-2 flex items-center justify-between gap-2">
              <DataBadge
                source={projection?.source || "demo"}
                reason={
                  projection?.source === "demo"
                    ? "On-device set-and-drift estimate, not the SARAT model"
                    : undefined
                }
              />
              {driftHours != null && driftHours !== subject.baseHours && (
                <button
                  type="button"
                  onClick={() => setDriftHours(null)}
                  className="rounded px-1.5 py-0.5 font-sans text-[10px] text-zinc-500 underline underline-offset-2 hover:text-zinc-900"
                >
                  reset to {formatHours(subject.baseHours)}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  const panel = (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Layers */}
      <div className="border-b border-zinc-100 p-3">
        <h2 className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
          <Layers className="h-3 w-3" />
          <span>Layers</span>
        </h2>
        <div className="grid grid-cols-2 gap-1.5">
          {layerToggles.map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              type="button"
              onClick={() =>
                setLayers((current) => ({ ...current, [key]: !current[key] }))
              }
              aria-pressed={layers[key]}
              className={`flex items-center justify-between gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-colors ${
                layers[key]
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 bg-white text-zinc-600"
              }`}
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <Icon className="h-3 w-3 shrink-0" />
                <span className="truncate">{label}</span>
              </span>
              <span className={layers[key] ? "text-zinc-300" : "text-zinc-400"}>
                {count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Selected search case */}
      {selectedCase && (
        <div className="border-b border-zinc-100 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-800">
                <LifeBuoy className="h-3 w-3" />
                {selectedCase.incidentId}
              </span>
              <h3 className="mt-1.5 text-sm font-bold leading-snug text-zinc-950">
                {selectedCase.targetName}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setSelectedCaseId(null)}
              aria-label="Close case"
              className="rounded p-1 text-zinc-400 hover:bg-zinc-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <DataBadge
              source={selectedCase.source}
              reason={
                selectedCase.source === "demo"
                  ? "Datum from the on-device estimate, not the drift model"
                  : undefined
              }
            />
            <span className="text-[10px] text-zinc-500">
              adrift {selectedCase.elapsedHours} h
            </span>
          </div>

          {selectedCase.source === "demo" && (
            <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[10px] leading-relaxed text-amber-900">
              This datum is an on-device estimate. Do not task units on it alone — confirm
              against INCOIS SARAT before committing a search.
            </p>
          )}

          <dl className="mt-3 space-y-2 text-[11px]">
            {[
              [
                "Last known",
                formatCoord(selectedCase.lastKnownLat, selectedCase.lastKnownLon),
              ],
              ["Reported adrift", formatHours(selectedCase.elapsedHours)],
              ["Target", selectedCase.targetType],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <dt className="shrink-0 text-zinc-500">{label}</dt>
                <dd className="text-right font-medium text-zinc-900">{value}</dd>
              </div>
            ))}
          </dl>

          {/* On a phone the chart has no room for a floating card, so the
              same control lives here instead. */}
          <div className="mt-3 lg:hidden">{renderDrift(false)}</div>

          <div className="mt-3 flex gap-2">
            <Link href="/app/lost-fisherman" className="flex-1">
              <Button
                size="sm"
                className="h-9 w-full bg-zinc-950 text-[11px] text-white hover:bg-zinc-800"
              >
                Open SAR console
              </Button>
            </Link>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                closeSearchCase(selectedCase.id);
                setSelectedCaseId(null);
              }}
              className="h-9 border-zinc-200 text-[11px]"
            >
              Stand down
            </Button>
          </div>
        </div>
      )}

      {/* Selected fisherman */}
      {selectedUnit && !selectedCase && (
        <div className="border-b border-zinc-100 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-bold leading-snug text-zinc-950">
                {selectedUnit.boatName}
              </h3>
              <p className="mt-0.5 font-sans text-[11px] text-zinc-500">
                {selectedUnit.regNumber} · {selectedUnit.vesselType}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedFleetId(null)}
              aria-label="Close vessel"
              className="rounded p-1 text-zinc-400 hover:bg-zinc-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <span
            className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              STATUS_TONE[selectedUnit.status].chip
            }`}
          >
            {STATUS_TONE[selectedUnit.status].label}
          </span>

          <div className="mt-3 space-y-2 text-[11px]">
            {[
              ["Skipper", selectedUnit.skipper],
              ["Crew aboard", `${selectedUnit.crewCount} people`],
              ["Home port", selectedUnit.homePort],
              ["MMSI", selectedUnit.mmsi],
              ["Position", formatCoord(selectedUnit.lat, selectedUnit.lon)],
              [
                "Course & speed",
                `${selectedUnit.speedKnots} kts, ${selectedUnit.headingText} (${selectedUnit.headingDeg}°)`,
              ],
              ["From port", `${selectedUnit.distanceFromPortNM} NM`],
              ["Last ping", selectedUnit.lastPingAt],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <span className="shrink-0 text-zinc-500">{label}</span>
                <span className="text-right font-medium text-zinc-900">{value}</span>
              </div>
            ))}
          </div>

          {selectedUnit.destinationZoneName && (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/70 p-2.5">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                <Compass className="h-3 w-3" />
                <span>Working toward</span>
              </div>
              <p className="mt-1 text-[11px] font-semibold text-emerald-950">
                {selectedUnit.destinationZoneName}
              </p>
              {selectedUnit.distanceToZoneNM != null && (
                <p className="font-sans text-[10px] text-emerald-800/80">
                  {selectedUnit.distanceToZoneNM} NM to run
                </p>
              )}
            </div>
          )}

          {/* Project a drift straight from this boat's last ping — the
              operator does not need a formal case open to see where the
              current would take it. */}
          {boatProjection?.id === selectedUnit.id ? (
            <>
              <div className="mt-3 lg:hidden">{renderDrift(false)}</div>
              <div className="mt-3 hidden rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-2.5 py-2 text-[10px] leading-snug text-zinc-500 lg:block">
                Projection is running on the chart — drag the slider on the map card to
                change how long this boat has been adrift.
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setBoatProjection(null)}
                className="mt-2 h-9 w-full border-zinc-200 text-[11px]"
              >
                Clear projection
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setBoatProjection({
                  id: selectedUnit.id,
                  name: selectedUnit.boatName,
                  lat: selectedUnit.lat,
                  lon: selectedUnit.lon,
                  targetType: targetTypeFor(selectedUnit.vesselType),
                })
              }
              className="mt-3 h-9 w-full gap-1.5 border-zinc-200 text-[11px]"
            >
              <Timer className="h-3.5 w-3.5" />
              <span>Project drift from last ping</span>
            </Button>
          )}

          <Link href="/app/lost-fisherman" className="mt-2 block">
            <Button
              size="sm"
              variant="outline"
              className="h-9 w-full gap-1.5 border-rose-200 bg-rose-50 text-[11px] text-rose-700 hover:bg-rose-100"
            >
              <LifeBuoy className="h-3.5 w-3.5" />
              <span>Start a search for this boat</span>
            </Button>
          </Link>
        </div>
      )}

      {/* Lists */}
      {!selectedCase && !selectedUnit && (
        <div className="flex-1 space-y-4 p-4">
          {activeCases.length > 0 && (
            <section className="space-y-2">
              <h3 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700">
                <LifeBuoy className="h-3 w-3" />
                <span>Open searches ({activeCases.length})</span>
              </h3>
              {activeCases.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedCaseId(item.id)}
                  className="w-full rounded-lg border border-rose-200 bg-rose-50/60 p-2.5 text-left"
                >
                  <div className="truncate text-[11px] font-semibold text-rose-950">
                    {item.targetName}
                  </div>
                  <div className="mt-0.5 font-sans text-[10px] text-rose-800/80">
                    {item.incidentId} · datum{" "}
                    {formatCoord(item.prediction.datumLat, item.prediction.datumLon)} ·{" "}
                    {item.prediction.searchRadiusNM} NM
                  </div>
                </button>
              ))}
            </section>
          )}

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                <Users className="h-3 w-3" />
                <span>Fishermen at sea ({fleet.length})</span>
              </h3>
              <DataBadge source={fleetSource} reason={fleetReason} />
            </div>

            {!fleetLoaded && (
              <div className="flex items-center gap-2 py-4 text-xs text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading fleet…</span>
              </div>
            )}

            <ul className="divide-y divide-zinc-100 overflow-hidden rounded-lg border border-zinc-200">
              {fleet.map((unit) => (
                <li key={unit.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedFleetId(unit.id)}
                    className="flex w-full items-center justify-between gap-2 bg-white px-3 py-2.5 text-left active:bg-zinc-50"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-[11px] font-semibold text-zinc-950">
                        {unit.boatName}
                      </div>
                      <div className="mt-0.5 truncate font-sans text-[10px] text-zinc-500">
                        {unit.crewCount} crew ·{" "}
                        {unit.destinationZoneName
                          ? unit.destinationZoneName.split("(")[0].trim()
                          : "no zone declared"}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                        STATUS_TONE[unit.status].chip
                      }`}
                    >
                      {STATUS_TONE[unit.status].label}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-full">
      <div className="relative h-full flex-1">
        <OceanMap
          className="h-full w-full"
          center={center}
          zoom={selectedCase || selectedUnit ? 9 : 7}
          zones={mapZones}
          showZones={layers.zones}
          onToggleZones={(next) => setLayers((current) => ({ ...current, zones: next }))}
          hazards={mapHazards}
          fleet={mapFleet}
          selectedFleetId={selectedFleetId}
          onSelectFleetUnit={(id) => {
            setSelectedFleetId(id);
            setSelectedCaseId(null);
            setSheetOpen(true);
          }}
          searchZones={mapSearchZones}
          selectedSearchZoneId={subject ? subject.zoneId : selectedCaseId}
          onSelectSearchZone={(id) => {
            setSelectedCaseId(id);
            setSelectedFleetId(null);
            setSheetOpen(true);
          }}
          paths={mapPaths}
          overlay={overlay}
          onOverlayChange={setOverlay}
          port={{ lat: location.lat, lon: location.lon, name: location.name }}
          showBoundary
        >
          {subject && (
            <div className="pointer-events-auto absolute right-3 top-3 z-10 hidden max-h-[calc(100%-1.5rem)] overflow-y-auto lg:block">
              {renderDrift(true)}
            </div>
          )}

          {(distressCount > 0 || watchCount > 0) && (
            <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex flex-col gap-1">
              {distressCount > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow">
                  <Radio className="h-3 w-3" />
                  {distressCount} in distress
                </span>
              )}
              {watchCount > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-2.5 py-1 text-[11px] font-semibold text-white shadow">
                  <AlertTriangle className="h-3 w-3" />
                  {watchCount} overdue
                </span>
              )}
            </div>
          )}
        </OceanMap>

        {/* Mobile bottom sheet */}
        <div
          className={`absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-2xl border-t border-zinc-200 bg-white shadow-[0_-8px_24px_rgba(0,0,0,0.10)] transition-[height] duration-200 lg:hidden ${
            sheetOpen ? "h-[72%]" : "h-14"
          }`}
        >
          <button
            type="button"
            onClick={() => setSheetOpen((open) => !open)}
            aria-expanded={sheetOpen}
            className="flex h-14 shrink-0 items-center justify-between px-4 text-left"
          >
            <span className="truncate text-xs font-semibold text-zinc-950">
              {selectedCase
                ? selectedCase.targetName
                : selectedUnit
                  ? selectedUnit.boatName
                  : `${fleet.length} at sea · ${activeCases.length} open ${
                      activeCases.length === 1 ? "search" : "searches"
                    }`}
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

      <aside className="hidden h-full w-[360px] shrink-0 border-l border-zinc-200 bg-white lg:block xl:w-[400px]">
        {panel}
      </aside>
    </div>
  );
}
