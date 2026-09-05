import Link from "next/link";
import { ArrowRight, Database } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MarineLocation } from "@/lib/marine-data";
import {
  MarineSciencePanel,
  buildForecastHours,
} from "@/components/research/marine-science-panel";

interface ResearcherWidgetProps {
  location: MarineLocation;
}

export function ResearcherWidget({ location }: ResearcherWidgetProps) {
  return (
    <Card className="border-zinc-200">
      <CardHeader className="flex flex-col items-start gap-2 border-b border-zinc-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <Badge variant="minimal" className="mb-1 text-[10px] uppercase">
            Data Observation
          </Badge>
          <CardTitle className="text-sm font-semibold text-zinc-950 sm:text-base">
            SST &amp; Chlorophyll Front Dynamics
          </CardTitle>
        </div>
        <Link href="/app/research" className="shrink-0">
          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
            <span>ERDDAP Datasets</span>
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <p className="text-xs text-zinc-600 leading-relaxed">
          Remote sensing synthesis for <strong>{location.name}</strong> indicates an active coastal upwelling signature. Strong thermal boundary detected at {location.lat.toFixed(1)}°N with chlorophyll-a spike of {location.chlorophyll} mg/m³.
        </p>

        <div className="grid grid-cols-2 gap-2 font-sans text-xs sm:grid-cols-3 sm:gap-3">
          <div className="rounded-lg border border-zinc-200/80 bg-zinc-50 p-2.5 sm:p-3">
            <span className="text-zinc-400 text-[10px] block">Chlorophyll-a</span>
            <span className="text-sm font-bold tabular-nums text-zinc-950 sm:text-base">{location.chlorophyll} mg/m³</span>
            <span className="text-[10px] text-emerald-600 block mt-0.5">Bloom active</span>
          </div>
          <div className="rounded-lg border border-zinc-200/80 bg-zinc-50 p-2.5 sm:p-3">
            <span className="text-zinc-400 text-[10px] block">Barometric Pressure</span>
            <span className="text-sm font-bold tabular-nums text-zinc-950 sm:text-base">{location.weather.pressure} hPa</span>
            <span className="text-[10px] text-zinc-500 block mt-0.5">Stable gradient</span>
          </div>
          <div className="rounded-lg border border-zinc-200/80 bg-zinc-50 p-2.5 sm:p-3">
            <span className="text-zinc-400 text-[10px] block">Current Velocity</span>
            <span className="text-sm font-bold tabular-nums text-zinc-950 sm:text-base">{location.currentSpeed} m/s</span>
            <span className="text-[10px] text-zinc-500 block mt-0.5">
              Vector: {location.currentDirection}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white p-2.5 text-xs sm:p-3">
          <div className="flex min-w-0 items-center gap-2">
            <Database className="h-4 w-4 shrink-0 text-purple-600" />
            <span className="truncate font-sans text-[11px] text-zinc-800 sm:text-xs">
              ERDDAP: incois.gov.in/erddap/griddap/insat_sst_hourly
            </span>
          </div>
          <span className="shrink-0 rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-sans text-[10px] text-emerald-600">
            200 OK
          </span>
        </div>

        {/* The physics behind the paragraph above, with one chart, so the
            dashboard is a working surface and not just a summary. */}
        <div className="border-t border-zinc-100 pt-4">
          <MarineSciencePanel
            location={location}
            hours={buildForecastHours(location)}
            variant="dashboard"
          />
        </div>
      </CardContent>
    </Card>
  );
}
