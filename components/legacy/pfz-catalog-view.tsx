"use client";

/**
 * PFZ catalogue and comparison view (researcher).
 *
 * Preserved verbatim from the pre-mobile-rebuild page so the researcher and
 * operator consoles keep the exact view they had. The fisherman role now
 * routes to its own map-first screen instead.
 */

import * as React from "react";
import Link from "next/link";
import { useMarine } from "@/lib/marine-context";
import { pfzZones, PFZZone } from "@/lib/marine-data";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Navigation,
  Compass,
  CheckCircle2,
  Sparkles,
  Bookmark,
  BookmarkCheck,
  Scale,
  Fuel,
  Clock,
} from "lucide-react";

export function PfzCatalogView() {
  const { location, savedZoneIds, toggleSaveZone, setIsAiDrawerOpen } = useMarine();
  const [selectedZone, setSelectedZone] = React.useState<PFZZone>(pfzZones[0]);
  const [comparisonZones, setComparisonZones] = React.useState<string[]>([
    pfzZones[0].id,
    pfzZones[1].id,
  ]);
  const [showComparison, setShowComparison] = React.useState(false);

  const toggleCompare = (id: string) => {
    setComparisonZones((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const zonesToCompare = pfzZones.filter((z) => comparisonZones.includes(z.id));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
        <div>
          <h1 className="text-lg leading-snug sm:text-2xl lg:text-3xl font-bold tracking-tight text-zinc-950">
            Potential Fishing Zones (PFZ)
          </h1>
          <p className="mt-1 text-xs text-zinc-500 font-sans">
            Grounded INCOIS ocean colour & thermal front advisories • Sector: {location.name}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant={showComparison ? "default" : "outline"}
            size="sm"
            onClick={() => setShowComparison(!showComparison)}
            className="text-xs h-8 gap-1.5 border-zinc-200"
          >
            <Scale className="h-3.5 w-3.5" />
            <span>Compare Zones ({comparisonZones.length})</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setIsAiDrawerOpen(true)}
            className="text-xs h-8 bg-zinc-950 hover:bg-zinc-800 text-white gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5 text-zinc-300" />
            <span>Ask Catch Advisor</span>
          </Button>
        </div>
      </div>

      {/* Comparison Drawer / Modal (if opened) */}
      {showComparison && zonesToCompare.length > 0 && (
        <Card className="border-zinc-900 bg-zinc-50/50 shadow-md">
          <CardHeader className="pb-3 border-b border-zinc-200 flex flex-row items-center justify-between">
            <div>
              <Badge variant="minimal" className="uppercase tracking-wider text-[10px] mb-1">
                Comparative Matrix
              </Badge>
              <CardTitle className="text-base font-semibold text-zinc-950">
                Zone Efficiency & Catch Potential Comparison
              </CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowComparison(false)}
              className="text-xs h-7"
            >
              Close Comparison
            </Button>
          </CardHeader>
          <CardContent className="pt-4 overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500 font-sans text-[11px] uppercase">
                  <th className="py-2.5 px-3">Metric</th>
                  {zonesToCompare.map((z) => (
                    <th key={z.id} className="py-2.5 px-3 font-semibold text-zinc-900">
                      {z.name.slice(0, 24)}...
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/70 font-sans text-xs">
                <tr>
                  <td className="py-2.5 px-3 text-zinc-500 font-sans">Suitability Score</td>
                  {zonesToCompare.map((z) => (
                    <td key={z.id} className="py-2.5 px-3 font-bold text-emerald-700">
                      {z.suitabilityScore}% ({z.suitabilityText})
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 px-3 text-zinc-500 font-sans">Distance from Port</td>
                  {zonesToCompare.map((z) => (
                    <td key={z.id} className="py-2.5 px-3 text-zinc-900">
                      {z.distanceNM} NM ({z.bearing})
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 px-3 text-zinc-500 font-sans">Est. Transit Time</td>
                  {zonesToCompare.map((z) => (
                    <td key={z.id} className="py-2.5 px-3 text-zinc-700">
                      {z.transitHours} Hours
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 px-3 text-zinc-500 font-sans">Fuel Consumption</td>
                  {zonesToCompare.map((z) => (
                    <td key={z.id} className="py-2.5 px-3 text-zinc-700">
                      ~{z.fuelEstimatedLiters} Liters
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 px-3 text-zinc-500 font-sans">SST Front</td>
                  {zonesToCompare.map((z) => (
                    <td key={z.id} className="py-2.5 px-3 text-zinc-700">
                      {z.sstC}°C ({z.sstGradientC})
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 px-3 text-zinc-500 font-sans">Chlorophyll-a</td>
                  {zonesToCompare.map((z) => (
                    <td key={z.id} className="py-2.5 px-3 text-zinc-700">
                      {z.chlorophyllMgM3} mg/m³
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 px-3 text-zinc-500 font-sans">Primary Species</td>
                  {zonesToCompare.map((z) => (
                    <td key={z.id} className="py-2.5 px-3 text-zinc-800 font-sans text-[11px]">
                      {z.primarySpecies.slice(0, 2).join(", ")}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Main Grid: Zones List + Active Zone Navigation Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Zone Cards */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between text-xs font-sans text-zinc-500">
            <span>Sorted by Distance & Suitability</span>
          </div>

          {pfzZones.map((zone) => {
            const isSelected = selectedZone.id === zone.id;
            const isSaved = savedZoneIds.includes(zone.id);
            const isCompared = comparisonZones.includes(zone.id);

            return (
              <Card
                key={zone.id}
                className={`transition-all cursor-pointer ${
                  isSelected
                    ? "border-zinc-950 ring-1 ring-zinc-950 shadow-md"
                    : "border-zinc-200 hover:border-zinc-300"
                }`}
                onClick={() => setSelectedZone(zone)}
              >
                <CardHeader className="pb-3 border-b border-zinc-100 flex flex-row items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        className={`text-[10px] px-2 py-0.5 ${
                          zone.suitabilityScore >= 90
                            ? "bg-emerald-600 text-white"
                            : "bg-amber-600 text-white"
                        }`}
                      >
                        {zone.suitabilityScore}% • {zone.suitabilityText} Potential
                      </Badge>
                    </div>
                    <CardTitle className="text-base font-bold text-zinc-950">
                      {zone.name}
                    </CardTitle>
                  </div>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => toggleCompare(zone.id)}
                      className={`p-1.5 rounded border text-xs cursor-pointer ${
                        isCompared
                          ? "bg-zinc-900 text-white border-zinc-900"
                          : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100"
                      }`}
                      title="Compare zone"
                    >
                      <Scale className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => toggleSaveZone(zone.id)}
                      className="p-1.5 rounded border border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 cursor-pointer"
                      title="Bookmark zone"
                    >
                      {isSaved ? (
                        <BookmarkCheck className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Bookmark className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-4">
                  {/* Grid of Key Oceanographic Attributes */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-sans text-xs">
                    <div className="p-2.5 rounded-lg border border-zinc-200 bg-zinc-50">
                      <span className="text-zinc-400 text-[10px] block">Distance & Bearing</span>
                      <span className="font-bold text-zinc-900">{zone.distanceNM} NM</span>
                      <span className="text-[10px] text-zinc-500 block">{zone.bearing} ({zone.bearingDeg}°)</span>
                    </div>

                    <div className="p-2.5 rounded-lg border border-zinc-200 bg-zinc-50">
                      <span className="text-zinc-400 text-[10px] block">Thermal Front (SST)</span>
                      <span className="font-bold text-zinc-900">{zone.sstC}°C</span>
                      <span className="text-[10px] text-zinc-500 block">{zone.sstGradientC}</span>
                    </div>

                    <div className="p-2.5 rounded-lg border border-zinc-200 bg-zinc-50">
                      <span className="text-zinc-400 text-[10px] block">Chlorophyll-a</span>
                      <span className="font-bold text-zinc-900">{zone.chlorophyllMgM3} mg/m³</span>
                      <span className="text-[10px] text-emerald-600 block">Optimal Bloom</span>
                    </div>

                    <div className="p-2.5 rounded-lg border border-zinc-200 bg-zinc-50">
                      <span className="text-zinc-400 text-[10px] block">Water Depth</span>
                      <span className="font-bold text-zinc-900">{zone.depthMeters} m</span>
                      <span className="text-[10px] text-zinc-500 block">Shelf Edge</span>
                    </div>
                  </div>

                  {/* Species & Gear */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs pt-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-zinc-500">Target Species:</span>
                      {zone.primarySpecies.map((sp, idx) => (
                        <span
                          key={idx}
                          className="bg-zinc-100 text-zinc-800 px-2 py-0.5 rounded text-[11px] font-medium"
                        >
                          {sp}
                        </span>
                      ))}
                    </div>
                    <div className="text-[11px] text-zinc-500 font-sans">
                      Gear: <strong className="text-zinc-800 font-sans">{zone.recommendedGear}</strong>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="pt-3 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-4 font-sans text-[11px] text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {zone.transitHours}h Transit
                    </span>
                    <span className="flex items-center gap-1">
                      <Fuel className="h-3 w-3" />
                      ~{zone.fuelEstimatedLiters}L Fuel
                    </span>
                  </div>

                  <Button
                    size="sm"
                    className={`h-7 px-3 text-xs gap-1 ${
                      isSelected
                        ? "bg-zinc-950 text-white"
                        : "bg-white text-zinc-950 border border-zinc-200 hover:bg-zinc-100"
                    }`}
                  >
                    <Navigation className="h-3 w-3" />
                    <span>{isSelected ? "Active Route" : "Select & Plot"}</span>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Right 1 Col: Turn-by-Turn Navigation Towards Selected Zone */}
        <div className="space-y-4">
          <Card className="border-zinc-200 sticky top-20">
            <CardHeader className="pb-3 border-b border-zinc-100">
              <CardTitle className="text-base font-bold text-zinc-950">
                Route to {selectedZone.name.slice(0, 20)}...
              </CardTitle>
              <p className="text-xs text-zinc-500 font-sans">
                Waypoint: {selectedZone.lat.toFixed(3)}°N, {selectedZone.lon.toFixed(3)}°E
              </p>
            </CardHeader>

            <CardContent className="pt-4 space-y-4 text-xs font-sans">
              {/* Compass & Vector Heading */}
              <div className="p-4 rounded-lg border border-sky-200 bg-sky-50/70 text-zinc-950 flex items-center justify-between font-sans">
                <div>
                  <span className="text-[10px] text-zinc-400 uppercase block">Steer Heading</span>
                  <span className="text-2xl font-bold tracking-tight text-sky-700">
                    {selectedZone.bearingDeg}° {selectedZone.bearing}
                  </span>
                  <span className="text-[11px] text-zinc-400 block mt-0.5">
                    Distance: {selectedZone.distanceNM} Nautical Miles
                  </span>
                </div>
                <div className="h-12 w-12 rounded-full border border-sky-200 flex items-center justify-center bg-white">
                  <Compass className="h-6 w-6 text-sky-700" />
                </div>
              </div>

              {/* Waypoints Breakdown */}
              <div className="space-y-2">
                <span className="font-sans text-[10px] uppercase tracking-wider text-zinc-400 font-semibold block">
                  Route Waypoints:
                </span>
                <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-lg overflow-hidden font-sans text-[11px]">
                  <div className="p-2.5 bg-white flex justify-between">
                    <span className="text-zinc-600">WP1: Departure (Harbor Channel)</span>
                    <span className="text-zinc-900 font-semibold">0.0 NM</span>
                  </div>
                  <div className="p-2.5 bg-white flex justify-between">
                    <span className="text-zinc-600">WP2: Mid-Course Shelf Turn</span>
                    <span className="text-zinc-900 font-semibold">
                      {(selectedZone.distanceNM * 0.5).toFixed(1)} NM
                    </span>
                  </div>
                  <div className="p-2.5 bg-emerald-50/60 flex justify-between">
                    <span className="text-emerald-800 font-semibold">WP3: PFZ Thermal Core</span>
                    <span className="text-emerald-800 font-bold">{selectedZone.distanceNM} NM</span>
                  </div>
                </div>
              </div>

              {/* Pre-Departure Safety Checklist */}
              <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 space-y-1.5 text-xs">
                <span className="font-semibold text-zinc-900 block text-[11px] font-sans uppercase">
                  Safety & Sea State Along Route:
                </span>
                <div className="flex items-center gap-1.5 text-zinc-600 text-[11px]">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Wave height &lt; 1.8m throughout transit</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-600 text-[11px]">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Outside Maritime Restricted & MPA boundaries</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-600 text-[11px]">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>AIS transponder reception verified (Class B)</span>
                </div>
              </div>

              {/* Direct Link to Marine Map */}
              <Link href={`/app/map`}>
                <Button className="w-full text-xs h-9 bg-zinc-950 hover:bg-zinc-800 text-white gap-1.5">
                  <Compass className="h-3.5 w-3.5 text-zinc-300" />
                  <span>Inspect Thermal Layers on Marine Map</span>
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
