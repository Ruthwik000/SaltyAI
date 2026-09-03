import Link from "next/link";
import { ArrowRight, Navigation } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MarineLocation, PFZZone } from "@/lib/marine-data";

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
  return (
    <Card className="border-zinc-200">
      <CardHeader className="pb-3 border-b border-zinc-100 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base font-semibold text-zinc-950">
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
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-zinc-950">
                {nearbyPFZ.name}
              </span>
              <Badge className="bg-emerald-600 text-white text-[10px] px-1.5 py-0">
                {nearbyPFZ.suitabilityScore}% Match
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
              <span>SST Front: {nearbyPFZ.sstGradientC}</span>
              <span>•</span>
              <span>Chl-a: {nearbyPFZ.chlorophyllMgM3} mg/m³</span>
              <span>•</span>
              <span>Est. Fuel: {nearbyPFZ.fuelEstimatedLiters} L</span>
            </div>
          </div>

          <div className="shrink-0 flex flex-col gap-2">
            <Link href={`/app/fishing-zones?select=${nearbyPFZ.id}`}>
              <Button
                size="sm"
                className="w-full text-xs h-8 bg-zinc-950 hover:bg-zinc-800 text-white gap-1"
              >
                <Navigation className="h-3.5 w-3.5" />
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
