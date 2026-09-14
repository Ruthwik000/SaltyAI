"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMarine } from "@/lib/marine-context";
import { geofenceZones, activeVessels, GeofenceZone } from "@/lib/marine-data";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Compass,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Radio,
  Navigation,
  Crosshair,
  Sparkles,
  MapPin,
  Bell,
  CheckCircle2,
  Lock,
} from "lucide-react";

export default function GeofencingPage() {
  const router = useRouter();
  const { location, setIsAiDrawerOpen } = useMarine();
  const [selectedZone, setSelectedZone] = React.useState(geofenceZones[0]);
  const [proximityAlertActive, setProximityAlertActive] = React.useState(true);

  React.useEffect(() => {
    router.replace("/app/map");
  }, [router]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
        <div>
          <h1 className="text-lg leading-snug sm:text-2xl lg:text-3xl font-bold tracking-tight text-zinc-950">
            Geofencing & Boundary Compliance
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setIsAiDrawerOpen(true)}
            className="text-xs h-8 bg-zinc-950 hover:bg-zinc-800 text-white gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5 text-zinc-300" />
            <span>Boundary Advisor</span>
          </Button>
        </div>
      </div>

      {/* Real-time Proximity Alert Notice */}
      {proximityAlertActive && (
        <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/50 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-sans">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-zinc-950">
                  Proximity Caution: Vessel &quot;Velankanni Matha&quot;
                  (IND-TN-11-MO-3012)
                </span>
                <Badge className="bg-amber-600 text-white text-[10px] px-1.5 py-0">
                  4.8 NM from IMBL
                </Badge>
              </div>
              <p className="text-xs text-zinc-600 mt-0.5">
                Vessel has crossed into the 5.0 Nautical Mile caution buffer zone of the
                India-Sri Lanka International Maritime Boundary Line.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              className="text-xs h-8 bg-amber-900 hover:bg-amber-800 text-white gap-1"
              onClick={() =>
                alert("Simulated VHF Ch-16 Warning broadcast to vessel skipper.")
              }
            >
              <Radio className="h-3.5 w-3.5" />
              <span>Broadcast Audio Warning</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setProximityAlertActive(false)}
              className="text-xs h-8 border-amber-200"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Top 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-sans text-xs">
        <Card className="p-4">
          <span className="text-zinc-400 uppercase text-[10px] block">
            Tracked Boundaries
          </span>
          <div className="text-2xl font-bold text-zinc-950 my-1">
            {geofenceZones.length} Zones
          </div>
          <span className="text-[11px] text-zinc-500 font-sans">
            1 IMBL, 2 Marine Parks, 1 Naval Gunnery
          </span>
        </Card>

        <Card className="p-4">
          <span className="text-zinc-400 uppercase text-[10px] block">
            Monitored Vessels
          </span>
          <div className="text-2xl font-bold text-zinc-950 my-1">
            {activeVessels.length} Online
          </div>
          <span className="text-[11px] text-emerald-600 font-sans">
            3 Clear, 1 Caution Buffer
          </span>
        </Card>

        <Card className="p-4">
          <span className="text-zinc-400 uppercase text-[10px] block">
            Active Buffer Zone
          </span>
          <div className="text-2xl font-bold text-zinc-950 my-1">5.0 NM</div>
          <span className="text-[11px] text-zinc-500 font-sans">
            Automated sound/SMS perimeter
          </span>
        </Card>
      </div>

      {/* Main Grid: Zones Catalog + Live Vessel Distance Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Geofence Zones Catalog */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between text-xs font-sans text-zinc-500">
            <span>Defined Operational Geofences</span>
            <span>Enforced by Indian Coast Guard & Forest Dept</span>
          </div>

          <div className="space-y-3">
            {geofenceZones.map((zone) => {
              const isSelected = selectedZone.id === zone.id;
              return (
                <Card
                  key={zone.id}
                  className={`transition-all cursor-pointer ${
                    isSelected
                      ? "border-zinc-950 ring-1 ring-zinc-950 shadow-md"
                      : "border-zinc-200 hover:border-zinc-300"
                  }`}
                  onClick={() => setSelectedZone(zone)}
                >
                  <CardHeader className="pb-3 border-b border-zinc-100 flex flex-row items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant="minimal"
                          className={
                            zone.status === "Strictly Prohibited"
                              ? "bg-rose-50 text-rose-700 border-rose-200 font-semibold"
                              : "bg-amber-50 text-amber-700 border-amber-200 font-medium"
                          }
                        >
                          {zone.status}
                        </Badge>
                        <span className="font-sans text-xs text-zinc-400">
                          {zone.category}
                        </span>
                      </div>
                      <CardTitle className="text-base font-bold text-zinc-950">
                        {zone.name}
                      </CardTitle>
                    </div>

                    <span className="font-sans text-xs text-zinc-500">{zone.sea}</span>
                  </CardHeader>

                  <CardContent className="pt-3 space-y-2 text-xs font-sans">
                    <p className="text-zinc-600 leading-relaxed">{zone.description}</p>

                    <div className="p-2.5 rounded bg-zinc-50 border border-zinc-200 text-[11px] font-sans text-zinc-700">
                      <strong className="text-zinc-900 block uppercase text-[10px]">
                        Enforcement Penalty Notice:
                      </strong>
                      {zone.penaltyWarning}
                    </div>

                    {/* Coordinates preview */}
                    <div className="pt-1 flex items-center gap-3 font-sans text-[10px] text-zinc-400">
                      <span>Perimeter Coordinates:</span>
                      {zone.points.slice(0, 2).map((pt, i) => (
                        <span
                          key={i}
                          className="bg-zinc-100 text-zinc-700 px-1.5 py-0.5 rounded"
                        >
                          {pt.lat}°N, {pt.lon}°E
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Fleet Distance & Compliance Matrix */}
        <div className="space-y-4">
          <Card className="border-zinc-200">
            <CardHeader className="pb-3 border-b border-zinc-100">
              <Badge
                variant="minimal"
                className="uppercase tracking-widest text-[10px] mb-1"
              >
                Live AIS Telemetry
              </Badge>
              <CardTitle className="text-sm font-bold text-zinc-950">
                Vessel Proximity to Boundaries
              </CardTitle>
              <p className="text-xs text-zinc-500">
                Distance calculation to nearest restricted maritime boundary
              </p>
            </CardHeader>

            <CardContent className="pt-4 space-y-3">
              {activeVessels.map((v) => (
                <div
                  key={v.id}
                  className="p-3 rounded-lg border border-zinc-200 bg-zinc-50/60 space-y-2 text-xs font-sans"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-zinc-950 block">{v.name}</span>
                      <span className="font-sans text-[10px] text-zinc-500">
                        {v.regNumber}
                      </span>
                    </div>
                    <Badge
                      variant="minimal"
                      className={
                        v.geofenceStatus === "SAFE"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200 font-semibold"
                      }
                    >
                      {v.geofenceStatus}
                    </Badge>
                  </div>

                  <div className="pt-1 border-t border-zinc-200/60 flex items-center justify-between font-sans text-[11px]">
                    <span className="text-zinc-500">Distance to IMBL:</span>
                    <span
                      className={`font-bold ${
                        v.distanceToIMBLNM < 10 ? "text-amber-700" : "text-zinc-900"
                      }`}
                    >
                      {v.distanceToIMBLNM} NM
                    </span>
                  </div>

                  <div className="flex items-center justify-between font-sans text-[11px]">
                    <span className="text-zinc-500">Current Speed:</span>
                    <span className="text-zinc-900">
                      {v.sogKnots} kts ({v.headingText})
                    </span>
                  </div>
                </div>
              ))}

              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs h-8 border-zinc-200 gap-1.5"
                  onClick={() =>
                    alert(
                      "Geofence perimeter sync request sent to Coast Guard coastal radar."
                    )
                  }
                >
                  <Navigation className="h-3.5 w-3.5 text-zinc-600" />
                  <span>Sync Perimeter Radar</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
