"use client";

import Link from "next/link";
import { ArrowRight, Navigation, Activity } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type MarineLocation, type PFZZone, getFishSchoolUpdate } from "@/lib/marine-data";
import { useMarine } from "@/lib/marine-context";

interface FishermanWidgetProps {
  location: MarineLocation;
  nearbyPFZ: PFZZone;
  totalZonesCount: number;
}

export function FishermanWidget({
  location,
  nearbyPFZ,
  totalZonesCount,
}: FishermanWidgetProps) {
  const { startJourney, activeJourney } = useMarine();
  const schoolUpdate = getFishSchoolUpdate(location.id || location.name);

  return (
    <Card className="border-zinc-200">
      <CardHeader className="pb-3 border-b border-zinc-100 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm sm:text-base font-semibold text-zinc-950">
            Highest Suitability Fishing Zone Today
          </CardTitle>
        </div>
        <Link href="/app/fishing-zones">
          <Button variant="outline" size="sm" className="text-xs h-7 gap-1">
            <span>All Zones ({totalZonesCount})</span>
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-zinc-50 border border-zinc-200/80">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-[13px] sm:text-sm text-zinc-950 leading-snug">
                {nearbyPFZ.name}
              </span>
              <Badge className="bg-emerald-600 text-white text-[10px] px-1.5 py-0">
                {nearbyPFZ.suitabilityScore}% Match
              </Badge>
              <Badge
                variant="outline"
                className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] px-1.5 py-0 font-medium flex items-center gap-1"
              >
                <Activity className="h-3 w-3 inline text-emerald-600" />
                School Surge: {schoolUpdate.biomassSurge}
              </Badge>
            </div>
            <p className="text-xs text-zinc-600">
              Located <strong>{nearbyPFZ.distanceNM} NM</strong> bearing{" "}
              <strong>
                {nearbyPFZ.bearing} ({nearbyPFZ.bearingDeg}°)
              </strong>
              . Depth: {nearbyPFZ.depthMeters}m.
            </p>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-sans text-zinc-500 pt-1">
              <span className="text-emerald-700 font-semibold">
                School: {schoolUpdate.schoolType}
              </span>
              <span>•</span>
              <span>About {nearbyPFZ.transitHours} h out</span>
              <span>•</span>
              <span>Fuel ~{nearbyPFZ.fuelEstimatedLiters} L</span>
            </div>
            <p className="text-[11px] text-emerald-900 bg-emerald-50/70 border border-emerald-100 rounded px-2 py-1 font-medium mt-1">
              ⚡ Fish are gathering here: {schoolUpdate.schoolAlert}
            </p>
          </div>

          <div className="shrink-0 flex flex-col gap-2">
            {activeJourney?.active ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold">
                <span className="h-2 w-2 rounded-full bg-emerald-600 animate-ping" />
                <span>Voyage Active • Fleet Notified</span>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={() => {
                  startJourney(nearbyPFZ.name, nearbyPFZ.distanceNM);
                }}
                className="w-full text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 cursor-pointer shadow-xs"
              >
                <Navigation className="h-3.5 w-3.5" />
                <span>Start Journey (Notify Operator)</span>
              </Button>
            )}

            <Link href={`/app/fishing-zones?select=${nearbyPFZ.id}`}>
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs h-7.5 border-zinc-200 text-zinc-700 hover:bg-zinc-100 gap-1"
              >
                <span>Navigate to Zone</span>
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-sans">
          <div className="p-2 rounded border border-zinc-100 bg-white">
            <span className="text-zinc-400 block text-[10px]">Tide Status</span>
            <span className="font-semibold text-zinc-900">{location.tideStatus}</span>
          </div>
          <div className="p-2 rounded border border-zinc-100 bg-white">
            <span className="text-zinc-400 block text-[10px]">High Tide</span>
            <span className="font-semibold text-zinc-900">{location.nextHighTide.split(" ")[0]}</span>
          </div>
          <div className="p-2 rounded border border-zinc-100 bg-white">
            <span className="text-zinc-400 block text-[10px]">Visibility</span>
            <span className="font-semibold text-zinc-900">{location.weather.visibility} km</span>
          </div>
          <div className="p-2 rounded border border-zinc-100 bg-white">
            <span className="text-zinc-400 block text-[10px]">Current Drift</span>
            <span className="font-semibold text-zinc-900">
              {location.currentSpeed} m/s {location.currentDirection}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
