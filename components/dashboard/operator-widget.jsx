import Link from "next/link";
import { ArrowRight, AlertTriangle, Navigation } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { useMarine } from "@/lib/marine-context";

export function OperatorWidget({ location, vessels }) {
  const { operatorNotifications, activeJourney } = useMarine();
  const criticalSos = operatorNotifications.find((n) => n.type === "lost_fisherman_sos");

  return (
    <Card className="border-zinc-200">
      <CardHeader className="flex flex-col items-start gap-2 border-b border-zinc-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="min-w-0 text-sm font-semibold text-zinc-950 sm:text-base">
          Active Vessels in {location.name} Sector
        </CardTitle>
        <Link href="/app/vessel" className="shrink-0">
          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
            <span>Fleet Tracking ({vessels.length})</span>
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        {/* Emergency SOS Banner if triggered by fisherman */}
        {criticalSos && (
          <div className="flex flex-col justify-between gap-2.5 rounded-lg border border-rose-300 bg-rose-50 p-3 text-xs sm:flex-row sm:items-center">
            <div className="flex min-w-0 items-start gap-2.5 sm:items-center">
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
          <div className="flex flex-col justify-between gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs sm:flex-row sm:items-center">
            <div className="flex min-w-0 items-start gap-2.5 sm:items-center">
              <div className="mt-1 h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-sky-600 sm:mt-0" />
              <div className="min-w-0">
                <span className="font-bold text-sky-950 block">
                  Fleet Departure Logged: {activeJourney.vesselName}
                </span>
                <span className="text-[11px] text-sky-800">
                  Vessel commenced voyage to <strong>{activeJourney.destination}</strong>{" "}
                  ({activeJourney.distanceNM} NM). Telemetry monitored.
                </span>
              </div>
            </div>
            <Badge className="shrink-0 self-start whitespace-nowrap bg-sky-600 text-[10px] text-white sm:self-auto">
              Underway
            </Badge>
          </div>
        )}
        <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-lg overflow-hidden text-xs">
          {vessels.map((v) => (
            <div
              key={v.id}
              className="flex flex-col gap-2 bg-white p-3 transition-colors hover:bg-zinc-50 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-start gap-2.5 sm:items-center sm:gap-3">
                <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500 sm:mt-0" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 font-semibold text-zinc-950">
                    <span>{v.name}</span>
                    {activeJourney && v.name.includes("Matsya-Kuber") && (
                      <span className="text-[10px] bg-sky-100 text-sky-800 font-normal px-1.5 py-0.2 rounded font-sans">
                        En Route to {activeJourney.destination.split(" ")[0]}
                      </span>
                    )}
                  </div>
                  <div className="font-sans text-[11px] leading-snug text-zinc-500">
                    {v.regNumber} • {v.vesselType}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center justify-between gap-3 pl-[18px] font-sans text-[11px] sm:justify-end sm:gap-4 sm:pl-0 sm:text-right">
                <div className="whitespace-nowrap">
                  <span className="tabular-nums text-zinc-900">
                    {v.sogKnots} kts ({v.headingText})
                  </span>
                  <span className="text-zinc-400 sm:block">
                    <span className="sm:hidden"> · </span>
                    {v.distanceFromPortNM} NM from port
                  </span>
                </div>
                <Badge
                  variant="minimal"
                  className={
                    "shrink-0 whitespace-nowrap " +
                    (v.riskRating === "Low"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-700 border-amber-200")
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
