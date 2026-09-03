"use client";

import * as React from "react";
import Link from "next/link";
import { useMarine } from "@/lib/marine-context";
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

  // SAR Operator inputs
  const [incidentId, setIncidentId] = React.useState("SAR-2026-0903-AP");
  const [targetName, setTargetName] = React.useState("Sri Krishna-I (2 crew members)");
  const [targetType, setTargetType] = React.useState<TargetType>("craft");
  const [lkpLat, setLkpLat] = React.useState(17.58);
  const [lkpLon, setLkpLon] = React.useState(83.38);
  const [elapsedHours, setElapsedHours] = React.useState(3.5);
  const [isCalculating, setIsCalculating] = React.useState(false);

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

  const handleComputeDrift = (e: React.FormEvent) => {
    e.preventDefault();
    setIsCalculating(true);
    setTimeout(() => {
      setIsCalculating(false);
      const factor = targetType === "piw" ? 0.6 : targetType === "raft" ? 1.4 : 1.0;
      const driftNM = Number((elapsedHours * 1.6 * factor).toFixed(1));
      const latOffset = Number((driftNM * 0.012).toFixed(3));
      const lonOffset = Number((driftNM * 0.014).toFixed(3));

      setDatumResult({
        datumLat: Number((lkpLat + latOffset).toFixed(3)),
        datumLon: Number((lkpLon + lonOffset).toFixed(3)),
        netDriftDistanceNM: driftNM,
        netDriftBearing: "062° ENE",
        searchRadiusNM: Number((driftNM * 0.6).toFixed(1)),
        primarySearchAreaSqNM: Number((Math.PI * Math.pow(driftNM * 0.6, 2)).toFixed(1)),
        windLeewaySpeed: targetType === "raft" ? "1.6 kts" : "0.9 kts",
        currentSpeed: "0.65 kts",
        tideInfluence: "0.25 kts",
        recommendedPattern:
          driftNM > 8
            ? "Parallel Track Search (PS - 2 Nautical Mile Spacing)"
            : "Expanding Square Search (SS)",
      });
    }, 700);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950 flex items-center gap-2.5">
            <LifeBuoy className="h-7 w-7 text-rose-600" />
            <span>Lost Fisherman & Vessel Search Area</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setIsAiDrawerOpen(true)}
            className="text-xs h-8 bg-zinc-950 hover:bg-zinc-800 text-white gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5 text-zinc-300" />
            <span>SAR Assistant</span>
          </Button>
        </div>
      </div>

      {/* Primary Emergency Banner */}
      <div className="p-4 rounded-xl border border-rose-300 bg-rose-50/50 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-sans">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-rose-100 text-rose-800 shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-zinc-950">
                Active Search Incident: {incidentId}
              </span>
              <Badge className="bg-rose-600 text-white text-[10px] px-1.5 py-0">
                Drift In Progress ({elapsedHours} hrs)
              </Badge>
            </div>
            <p className="text-xs text-zinc-600 mt-0.5">
              Target: <strong>{targetName}</strong>. Last known position: {lkpLat}°N, {lkpLon}°E off {location.name}.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            className="text-xs h-8 bg-rose-700 hover:bg-rose-800 text-white gap-1.5"
            onClick={() => alert("Coast Guard MRCC Chennai & Visakhapatnam Port Signal Station dispatched with SAR coordinates.")}
          >
            <Radio className="h-3.5 w-3.5" />
            <span>Dispatch MRCC Packet</span>
          </Button>
        </div>
      </div>

      {/* Grid: Operator Inputs (Left) + Drift Trajectory Results (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
        <div className="lg:col-span-2 space-y-6">
          {/* Output Datum Card */}
          <Card className="border-zinc-200 bg-white shadow-xs">
            <CardHeader className="pb-3 border-b border-zinc-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-zinc-950">
                  Predicted Search Datum & Probability Area
                </CardTitle>
              </div>

              <Badge className="border-sky-200 bg-sky-50 text-sky-700 font-sans text-xs">
                Datum Solved
              </Badge>
            </CardHeader>

            <CardContent className="pt-4 space-y-6 text-xs font-sans">
              {/* Highlight Datum Coordinates Box */}
              <div className="p-4 rounded-xl border border-sky-200 bg-sky-50/70 text-zinc-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-sans">
                <div>
                  <span className="text-[10px] text-sky-700 uppercase tracking-wider block font-semibold">
                    Optimal Search Datum Center (Most Probable Point)
                  </span>
                  <div className="text-2xl font-bold tracking-tight text-zinc-950 mt-1">
                    {datumResult.datumLat}°N, {datumResult.datumLon}°E
                  </div>
                  <span className="text-xs text-zinc-600 block mt-1">
                    Net Displacement: <strong>{datumResult.netDriftDistanceNM} NM</strong> along bearing <strong>{datumResult.netDriftBearing}</strong>
                  </span>
                </div>

                <div className="text-right sm:border-l sm:border-sky-200 sm:pl-6 space-y-1">
                  <div>
                    <span className="text-zinc-500 text-[10px] block">Primary Search Radius</span>
                    <span className="text-xl font-bold text-sky-700">
                      {datumResult.searchRadiusNM} NM
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-500 block">
                    Area: {datumResult.primarySearchAreaSqNM} sq NM
                  </span>
                </div>
              </div>

              {/* Physical Drift Decomposition Breakdown */}
              <div className="space-y-2">
                <span className="font-sans text-[10px] uppercase tracking-wider text-zinc-400 font-semibold block">
                  Kinematic Vector Influence:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-sans text-xs">
                  <div className="p-3 rounded-lg border border-zinc-200 bg-zinc-50">
                    <div className="flex items-center gap-1.5 text-zinc-500 mb-1 text-[10px] uppercase">
                      <Wind className="h-3.5 w-3.5 text-sky-500" />
                      <span>Wind Leeway Influence</span>
                    </div>
                    <div className="text-base font-bold text-zinc-900">{datumResult.windLeewaySpeed}</div>
                    <span className="text-[10px] text-zinc-500 block">Downwind Leeway: 245°</span>
                  </div>

                  <div className="p-3 rounded-lg border border-zinc-200 bg-zinc-50">
                    <div className="flex items-center gap-1.5 text-zinc-500 mb-1 text-[10px] uppercase">
                      <Droplets className="h-3.5 w-3.5 text-blue-500" />
                      <span>Surface Current Drift</span>
                    </div>
                    <div className="text-base font-bold text-zinc-900">{datumResult.currentSpeed}</div>
                    <span className="text-[10px] text-zinc-500 block">Geostrophic Vector: 048°</span>
                  </div>

                  <div className="p-3 rounded-lg border border-zinc-200 bg-zinc-50">
                    <div className="flex items-center gap-1.5 text-zinc-500 mb-1 text-[10px] uppercase">
                      <Waves className="h-3.5 w-3.5 text-indigo-500" />
                      <span>Tidal & Stokes Drift</span>
                    </div>
                    <div className="text-base font-bold text-zinc-900">{datumResult.tideInfluence}</div>
                    <span className="text-[10px] text-zinc-500 block">Ebb Tide Mass Transport</span>
                  </div>
                </div>
              </div>

              {/* Tactical Search Pattern Recommendations */}
              <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/70 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-950 font-sans">
                    Recommended Tactical Search Pattern:
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
                  <div className="p-2.5 bg-white flex items-center justify-between">
                    <span className="font-semibold text-zinc-900">Matsya-Kuber IV (Mechanized)</span>
                    <span className="text-zinc-500">4.2 NM from Datum • VHF Ch-16</span>
                  </div>
                  <div className="p-2.5 bg-white flex items-center justify-between">
                    <span className="font-semibold text-zinc-900">ICGS Varuna (Patrol Craft)</span>
                    <span className="text-zinc-500">8.9 NM from Datum • SOG 18.5 kts</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  size="sm"
                  className="text-xs h-8 bg-zinc-950 hover:bg-zinc-800 text-white gap-1.5"
                  onClick={() => alert(`SAR Operations Briefing PDF compiled for Incident ${incidentId}`)}
                >
                  <Download className="h-3.5 w-3.5 text-zinc-300" />
                  <span>Export IAMSAR Tactical Packet</span>
                </Button>

                <Link href="/app/map">
                  <Button variant="outline" size="sm" className="text-xs h-8 border-zinc-200 gap-1.5">
                    <Compass className="h-3.5 w-3.5 text-zinc-600" />
                    <span>Plot Search Polygon on Marine Map</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
