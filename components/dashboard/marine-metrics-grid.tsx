import Link from "next/link";
import { Thermometer, Wind, Waves, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { MarineLocation } from "@/lib/marine-data";

interface MarineMetricsGridProps {
  location: MarineLocation;
}

export function MarineMetricsGrid({ location }: MarineMetricsGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Card 1: Sea Surface Temperature (SST) */}
      <Card className="p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs font-sans text-zinc-500">
          <span className="uppercase">Sea Surface Temp (SST)</span>
          <Thermometer className="h-4 w-4 text-rose-500" />
        </div>
        <div className="my-2">
          <div className="text-2xl sm:text-3xl font-bold font-sans tracking-tight text-zinc-950">
            {location.sst}°C
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mt-1">
            <span className="text-emerald-600 font-medium">+0.4°C</span>
            <span>vs 10-yr climatology</span>
          </div>
        </div>
        <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-[10px] font-sans text-zinc-400">
          <span>Sensor: INSAT-3DR</span>
          <span className="text-emerald-600">Optimal front</span>
        </div>
      </Card>

      {/* Card 2: Wind Speed & Direction */}
      <Card className="p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs font-sans text-zinc-500">
          <span className="uppercase">Surface Wind</span>
          <Wind className="h-4 w-4 text-sky-500" />
        </div>
        <div className="my-2">
          <div className="text-2xl sm:text-3xl font-bold font-sans tracking-tight text-zinc-950">
            {location.windSpeed} <span className="text-sm font-sans font-normal text-zinc-500">kts</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-600 mt-1 font-sans">
            <span>
              Direction: {location.windDirection} ({location.windDegrees}°)
            </span>
          </div>
        </div>
        <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-[10px] font-sans text-zinc-400">
          <span>Beaufort: Force 4</span>
          <span className="text-zinc-700">Moderate Breeze</span>
        </div>
      </Card>

      {/* Card 3: Wave Height & Period */}
      <Card className="p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs font-sans text-zinc-500">
          <span className="uppercase">Wave State (SWH)</span>
          <Waves className="h-4 w-4 text-blue-500" />
        </div>
        <div className="my-2">
          <div className="text-2xl sm:text-3xl font-bold font-sans tracking-tight text-zinc-950">
            {location.waveHeight} <span className="text-sm font-sans font-normal text-zinc-500">m</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mt-1">
            <span>Period: {location.wavePeriod}s</span>
            <span>•</span>
            <span>Swell: {location.swellHeight}m</span>
          </div>
        </div>
        <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-[10px] font-sans text-zinc-400">
          <span>Buoy: {location.id.toUpperCase()}-AD02</span>
          <span className={location.waveHeight > 2.0 ? "text-amber-600" : "text-emerald-600"}>
            {location.waveHeight > 2.0 ? "Rough Sea" : "Moderate"}
          </span>
        </div>
      </Card>

      {/* Card 4: Marine Risk Index */}
      <Card className="p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs font-sans text-zinc-500">
          <span className="uppercase">Marine Risk Rating</span>
          <ShieldAlert
            className={`h-4 w-4 ${
              location.riskLevel === "Low"
                ? "text-emerald-500"
                : location.riskLevel === "Moderate"
                ? "text-amber-500"
                : "text-rose-500"
            }`}
          />
        </div>
        <div className="my-2">
          <div className="text-2xl sm:text-3xl font-bold font-sans tracking-tight text-zinc-950">
            {location.riskScore}
            <span className="text-sm font-sans font-normal text-zinc-400">/100</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold mt-1">
            <span
              className={
                location.riskLevel === "Low"
                  ? "text-emerald-600"
                  : location.riskLevel === "Moderate"
                  ? "text-amber-600"
                  : "text-rose-600"
              }
            >
              {location.riskLevel} Hazard State
            </span>
          </div>
        </div>
        <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-[10px] font-sans text-zinc-400">
          <span>Model: Salty Invariant</span>
          <Link href="/app/risk" className="text-zinc-900 underline">
            View Factors →
          </Link>
        </div>
      </Card>
    </div>
  );
}
