import Link from "next/link";
import { ArrowRight, AlertTriangle, Navigation } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MarineLocation, VesselTelemetry } from "@/lib/marine-data";
import { useMarine } from "@/lib/marine-context";

interface OperatorWidgetProps {
  location: MarineLocation;
  vessels: VesselTelemetry[];
}

export function OperatorWidget({ location, vessels }: OperatorWidgetProps) {
  const { operatorNotifications, activeJourney } = useMarine();
  const criticalSos = operatorNotifications.find((n) => n.type === "lost_fisherman_sos");

  return (
    <Card className="border-zinc-200">
      <CardHeader className="pb-3 border-b border-zinc-100 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm sm:text-base font-semibold text-zinc-950">
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
        {/* Emergency SOS Banner if triggered by fisherman */}
        {criticalSos && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="h-5 w-5 text-rose-600 animate-pulse shrink-0" />
              <div>
                <span className="font-bold text-rose-950 block">
                  CRITICAL DISTRESS: Lost Fisherman Ping Received
                </span>
                <span className="text-[11px] text-rose-800 line-clamp-1">
                  {criticalSos.message}
                </span>
              </div>
            </div>
            <Link href="/app/lost-fisherman" className="shrink-0">
              <Button
                size="sm"
                className="h-7 text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                Open SAR Operations Center →
              </Button>
            </Link>
          </div>
        )}

        {/* Live Journey Departure Notification to Operator */}
        {activeJourney && (
          <div className="p-3 rounded-lg bg-sky-50 border border-sky-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-2.5 w-2.5 rounded-full bg-sky-600 animate-pulse shrink-0" />
              <div>
                <span className="font-bold text-sky-950 block">
                  Fleet Departure Logged: {activeJourney.vesselName}
                </span>
                <span className="text-[11px] text-sky-800">
                  Vessel commenced voyage to <strong>{activeJourney.destination}</strong> ({activeJourney.distanceNM} NM). Telemetry monitored.
                </span>
              </div>
            </div>
            <Badge className="bg-sky-600 text-white text-[10px]">
              Underway
            </Badge>
          </div>
        )}
        <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-lg overflow-hidden text-xs">
          {vessels.map((v) => (
            <div
              key={v.id}
              className="p-3 bg-white hover:bg-zinc-50 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <div>
                  <div className="font-semibold text-zinc-950 flex items-center gap-1.5">
                    <span>{v.name}</span>
                    {activeJourney && v.name.includes("Matsya-Kuber") && (
                      <span className="text-[10px] bg-sky-100 text-sky-800 font-normal px-1.5 py-0.2 rounded font-sans">
                        En Route to {activeJourney.destination.split(" ")[0]}
                      </span>
                    )}
                  </div>
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
                    v.riskRating === "Low"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }
                >
                  {v.riskRating} Risk
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
