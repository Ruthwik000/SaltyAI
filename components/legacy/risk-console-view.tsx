"use client";

/**
 * Composite risk console and trip planner (researcher / operator).
 *
 * Preserved verbatim from the pre-mobile-rebuild page so the researcher and
 * operator consoles keep the exact view they had. The fisherman role now
 * routes to its own map-first screen instead.
 */

import * as React from "react";
import { useMarine } from "@/lib/marine-context";
import { pfzZones, marineLocations } from "@/lib/marine-data";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Wind,
  Waves,
  Zap,
  Eye,
  Navigation,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

export function RiskConsoleView() {
  const { location, setIsAiDrawerOpen } = useMarine();

  // Trip Risk Calculator state
  const [departurePort, setDeparturePort] = React.useState(location.name);
  const [destinationZone, setDestinationZone] = React.useState(pfzZones[0].name);
  const [vesselType, setVesselType] = React.useState<"craft" | "motorized" | "trawler" | "longliner">("trawler");
  const [departureHour, setDepartureHour] = React.useState("05:00");
  const [isEvaluating, setIsEvaluating] = React.useState(false);
  const [calculatedTripRisk, setCalculatedTripRisk] = React.useState<{
    score: number;
    level: "Low" | "Moderate" | "Elevated" | "High";
    safeWindow: string;
    routeHazards: string[];
  }>({
    score: 24,
    level: "Low",
    safeWindow: "04:30 AM – 01:30 PM (Optimal Sea State)",
    routeHazards: [
      "Moderate cross-swell at Nautical Mile 12 (0.4m increase)",
      "Surface wind shift expected after 15:30 IST (18 kts ENE)",
    ],
  });

  const handleEvaluate = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEvaluating(true);
    setTimeout(() => {
      setIsEvaluating(false);
      const baseScore = vesselType === "craft" ? 54 : vesselType === "motorized" ? 38 : 22;
      setCalculatedTripRisk({
        score: baseScore,
        level: baseScore > 50 ? "Elevated" : baseScore > 30 ? "Moderate" : "Low",
        safeWindow: "04:30 AM – 01:30 PM (Pre-Squall Window)",
        routeHazards: [
          "Wave steepness index remains below safety threshold (0.028)",
          vesselType === "craft"
            ? "Caution: Country craft requires active life-jacket mandate due to swell"
            : "Vessel stability envelope verified for forecast wave height (1.6m)",
        ],
      });
    }, 600);
  };

  const riskFactors = [
    {
      name: "Wave Steepness & Swell",
      value: `${location.waveHeight}m @ ${location.wavePeriod}s`,
      score: 32,
      status: "Moderate",
      //detail: "Deep water swell height 1.2m; no severe breaking waves along transit corridor.",
      icon: Waves,
    },
    {
      name: "Wind Shear & Gusts",
      value: `${location.windSpeed} kts (${location.windDirection})`,
      score: 26,
      status: "Low",
      //detail: "Sustained below 20 knots; sudden convective squalls unlikely during morning.",
      icon: Wind,
    },
    {
      name: "Atmospheric Instability (CAPE)",
      value: "1,150 J/kg",
      score: 18,
      status: "Low",
      //detail: "Radar reflects scattered cirrus; lightning strike probability < 5%.",
      icon: Zap,
    },
    {
      name: "Current Drift Hazard",
      value: `${location.currentSpeed} m/s ${location.currentDirection}`,
      score: 14,
      status: "Low",
      //detail: "Surface geostrophic current within safe vessel steerage envelope.",
      icon: Navigation,
    },
    {
      name: "Visibility & Marine Fog",
      value: `${location.weather.visibility} km`,
      score: 10,
      status: "Low",
      //detail: "Clear horizon, daytime visibility unobstructed.",
      icon: Eye,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
        <div>
          <h1 className="text-lg leading-snug sm:text-2xl lg:text-3xl font-bold tracking-tight text-zinc-950">
            Marine Risk & Safety Assessment
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setIsAiDrawerOpen(true)}
            className="text-xs h-8 bg-zinc-950 hover:bg-zinc-800 text-white gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5 text-zinc-300" />
            <span>Consult Safety Agent</span>
          </Button>
        </div>
      </div>

      {/* Primary Risk Overview Banner */}
      <div className="p-6 rounded-xl border border-zinc-200 bg-white shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div
            className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border ${
              location.riskLevel === "Low"
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : location.riskLevel === "Moderate"
                ? "bg-amber-50 border-amber-200 text-amber-700"
                : "bg-rose-50 border-rose-200 text-rose-700"
            }`}
          >
            <span className="font-sans text-2xl font-bold">{location.riskScore}</span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-zinc-950">
                {location.name} Sector: {location.riskLevel} Risk Index
              </span>
              <Badge
                variant="minimal"
                className={
                  location.riskLevel === "Low"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }
              >
                Operational Sea State
              </Badge>
            </div>
            <p className="text-xs text-zinc-600 max-w-xl leading-relaxed">
              Composite index generated from significant wave height ({location.waveHeight}m), wind vectors ({location.windSpeed} kts {location.windDirection}), and swell steepness. Mechanized trawlers and motorized craft are cleared for standard offshore operations.
            </p>
          </div>
        </div>

        <div className="shrink-0 flex flex-col sm:flex-row gap-3 w-full md:w-auto font-sans text-xs">
          <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200/80 text-center">
            <span className="text-zinc-400 text-[10px] block uppercase">Recommended Window</span>
            <span className="font-bold text-zinc-900">04:30 - 13:30 IST</span>
          </div>
          <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200/80 text-center">
            <span className="text-zinc-400 text-[10px] block uppercase">Swell Collision</span>
            <span className="font-bold text-emerald-600">Negligible</span>
          </div>
        </div>
      </div>

      {/* Grid: Composite Risk Factors (Left) & Trip Risk Calculator (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Risk Factor Breakdown */}
        <div className="lg:col-span-2 space-y-4">

          <div className="space-y-3">
            {riskFactors.map((rf, idx) => {
              const Icon = rf.icon;
              return (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-zinc-200 bg-white shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-zinc-100 text-zinc-700 shrink-0 mt-0.5">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-zinc-950">
                          {rf.name}
                        </span>
                        <span className="font-sans text-xs text-zinc-500">
                          ({rf.value})
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 font-sans text-xs">
                    <div className="w-24 bg-zinc-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          rf.score < 25 ? "bg-emerald-500" : rf.score < 50 ? "bg-amber-500" : "bg-rose-500"
                        }`}
                        style={{ width: `${rf.score}%` }}
                      />
                    </div>
                    <span className="font-bold text-zinc-900 w-8 text-right">
                      {rf.score}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Right 1 Col: Interactive Trip Risk Calculator */}
        <div className="space-y-4">
          <Card className="border-zinc-200">
            <CardHeader className="pb-3 border-b border-zinc-100">
              <CardTitle className="text-base font-bold text-zinc-950">
                Trip & Route Risk Planner
              </CardTitle>
            </CardHeader>

            <CardContent className="pt-4">
              <form onSubmit={handleEvaluate} className="space-y-3.5 text-xs font-sans">
                <div>
                  <label className="block text-zinc-600 font-medium mb-1 font-sans text-[11px]">
                    Departure Port
                  </label>
                  <select
                    value={departurePort}
                    onChange={(e) => setDeparturePort(e.target.value)}
                    className="h-8 w-full rounded-md border border-zinc-200 bg-white px-2.5 text-xs text-zinc-800"
                  >
                    {marineLocations.map((l) => (
                      <option key={l.id} value={l.name}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-600 font-medium mb-1 font-sans text-[11px]">
                    Destination Fishing Zone / Sector
                  </label>
                  <select
                    value={destinationZone}
                    onChange={(e) => setDestinationZone(e.target.value)}
                    className="h-8 w-full rounded-md border border-zinc-200 bg-white px-2.5 text-xs text-zinc-800"
                  >
                    {pfzZones.map((z) => (
                      <option key={z.id} value={z.name}>
                        {z.name.slice(0, 30)}... ({z.distanceNM} NM)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-600 font-medium mb-1 font-sans text-[11px]">
                    Vessel Specification & Hull Type
                  </label>
                  <select
                    value={vesselType}
                    onChange={(e) => setVesselType(e.target.value as "craft" | "motorized" | "trawler" | "longliner")}
                    className="h-8 w-full rounded-md border border-zinc-200 bg-white px-2.5 text-xs text-zinc-800"
                  >
                    <option value="craft">Non-Motorized Country Craft (&lt;24ft)</option>
                    <option value="motorized">Motorized FRP Craft (28-34ft)</option>
                    <option value="trawler">Mechanized Wooden/Steel Trawler (48ft)</option>
                    <option value="longliner">Deep-Sea Commercial Longliner (65ft+)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-600 font-medium mb-1 font-sans text-[11px]">
                    Scheduled Departure Time
                  </label>
                  <Input
                    type="time"
                    value={departureHour}
                    onChange={(e) => setDepartureHour(e.target.value)}
                    className="h-8 text-xs font-sans"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isEvaluating}
                  className="w-full text-xs h-9 bg-zinc-950 hover:bg-zinc-800 text-white gap-1.5 mt-2"
                >
                  <Navigation className="h-3.5 w-3.5" />
                  <span>{isEvaluating ? "Computing Invariants..." : "Evaluate Route Risk"}</span>
                </Button>
              </form>

              {/* Evaluation Result Card */}
              <div className="mt-4 pt-4 border-t border-zinc-100 space-y-3">
                <div className="p-3 rounded-lg border border-zinc-200 bg-zinc-50 space-y-1">
                  <div className="flex items-center justify-between font-sans text-xs">
                    <span className="text-zinc-500">Trip Risk Index:</span>
                    <span className="font-bold text-zinc-950">
                      {calculatedTripRisk.score}/100 ({calculatedTripRisk.level})
                    </span>
                  </div>
                  <div className="text-[11px] font-sans text-emerald-700 font-medium">
                    {calculatedTripRisk.safeWindow}
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  <span className="font-sans text-[10px] uppercase tracking-wider text-zinc-400 font-semibold block">
                    Route Waypoint Notices:
                  </span>
                  {calculatedTripRisk.routeHazards.map((hz, i) => (
                    <div key={i} className="flex items-start gap-2 text-zinc-600 text-[11px]">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{hz}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
