"use client";

import Link from "next/link";
import { ArrowRight, Navigation, Activity } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type MarineLocation, type PFZZone, getFishSchoolUpdate } from "@/lib/marine-data";
import { useMarine } from "@/lib/marine-context";
import { useT } from "@/lib/i18n";
import { SpeakButton } from "@/components/fisherman/speak-button";

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
  const { t } = useT();
  const schoolUpdate = getFishSchoolUpdate(location.id || location.name);

  /* What the speaker reads: the zone, how far and which way, and why it is
     worth the run — the same three facts the card shows. */
  const spoken = [
    nearbyPFZ.name,
    t("dash.located", {
      distance: nearbyPFZ.distanceNM,
      bearing: nearbyPFZ.bearing,
      deg: nearbyPFZ.bearingDeg,
      depth: nearbyPFZ.depthMeters,
    }),
    t("dash.school", { type: schoolUpdate.schoolType }),
    t("dash.hoursOut", { hours: nearbyPFZ.transitHours }),
  ].join(". ");

  return (
    <Card className="border-zinc-200">
      <CardHeader className="flex flex-col items-start gap-2 border-b border-zinc-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="min-w-0 text-sm font-semibold text-zinc-950 sm:text-base">
          {t("dash.topZone")}
        </CardTitle>
        <div className="flex shrink-0 items-center gap-1.5">
          <SpeakButton size="sm" text={spoken} />
          <Link href="/app/fishing-zones">
            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
              <span>{t("dash.allZones", { count: totalZonesCount })}</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-zinc-50 border border-zinc-200/80">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-[13px] sm:text-sm text-zinc-950 leading-snug">
                {nearbyPFZ.name}
              </span>
              <Badge className="bg-emerald-600 px-1.5 py-0 text-[10px] text-white">
                {t("dash.match", { score: nearbyPFZ.suitabilityScore })}
              </Badge>
              <Badge
                variant="outline"
                className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] px-1.5 py-0 font-medium flex items-center gap-1"
              >
                <Activity className="h-3 w-3 inline text-emerald-600" />
                {t("dash.schoolSurge", { level: schoolUpdate.biomassSurge })}
              </Badge>
            </div>
            <p className="text-xs leading-relaxed text-zinc-600">
              {t("dash.located", {
                distance: nearbyPFZ.distanceNM,
                bearing: nearbyPFZ.bearing,
                deg: nearbyPFZ.bearingDeg,
                depth: nearbyPFZ.depthMeters,
              })}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-sans text-zinc-500 pt-1">
              <span className="text-emerald-700 font-semibold">
                {t("dash.school", { type: schoolUpdate.schoolType })}
              </span>
              <span>•</span>
              <span>{t("dash.hoursOut", { hours: nearbyPFZ.transitHours })}</span>
              <span>•</span>
              <span>{t("dash.fuel", { litres: nearbyPFZ.fuelEstimatedLiters })}</span>
            </div>
            <p className="text-[11px] text-emerald-900 bg-emerald-50/70 border border-emerald-100 rounded px-2 py-1 font-medium mt-1">
              ⚡ {t("dash.fishGathering", { note: schoolUpdate.schoolAlert })}
            </p>
          </div>

          <div className="shrink-0 flex flex-col gap-2">
            {activeJourney?.active ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold">
                <span className="h-2 w-2 rounded-full bg-emerald-600 animate-ping" />
                <span>{t("dash.voyageActive")}</span>
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
                <span>{t("dash.startJourney")}</span>
              </Button>
            )}

            <Link href={`/app/fishing-zones?select=${nearbyPFZ.id}`}>
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs h-7.5 border-zinc-200 text-zinc-700 hover:bg-zinc-100 gap-1"
              >
                <span>{t("dash.navigateToZone")}</span>
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-sans">
          <div className="p-2 rounded border border-zinc-100 bg-white">
            <span className="block text-[10px] text-zinc-400">{t("dash.tide")}</span>
            <span className="font-semibold text-zinc-900">{location.tideStatus}</span>
          </div>
          <div className="p-2 rounded border border-zinc-100 bg-white">
            <span className="block text-[10px] text-zinc-400">{t("dash.highTide")}</span>
            <span className="font-semibold text-zinc-900">{location.nextHighTide.split(" ")[0]}</span>
          </div>
          <div className="p-2 rounded border border-zinc-100 bg-white">
            <span className="block text-[10px] text-zinc-400">{t("cond.visibility")}</span>
            <span className="font-semibold text-zinc-900">{location.weather.visibility} km</span>
          </div>
          <div className="p-2 rounded border border-zinc-100 bg-white">
            <span className="block text-[10px] text-zinc-400">{t("dash.currentDrift")}</span>
            <span className="font-semibold text-zinc-900">
              {location.currentSpeed} m/s {location.currentDirection}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
