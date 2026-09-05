"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMarine } from "@/lib/marine-context";
import { DataBadge } from "@/components/fisherman/data-badge";
import { predictSearchZone, type DataSource } from "@/lib/operations-api";
import { focusSearchCase, saveSearchCase } from "@/lib/sar-store";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LifeBuoy,
  Compass,
  Wind,
  Droplets,
  Waves,
  Navigation,
  Radio,
  Clock,
  MapPin,
  Sparkles,
  AlertTriangle,
  Download,
  Share2,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";

type TargetType = "piw" | "craft" | "trawler" | "raft";

export default function LostFishermanPage() {
  const { location, setIsAiDrawerOpen } = useMarine();
  const router = useRouter();

  // SAR Operator inputs
  const [incidentId, setIncidentId] = React.useState("SAR-2026-0903-AP");
  const [targetName, setTargetName] = React.useState("Sri Krishna-I (2 crew members)");
  const [targetType, setTargetType] = React.useState<TargetType>("craft");
  const [lkpLat, setLkpLat] = React.useState(17.58);
  const [lkpLon, setLkpLon] = React.useState(83.38);
  const [elapsedHours, setElapsedHours] = React.useState(3.5);
  const [isCalculating, setIsCalculating] = React.useState(false);
  const [predictionSource, setPredictionSource] = React.useState<DataSource>("demo");
  const [predictionReason, setPredictionReason] = React.useState<string | undefined>();
  const [caseId, setCaseId] = React.useState<string | null>(null);

  // Model-computed datum calculation
  const [datumResult, setDatumResult] = React.useState({
    datumLat: 17.642,
    datumLon: 83.475,
    netDriftDistanceNM: 6.4,
    netDriftBearing: "058° ENE",
    searchRadiusNM: 3.8,
    primarySearchAreaSqNM: 45.4,
    windLeewaySpeed: "1.1 kts",
    currentSpeed: "0.7 kts",
    tideInfluence: "0.2 kts",
    recommendedPattern: "Sector Search (VS - 90° Turn)",
  });

  const handleComputeDrift = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCalculating(true);

    const response = await predictSearchZone({
      incidentId,
      targetName,
      targetType,
      lastKnownLat: lkpLat,
      lastKnownLon: lkpLon,
      elapsedHours,
    });
    const prediction = response.data;

    setDatumResult({
      datumLat: prediction.datumLat,
      datumLon: prediction.datumLon,
      netDriftDistanceNM: prediction.driftDistanceNM,
      netDriftBearing: `${prediction.driftBearingDeg}° ${prediction.driftBearingText}`,
      searchRadiusNM: prediction.searchRadiusNM,
      primarySearchAreaSqNM: prediction.searchAreaSqNM,
      windLeewaySpeed: `${prediction.windLeewayKnots} kts`,
      currentSpeed: `${prediction.currentKnots} kts`,
      tideInfluence: `${prediction.tideKnots} kts`,
      recommendedPattern: prediction.recommendedPattern,
    });
    setPredictionSource(response.source);
    setPredictionReason(response.reason);

    // Keep the case so the marine map can draw the same drift track and
    // search circle rather than recomputing its own.
    const saved = saveSearchCase({
      incidentId,
      targetName,
      targetType,
      lastKnownLat: lkpLat,
      lastKnownLon: lkpLon,
      elapsedHours,
      prediction,
      source: response.source,
    });
    setCaseId(saved.id);
    setIsCalculating(false);
  };

  const handleShowOnMap = () => {
    if (caseId) focusSearchCase(caseId);
    router.push("/app/map");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-zinc-200 pb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <h1 className="flex items-start gap-2 text-base font-bold leading-snug tracking-tight text-zinc-950 sm:items-center sm:gap-2.5 sm:text-2xl lg:text-3xl">
          <LifeBuoy className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 sm:mt-0 sm:h-7 sm:w-7" />
          <span className="text-balance">Lost Fisherman &amp; Vessel Search Area</span>
        </h1>

        <Button
          size="sm"
          onClick={() => setIsAiDrawerOpen(true)}
          className="h-9 w-full shrink-0 gap-1.5 bg-zinc-950 text-xs text-white hover:bg-zinc-800 sm:h-8 sm:w-auto"
        >
          <Sparkles className="h-3.5 w-3.5 text-zinc-300" />
          <span>SAR Assistant</span>
        </Button>
      </div>

      {/* Primary Emergency Banner */}
      <div className="flex flex-col justify-between gap-3 rounded-xl border border-rose-300 bg-rose-50/50 p-3 font-sans text-xs shadow-xs sm:flex-row sm:items-center sm:gap-4 sm:p-4">
        <div className="flex items-start gap-2.5 sm:items-center sm:gap-3">
          <div className="shrink-0 rounded-lg bg-rose-100 p-1.5 text-rose-800 sm:p-2">
            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            {/* The badge sits on its own line when the incident id is long
                rather than being squeezed out of its pill. */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-[13px] font-bold text-zinc-950 sm:text-sm">
                Active Search Incident: {incidentId}
              </span>
              <Badge className="shrink-0 whitespace-nowrap bg-rose-600 px-1.5 py-0 text-[10px] text-white">
                Drift in progress · {elapsedHours} h
              </Badge>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-600 sm:text-xs">
              Target: <strong>{targetName}</strong>.
              <br className="sm:hidden" />
              <span className="sm:before:content-['_']">
                Last known {lkpLat}°N, {lkpLon}°E off {location.name}.
              </span>
            </p>
          </div>
        </div>

        <Button
          size="sm"
          className="h-9 w-full shrink-0 gap-1.5 bg-rose-700 text-xs text-white hover:bg-rose-800 sm:h-8 sm:w-auto"
          onClick={() =>
            alert(
              "Coast Guard MRCC Chennai & Visakhapatnam Port Signal Station dispatched with SAR coordinates."
            )
          }
        >
          <Radio className="h-3.5 w-3.5" />
          <span>Dispatch MRCC Packet</span>
        </Button>
      </div>

      {/* Grid: Operator Inputs (Left) + Drift Trajectory Results (Right) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        {/* Left 1 Col: Operator Input Form */}
        <div className="space-y-4">
          <Card className="border-zinc-200">
            <CardHeader className="pb-3 border-b border-zinc-100">
              <CardTitle className="text-sm font-bold text-zinc-950">
                Incident & Drift Input
              </CardTitle>
              <p className="text-xs text-zinc-500">
                Provide last known coordinates and elapsed timeline
              </p>
            </CardHeader>

            <CardContent className="pt-4">
              <form onSubmit={handleComputeDrift} className="space-y-3.5 text-xs font-sans">
                <div>
                  <label className="block text-zinc-600 font-medium mb-1 font-sans text-[11px]">
                    Incident Identifier
                  </label>
                  <Input
                    value={incidentId}
                    onChange={(e) => setIncidentId(e.target.value)}
                    className="h-8 text-xs font-sans"
                  />
                </div>

                <div>
                  <label className="block text-zinc-600 font-medium mb-1 font-sans text-[11px]">
                    Missing Target / Vessel Description
                  </label>
                  <Input
                    value={targetName}
                    onChange={(e) => setTargetName(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-zinc-600 font-medium mb-1 font-sans text-[11px]">
                    Target Object Type (Leeway Class)
                  </label>
                  <select
                    value={targetType}
                    onChange={(e) => setTargetType(e.target.value as TargetType)}
                    className="h-8 w-full rounded-md border border-zinc-200 bg-white px-2.5 text-xs text-zinc-800"
                  >
                    <option value="piw">Person in Water (PIW with Life Jacket)</option>
                    <option value="craft">Small Unpowered Wooden Craft (18-24ft)</option>
                    <option value="trawler">Disabled Motorized FRP / Trawler (32ft)</option>
                    <option value="raft">Inflatable Marine Life Raft (High Leeway)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-600 font-medium mb-1 font-sans text-[11px]">
                      LKP Latitude (°N)
                    </label>
                    <Input
                      type="number"
                      step="0.001"
                      value={lkpLat}
                      onChange={(e) => setLkpLat(parseFloat(e.target.value) || 0)}
                      className="h-8 text-xs font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-600 font-medium mb-1 font-sans text-[11px]">
                      LKP Longitude (°E)
                    </label>
                    <Input
                      type="number"
                      step="0.001"
                      value={lkpLon}
                      onChange={(e) => setLkpLon(parseFloat(e.target.value) || 0)}
                      className="h-8 text-xs font-sans"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1 font-sans text-[11px]">
                    <label className="text-zinc-600 font-medium">Elapsed Drift Time</label>
                    <span className="font-bold text-zinc-950">{elapsedHours} Hours</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="24"
                    step="0.5"
                    value={elapsedHours}
                    onChange={(e) => setElapsedHours(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-zinc-200 rounded-lg cursor-pointer"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isCalculating}
                  className="w-full text-xs h-9 bg-zinc-950 hover:bg-zinc-800 text-white gap-1.5 mt-2"
                >
                  <Navigation className="h-3.5 w-3.5" />
                  <span>{isCalculating ? "Simulating Kinematics..." : "Compute Probable Drift"}</span>
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right 2 Cols: Search Datum, Drift Vector Decomposition & Search Plan */}
        <div className="space-y-4 lg:col-span-2 lg:space-y-6">
          {/* Output Datum Card */}
          <Card className="border-zinc-200 bg-white shadow-xs">
            <CardHeader className="flex flex-col items-start gap-2 border-b border-zinc-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-sm font-bold text-zinc-950 sm:text-base">
                Predicted Search Datum &amp; Probability Area
              </CardTitle>

              <DataBadge
                source={predictionSource}
                reason={
                  predictionSource === "demo"
                    ? predictionReason || "On-device estimate, not the drift model"
                    : undefined
                }
              />
            </CardHeader>

            <CardContent className="space-y-5 pt-4 font-sans text-xs sm:space-y-6">
              {/* Highlight Datum Coordinates Box */}
              <div className="flex flex-col justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50/70 p-3 font-sans text-zinc-950 sm:flex-row sm:items-center sm:gap-4 sm:p-4">
                <div className="min-w-0">
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-sky-700">
                    Optimal search datum (most probable point)
                  </span>
                  <div className="mt-1 text-lg font-bold tabular-nums tracking-tight text-zinc-950 sm:text-2xl">
                    {datumResult.datumLat}°N, {datumResult.datumLon}°E
                  </div>
                  <span className="mt-1 block text-[11px] leading-relaxed text-zinc-600 sm:text-xs">
                    Net displacement <strong>{datumResult.netDriftDistanceNM} NM</strong> along{" "}
                    <strong>{datumResult.netDriftBearing}</strong>
                  </span>
                </div>

                {/* On a phone this reads as a row under the datum rather than
                    a right-aligned column squeezed against it. */}
                <div className="flex shrink-0 items-baseline gap-2 border-t border-sky-200 pt-2 sm:block sm:space-y-1 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0 sm:text-right">
                  <span className="text-[10px] text-zinc-500 sm:block">Primary search radius</span>
                  <span className="text-lg font-bold tabular-nums text-sky-700 sm:text-xl">
                    {datumResult.searchRadiusNM} NM
                  </span>
                  <span className="text-[11px] text-zinc-500 sm:block">
                    · {datumResult.primarySearchAreaSqNM} sq NM
                  </span>
                </div>
              </div>

              {/* Physical Drift Decomposition Breakdown */}
              <div className="space-y-2">
                <span className="font-sans text-[10px] uppercase tracking-wider text-zinc-400 font-semibold block">
                  Kinematic Vector Influence:
                </span>

                <div className="grid grid-cols-1 gap-2 font-sans text-xs sm:grid-cols-3 sm:gap-3">
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2.5 sm:p-3">
                    <div className="flex items-center gap-1.5 text-zinc-500 mb-1 text-[10px] uppercase">
                      <Wind className="h-3.5 w-3.5 text-sky-500" />
                      <span>Wind Leeway Influence</span>
                    </div>
                    <div className="text-sm font-bold tabular-nums text-zinc-900 sm:text-base">{datumResult.windLeewaySpeed}</div>
                    <span className="text-[10px] text-zinc-500 block">Downwind Leeway: 245°</span>
                  </div>

                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2.5 sm:p-3">
                    <div className="flex items-center gap-1.5 text-zinc-500 mb-1 text-[10px] uppercase">
                      <Droplets className="h-3.5 w-3.5 text-blue-500" />
                      <span>Surface Current Drift</span>
                    </div>
                    <div className="text-sm font-bold tabular-nums text-zinc-900 sm:text-base">{datumResult.currentSpeed}</div>
                    <span className="text-[10px] text-zinc-500 block">Geostrophic Vector: 048°</span>
                  </div>

                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2.5 sm:p-3">
                    <div className="flex items-center gap-1.5 text-zinc-500 mb-1 text-[10px] uppercase">
                      <Waves className="h-3.5 w-3.5 text-indigo-500" />
                      <span>Tidal & Stokes Drift</span>
                    </div>
                    <div className="text-sm font-bold tabular-nums text-zinc-900 sm:text-base">{datumResult.tideInfluence}</div>
                    <span className="text-[10px] text-zinc-500 block">Ebb Tide Mass Transport</span>
                  </div>
                </div>
              </div>

              {/* Tactical Search Pattern Recommendations */}
              <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 text-xs sm:p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-sans font-semibold text-zinc-950">
                    Recommended tactical search pattern
                  </span>
                  <Badge variant="minimal" className="font-sans text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                    IAMSAR Level 1
                  </Badge>
                </div>
                <p className="text-zinc-700 font-sans text-xs">
                  {datumResult.recommendedPattern}
                </p>
                <p className="text-[11px] text-zinc-500 leading-relaxed font-sans">
                  Deploy surface search units along Datum axis. Visual sweep width estimated at 0.8 NM under current sea state ({location.waveHeight}m waves, {location.weather.visibility}km visibility).
                </p>
              </div>

              {/* Nearby Vessels (Good Samaritan Protocol) */}
              <div className="space-y-2 pt-2 border-t border-zinc-100">
                <span className="font-sans text-[10px] uppercase tracking-wider text-zinc-400 font-semibold block">
                  Nearby Craft in Vicinity (Good Samaritan Network):
                </span>
                <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-lg overflow-hidden font-sans text-[11px]">
                  <div className="flex flex-col gap-0.5 bg-white p-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                    <span className="font-semibold text-zinc-900">Matsya-Kuber IV (Mechanized)</span>
                    <span className="text-zinc-500">4.2 NM from datum • VHF Ch-16</span>
                  </div>
                  <div className="flex flex-col gap-0.5 bg-white p-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                    <span className="font-semibold text-zinc-900">ICGS Varuna (Patrol Craft)</span>
                    <span className="text-zinc-500">8.9 NM from datum • SOG 18.5 kts</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:flex-wrap">
                <Button
                  size="sm"
                  className="h-9 w-full gap-1.5 bg-zinc-950 text-xs text-white hover:bg-zinc-800 sm:h-8 sm:w-auto"
                  onClick={() =>
                    alert(`SAR Operations Briefing PDF compiled for Incident ${incidentId}`)
                  }
                >
                  <Download className="h-3.5 w-3.5 text-zinc-300" />
                  <span>Export IAMSAR tactical packet</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShowOnMap}
                  className="h-9 w-full gap-1.5 border-zinc-200 text-xs sm:h-8 sm:w-auto"
                >
                  <Compass className="h-3.5 w-3.5 text-zinc-600" />
                  <span>Show drift &amp; search area on map</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
