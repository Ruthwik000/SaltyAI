"use client";

import * as React from "react";
import Link from "next/link";
import { useMarine } from "@/lib/marine-context";
import { activeVessels, Vessel } from "@/lib/marine-data";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Navigation,
  Compass,
  Fuel,
  Clock,
  Radio,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Waves,
  Wind,
  Thermometer,
  Sparkles,
  LifeBuoy,
  MapPin,
  CheckCircle2,
} from "lucide-react";

export default function VesselGpsPage() {
  const { location, setIsAiDrawerOpen } = useMarine();
  const [selectedVessel, setSelectedVessel] = React.useState<Vessel>(activeVessels[0]);
  const [sosActive, setSosActive] = React.useState(selectedVessel.sosActive);

  const handleToggleSos = () => {
    const next = !sosActive;
    setSosActive(next);
    if (next) {
      alert(`EMERGENCY SOS BEACON BROADCASTED to Indian Coast Guard MRCC for vessel ${selectedVessel.name}!`);
    }
  };

  const breadcrumbs = [
    { time: "10 mins ago", lat: (selectedVessel.currentLat - 0.02).toFixed(3), lon: (selectedVessel.currentLon - 0.03).toFixed(3), sog: selectedVessel.sogKnots, wave: "1.6m", note: "Cruising speed" },
    { time: "30 mins ago", lat: (selectedVessel.currentLat - 0.06).toFixed(3), lon: (selectedVessel.currentLon - 0.08).toFixed(3), sog: selectedVessel.sogKnots + 0.5, wave: "1.5m", note: "Heading ENE" },
    { time: "1 hour ago", lat: (selectedVessel.currentLat - 0.12).toFixed(3), lon: (selectedVessel.currentLon - 0.15).toFixed(3), sog: selectedVessel.sogKnots + 0.8, wave: "1.4m", note: "Departed Outer Channel" },
    { time: "2 hours ago", lat: (selectedVessel.currentLat - 0.22).toFixed(3), lon: (selectedVessel.currentLon - 0.26).toFixed(3), sog: "4.2", wave: "1.2m", note: "Harbor exit cleared" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950">
            Vessel GPS Tracking & Telemetry
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Vessel Switcher */}
          <select
            value={selectedVessel.id}
            onChange={(e) => {
              const v = activeVessels.find((item) => item.id === e.target.value);
              if (v) {
                setSelectedVessel(v);
                setSosActive(v.sosActive);
              }
            }}
            className="h-8 rounded-md border border-zinc-200 bg-white px-2.5 text-xs font-semibold text-zinc-800 shadow-xs focus-visible:ring-zinc-900"
          >
            {activeVessels.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.vesselType.split(" ")[0]})
              </option>
            ))}
          </select>

          <Button
            size="sm"
            onClick={handleToggleSos}
            className={`text-xs h-8 gap-1.5 font-semibold ${
              sosActive
                ? "bg-rose-600 hover:bg-rose-700 text-white animate-pulse"
                : "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
            }`}
          >
            <LifeBuoy className="h-3.5 w-3.5" />
            <span>{sosActive ? "SOS BROADCASTING" : "Distress SOS Beacon"}</span>
          </Button>
        </div>
      </div>

      {/* Primary Vessel HUD Card */}
      <Card className="border-zinc-200 bg-white shadow-xs">
        <CardHeader className="pb-3 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-xl font-bold text-zinc-950">
              {selectedVessel.name}
            </CardTitle>
            <p className="text-xs text-zinc-500">
              {selectedVessel.vesselType} • Home Port: {selectedVessel.homePort}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Badge
              variant="minimal"
              className={
                selectedVessel.geofenceStatus === "SAFE"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200 font-bold"
              }
            >
              Geofence: {selectedVessel.geofenceStatus}
            </Badge>
            <span className="font-sans text-[11px] text-zinc-400">
              Ping: {selectedVessel.lastPingTime}
            </span>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-6">
          {/* Telemetry Metric Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 font-sans text-xs">
            <div className="p-3 rounded-lg border border-zinc-200 bg-zinc-50">
              <span className="text-zinc-400 text-[10px] block uppercase">Current Lat/Lon</span>
              <span className="font-bold text-zinc-950 text-sm">
                {selectedVessel.currentLat.toFixed(3)}°N
              </span>
              <span className="text-[11px] text-zinc-500 block">
                {selectedVessel.currentLon.toFixed(3)}°E
              </span>
            </div>

            <div className="p-3 rounded-lg border border-zinc-200 bg-zinc-50">
              <span className="text-zinc-400 text-[10px] block uppercase">Speed (SOG)</span>
              <span className="font-bold text-zinc-950 text-sm">
                {selectedVessel.sogKnots} kts
              </span>
              <span className="text-[11px] text-zinc-500 block">
                COG: {selectedVessel.cogDegrees}° ({selectedVessel.headingText})
              </span>
            </div>

            <div className="p-3 rounded-lg border border-zinc-200 bg-zinc-50">
              <span className="text-zinc-400 text-[10px] block uppercase">Fuel Remaining</span>
              <span className="font-bold text-zinc-950 text-sm">
                {selectedVessel.fuelRemainingLiters} L
              </span>
              <span className="text-[11px] text-zinc-500 block">
                of {selectedVessel.fuelCapacityLiters} L capacity
              </span>
            </div>

            <div className="p-3 rounded-lg border border-zinc-200 bg-zinc-50">
              <span className="text-zinc-400 text-[10px] block uppercase">Engine State</span>
              <span className="font-bold text-zinc-950 text-sm">
                {selectedVessel.engineRpm} RPM
              </span>
              <span className="text-[11px] text-emerald-600 block">Normal Torque</span>
            </div>

            <div className="p-3 rounded-lg border border-zinc-200 bg-zinc-50">
              <span className="text-zinc-400 text-[10px] block uppercase">Trip Elapsed</span>
              <span className="font-bold text-zinc-950 text-sm">
                {selectedVessel.tripDurationHours} hrs
              </span>
              <span className="text-[11px] text-zinc-500 block">
                Crew: {selectedVessel.crewCount} on board
              </span>
            </div>

            <div className="p-3 rounded-lg border border-zinc-200 bg-zinc-50">
              <span className="text-zinc-400 text-[10px] block uppercase">Distance to IMBL</span>
              <span
                className={`font-bold text-sm ${
                  selectedVessel.distanceToIMBLNM < 10 ? "text-amber-700" : "text-zinc-950"
                }`}
              >
                {selectedVessel.distanceToIMBLNM} NM
              </span>
              <span className="text-[11px] text-zinc-500 block">
                From Port: {selectedVessel.distanceFromPortNM} NM
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid: Localized Marine Environment (Left) + Breadcrumb History (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 1 Col: Local Conditions at Vessel Pinpoint */}
        <div className="space-y-4">
          <Card className="border-zinc-200">
            <CardHeader className="pb-3 border-b border-zinc-100">
              <CardTitle className="text-sm font-bold text-zinc-950">
                Ocean Conditions at Vessel Position
              </CardTitle>
              <p className="text-xs text-zinc-500">
                Derived from nearest ocean buoy and WRF model cell
              </p>
            </CardHeader>

            <CardContent className="pt-4 space-y-3 font-sans text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                <span className="text-zinc-500 flex items-center gap-1.5">
                  <Thermometer className="h-3.5 w-3.5 text-rose-500" />
                  Local SST:
                </span>
                <span className="font-bold text-zinc-900">{location.sst}°C</span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                <span className="text-zinc-500 flex items-center gap-1.5">
                  <Waves className="h-3.5 w-3.5 text-blue-500" />
                  Local Wave SWH:
                </span>
                <span className="font-bold text-zinc-900">{location.waveHeight}m ({location.wavePeriod}s)</span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                <span className="text-zinc-500 flex items-center gap-1.5">
                  <Wind className="h-3.5 w-3.5 text-sky-500" />
                  Local Wind:
                </span>
                <span className="font-bold text-zinc-900">{location.windSpeed} kts {location.windDirection}</span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                <span className="text-zinc-500 flex items-center gap-1.5">
                  <Navigation className="h-3.5 w-3.5 text-indigo-500" />
                  Surface Drift:
                </span>
                <span className="font-bold text-zinc-900">{location.currentSpeed} m/s {location.currentDirection}</span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-zinc-500">Local Risk State:</span>
                <Badge
                  variant="minimal"
                  className={
                    selectedVessel.riskRating === "Low"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold"
                      : "bg-amber-50 text-amber-700 border-amber-200 font-semibold"
                  }
                >
                  {selectedVessel.riskRating} Risk
                </Badge>
              </div>

              <div className="pt-3">
                <Link href="/app/map">
                  <Button variant="outline" size="sm" className="w-full text-xs h-8 border-zinc-200">
                    Track on Marine Map →
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right 2 Cols: Breadcrumb Trail & Track History */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-zinc-200">
            <CardHeader className="pb-3 border-b border-zinc-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-zinc-950">
                  Location & Voyage History
                </CardTitle>
                <p className="text-xs text-zinc-500">
                  GPS position trail logged at 15-minute intervals
                </p>
              </div>

              <span className="font-sans text-xs text-zinc-400">
                Buffer: Last 24 Hours
              </span>
            </CardHeader>

            <CardContent className="pt-4 overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-500 text-[11px] uppercase">
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Latitude / Longitude</th>
                    <th className="py-2.5 px-3">Speed (SOG)</th>
                    <th className="py-2.5 px-3">Sea State</th>
                    <th className="py-2.5 px-3">Waypoint Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-zinc-700">
                  {breadcrumbs.map((b, i) => (
                    <tr key={i} className="hover:bg-zinc-50">
                      <td className="py-2.5 px-3 text-zinc-500">{b.time}</td>
                      <td className="py-2.5 px-3 font-semibold text-zinc-900">
                        {b.lat}°N, {b.lon}°E
                      </td>
                      <td className="py-2.5 px-3 text-zinc-900">{b.sog} kts</td>
                      <td className="py-2.5 px-3 text-zinc-600">{b.wave}</td>
                      <td className="py-2.5 px-3 text-zinc-500 font-sans text-[11px]">
                        {b.note}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
