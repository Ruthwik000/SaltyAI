import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MarineLocation, VesselTelemetry } from "@/lib/marine-data";

interface OperatorWidgetProps {
  location: MarineLocation;
  vessels: VesselTelemetry[];
}

export function OperatorWidget({ location, vessels }: OperatorWidgetProps) {
  return (
    <Card className="border-zinc-200">
      <CardHeader className="pb-3 border-b border-zinc-100 flex flex-row items-center justify-between">
        <div>
          <Badge variant="minimal" className="text-[10px] uppercase mb-1">
            Fleet Surveillance
          </Badge>
          <CardTitle className="text-base font-semibold text-zinc-950">
            Active Vessels in {location.name} Sector
          </CardTitle>
        </div>
        <Link href="/app/vessel">
          <Button variant="outline" size="sm" className="text-xs h-7 gap-1">
            <span>Fleet Tracking ({vessels.length})</span>
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-lg overflow-hidden text-xs">
          {vessels.map((v) => (
            <div
              key={v.id}
              className="p-3 bg-white hover:bg-zinc-50 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <div>
                  <div className="font-semibold text-zinc-950">{v.name}</div>
                  <div className="text-[11px] text-zinc-500 font-sans">
                    {v.regNumber} • {v.vesselType}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 font-sans text-[11px] text-right">
                <div>
                  <div className="text-zinc-900">
                    {v.sogKnots} kts ({v.headingText})
                  </div>
                  <div className="text-zinc-400">{v.distanceFromPortNM} NM from port</div>
                </div>
                <Badge
                  variant="minimal"
                  className={
                    v.geofenceStatus === "SAFE"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }
                >
                  {v.geofenceStatus}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
