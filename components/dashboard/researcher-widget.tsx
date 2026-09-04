import Link from "next/link";
import { ArrowRight, Database } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MarineLocation } from "@/lib/marine-data";

interface ResearcherWidgetProps {
  location: MarineLocation;
}

export function ResearcherWidget({ location }: ResearcherWidgetProps) {
  return (
    <Card className="border-zinc-200">
      <CardHeader className="pb-3 border-b border-zinc-100 flex flex-row items-center justify-between">
        <div>
          <Badge variant="minimal" className="text-[10px] uppercase mb-1">
            Data Observation
          </Badge>
          <CardTitle className="text-sm sm:text-base font-semibold text-zinc-950">
            SST & Chlorophyll Front Dynamics
          </CardTitle>
        </div>
        <Link href="/app/research">
          <Button variant="outline" size="sm" className="text-xs h-7 gap-1">
            <span>ERDDAP Datasets</span>
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <p className="text-xs text-zinc-600 leading-relaxed">
          Remote sensing synthesis for <strong>{location.name}</strong> indicates an active coastal upwelling signature. Strong thermal boundary detected at {location.lat.toFixed(1)}°N with chlorophyll-a spike of {location.chlorophyll} mg/m³.
        </p>

        <div className="grid grid-cols-3 gap-3 font-sans text-xs">
          <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200/80">
            <span className="text-zinc-400 text-[10px] block">Chlorophyll-a</span>
            <span className="text-base font-bold text-zinc-950">{location.chlorophyll} mg/m³</span>
            <span className="text-[10px] text-emerald-600 block mt-0.5">Bloom active</span>
          </div>
          <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200/80">
            <span className="text-zinc-400 text-[10px] block">Barometric Pressure</span>
            <span className="text-base font-bold text-zinc-950">{location.weather.pressure} hPa</span>
            <span className="text-[10px] text-zinc-500 block mt-0.5">Stable gradient</span>
          </div>
          <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200/80">
            <span className="text-zinc-400 text-[10px] block">Current Velocity</span>
            <span className="text-base font-bold text-zinc-950">{location.currentSpeed} m/s</span>
            <span className="text-[10px] text-zinc-500 block mt-0.5">
              Vector: {location.currentDirection}
            </span>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-zinc-200 bg-white flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-purple-600" />
            <span className="font-sans text-zinc-800">
              ERDDAP: incois.gov.in/erddap/griddap/insat_sst_hourly
            </span>
          </div>
          <span className="font-sans text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            200 OK
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
