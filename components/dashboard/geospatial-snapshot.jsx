import Link from "next/link";
import { Compass, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function GeospatialSnapshot({ location, nearbyPFZ }) {
  return (
    <Card className="border-zinc-200">
      <CardHeader className="pb-3 border-b border-zinc-100 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-semibold text-zinc-950 flex items-center gap-2">
            <Compass className="h-4 w-4 text-zinc-700" />
            <span>Geospatial Intelligence Snapshot</span>
          </CardTitle>
          <p className="text-xs text-zinc-500 mt-0.5">
            Real-time thermal fronts, chlorophyll blooms, and boundary perimeters
          </p>
        </div>
        <Link href="/app/map">
          <Button size="sm" variant="outline" className="text-xs h-7 border-zinc-200">
            Full Map View →
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="relative h-48 w-full rounded-lg bg-slate-50 text-zinc-700 overflow-hidden border border-zinc-200 p-4 flex flex-col justify-between">
          <div className="absolute inset-0 bg-grid-subtle opacity-20 pointer-events-none" />
          <div className="absolute top-8 right-12 h-24 w-40 rounded-full bg-blue-500/10 blur-xl pointer-events-none" />
          <div className="absolute bottom-6 left-24 h-20 w-32 rounded-full bg-sky-500/10 blur-lg pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between text-xs font-sans">
            <span className="text-zinc-500">
              LAT: {location.lat.toFixed(2)}°N | LON: {location.lon.toFixed(2)}°E
            </span>
            <Badge
              variant="minimal"
              className="bg-white text-zinc-600 border-zinc-200 text-[10px]"
            >
              Layer: SST + Chl-a Overlay
            </Badge>
          </div>

          <div className="relative z-10 flex items-center justify-center gap-6 text-center">
            <div className="bg-white/90 border border-zinc-200 p-2.5 rounded-md backdrop-blur-xs">
              <span className="text-[10px] text-zinc-500 font-sans block">
                Station Origin
              </span>
              <span className="font-semibold text-zinc-900 text-xs">
                {location.name} Port
              </span>
            </div>
            <ArrowRight className="h-4 w-4 text-zinc-500" />
            <div className="bg-white/90 border border-sky-200 p-2.5 rounded-md backdrop-blur-xs">
              <span className="text-[10px] text-sky-700 font-sans block">
                Nearest PFZ Front
              </span>
              <span className="font-semibold text-sky-800 text-xs">
                {nearbyPFZ.name.slice(0, 22)}...
              </span>
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between text-[11px] font-sans text-zinc-500">
            <span>Depth: 45 - 90m</span>
            <span>12NM Territorial Limit: Clear</span>
            <span>IMBL Distance: 142 NM</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
