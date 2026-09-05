"use client";

import * as React from "react";
import Link from "next/link";
import { useMarine } from "@/lib/marine-context";
import { marineLocations, MarineLocation } from "@/lib/marine-data";
import { MarineSciencePanel } from "@/components/research/marine-science-panel";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CloudSun,
  Wind,
  Waves,
  Droplets,
  Thermometer,
  Gauge,
  Compass,
  ArrowUpRight,
  Sparkles,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";

export default function WeatherMarinePage() {
  const { location, setLocationId, setIsAiDrawerOpen, role } = useMarine();
  const [activeTab, setActiveTab] = React.useState<"hourly" | "7day">("hourly");
  const [selectedHourIndex, setSelectedHourIndex] = React.useState(0);

  const hourlyData = [
    { hour: "Now (08:00)", temp: location.weather.temp, wind: location.windSpeed, wave: location.waveHeight, rain: 10, swell: location.swellHeight, status: "Safe" },
    { hour: "10:00", temp: location.weather.temp + 0.8, wind: location.windSpeed + 1, wave: location.waveHeight, rain: 15, swell: location.swellHeight, status: "Safe" },
    { hour: "12:00", temp: location.weather.temp + 1.6, wind: location.windSpeed + 3, wave: location.waveHeight + 0.2, rain: 25, swell: location.swellHeight + 0.1, status: "Safe" },
    { hour: "14:00", temp: location.weather.temp + 1.2, wind: location.windSpeed + 4, wave: location.waveHeight + 0.4, rain: 30, swell: location.swellHeight + 0.2, status: "Moderate" },
    { hour: "16:00", temp: location.weather.temp + 0.4, wind: location.windSpeed + 2, wave: location.waveHeight + 0.3, rain: 20, swell: location.swellHeight + 0.2, status: "Safe" },
    { hour: "18:00", temp: location.weather.temp - 0.6, wind: location.windSpeed - 1, wave: location.waveHeight + 0.1, rain: 15, swell: location.swellHeight + 0.1, status: "Safe" },
    { hour: "20:00", temp: location.weather.temp - 1.2, wind: location.windSpeed - 2, wave: location.waveHeight, rain: 10, swell: location.swellHeight, status: "Safe" },
    { hour: "22:00", temp: location.weather.temp - 1.8, wind: location.windSpeed - 3, wave: location.waveHeight, rain: 5, swell: location.swellHeight, status: "Safe" },
  ];

  const sevenDayOutlook = [
    { day: "Today", condition: location.weather.condition, tempMax: Math.round(location.weather.temp + 1), tempMin: Math.round(location.weather.temp - 3), windMax: location.windSpeed + 4, waveMax: location.waveHeight + 0.3, risk: location.riskLevel },
    { day: "Tomorrow", condition: "Fair", tempMax: 30, tempMin: 25, windMax: 15, waveMax: 1.5, risk: "Low" },
    { day: "Day 3 (Wed)", condition: "Cloudy", tempMax: 29, tempMin: 24, windMax: 18, waveMax: 1.9, risk: "Moderate" },
    { day: "Day 4 (Thu)", condition: "Light Rain", tempMax: 28, tempMin: 24, windMax: 22, waveMax: 2.3, risk: "Moderate" },
    { day: "Day 5 (Fri)", condition: "Squally", tempMax: 27, tempMin: 23, windMax: 28, waveMax: 2.9, risk: "Elevated" },
    { day: "Day 6 (Sat)", condition: "Cloudy", tempMax: 29, tempMin: 24, windMax: 19, waveMax: 2.1, risk: "Moderate" },
    { day: "Day 7 (Sun)", condition: "Fair", tempMax: 30, tempMin: 25, windMax: 14, waveMax: 1.4, risk: "Low" },
  ];

  const currentHour = hourlyData[selectedHourIndex];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
        <div>
          <Link
            href="/app"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-950 mb-1 font-medium transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Dashboard</span>
          </Link>
          <h1 className="text-lg leading-snug sm:text-2xl lg:text-3xl font-bold tracking-tight text-zinc-950">
            Weather & Marine Conditions
          </h1>
        </div>

        {/* Stacked on a phone: side by side these two run off the screen. */}
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <select
            value={location.id}
            onChange={(e) => setLocationId(e.target.value)}
            className="h-9 w-full min-w-0 rounded-md border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-800 shadow-xs focus-visible:ring-zinc-900 sm:h-8 sm:w-auto"
          >
            {marineLocations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} ({l.sea})
              </option>
            ))}
          </select>

          <Button
            size="sm"
            onClick={() => setIsAiDrawerOpen(true)}
            className="h-9 w-full shrink-0 gap-1.5 bg-zinc-950 text-xs text-white hover:bg-zinc-800 sm:h-8 sm:w-auto"
          >
            <Sparkles className="h-3.5 w-3.5 text-zinc-300" />
            <span>AI Forecast Summary</span>
          </Button>
        </div>
      </div>

      {/* Atmospheric & Oceanographic Deep Metrics Cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
        {/* Metric 1: Temp & Condition */}
        <Card className="flex flex-col justify-between p-2.5 sm:p-3.5">
          <div className="flex items-center justify-between gap-1 font-sans text-[11px] text-zinc-500 sm:text-xs">
            <span className="truncate">Air Temp</span>
            <Thermometer className="h-3.5 w-3.5 shrink-0 text-amber-500 sm:h-4 sm:w-4" />
          </div>
          <div className="my-1.5">
            <div className="font-sans text-lg font-bold tabular-nums text-zinc-950 sm:text-2xl">
              {location.weather.temp}°C
            </div>
            <span className="font-sans text-[10px] text-zinc-500 sm:text-[11px]">
              {location.weather.condition}
            </span>
          </div>
          <div className="text-[10px] font-sans text-zinc-400">
            Humidity: {location.weather.humidity}%
          </div>
        </Card>

        {/* Metric 2: Wind Speed */}
        <Card className="flex flex-col justify-between p-2.5 sm:p-3.5">
          <div className="flex items-center justify-between gap-1 font-sans text-[11px] text-zinc-500 sm:text-xs">
            <span className="truncate">Wind (Sustained)</span>
            <Wind className="h-3.5 w-3.5 shrink-0 text-sky-500 sm:h-4 sm:w-4" />
          </div>
          <div className="my-1.5">
            <div className="font-sans text-lg font-bold tabular-nums text-zinc-950 sm:text-2xl">
              {location.windSpeed} <span className="text-xs font-normal font-sans text-zinc-500">kts</span>
            </div>
            <span className="font-sans text-[10px] text-zinc-500 sm:text-[11px]">
              Gusts to {location.windSpeed + 6} kts
            </span>
          </div>
          <div className="text-[10px] font-sans text-zinc-400">
            Vector: {location.windDirection} ({location.windDegrees}°)
          </div>
        </Card>

        {/* Metric 3: Wave Height (SWH) */}
        <Card className="flex flex-col justify-between p-2.5 sm:p-3.5">
          <div className="flex items-center justify-between gap-1 font-sans text-[11px] text-zinc-500 sm:text-xs">
            <span className="truncate">Wave Height (SWH)</span>
            <Waves className="h-3.5 w-3.5 shrink-0 text-blue-500 sm:h-4 sm:w-4" />
          </div>
          <div className="my-1.5">
            <div className="font-sans text-lg font-bold tabular-nums text-zinc-950 sm:text-2xl">
              {location.waveHeight} <span className="text-xs font-normal font-sans text-zinc-500">m</span>
            </div>
            <span className="font-sans text-[10px] text-zinc-500 sm:text-[11px]">
              Period: {location.wavePeriod}s
            </span>
          </div>
          <div className="text-[10px] font-sans text-zinc-400">
            State: {location.waveHeight > 2.0 ? "Rough" : "Moderate"}
          </div>
        </Card>

        {/* Metric 4: Swell State */}
        <Card className="flex flex-col justify-between p-2.5 sm:p-3.5">
          <div className="flex items-center justify-between gap-1 font-sans text-[11px] text-zinc-500 sm:text-xs">
            <span className="truncate">Primary Swell</span>
            <Compass className="h-3.5 w-3.5 shrink-0 text-teal-500 sm:h-4 sm:w-4" />
          </div>
          <div className="my-1.5">
            <div className="font-sans text-lg font-bold tabular-nums text-zinc-950 sm:text-2xl">
              {location.swellHeight} <span className="text-xs font-normal font-sans text-zinc-500">m</span>
            </div>
            <span className="font-sans text-[10px] text-zinc-500 sm:text-[11px]">
              Period: {location.swellPeriod}s
            </span>
          </div>
          <div className="text-[10px] font-sans text-zinc-400">
            Kallakkadal: None
          </div>
        </Card>

        {/* Metric 5: Surface Currents */}
        <Card className="flex flex-col justify-between p-2.5 sm:p-3.5">
          <div className="flex items-center justify-between gap-1 font-sans text-[11px] text-zinc-500 sm:text-xs">
            <span className="truncate">Surface Current</span>
            <Droplets className="h-3.5 w-3.5 shrink-0 text-indigo-500 sm:h-4 sm:w-4" />
          </div>
          <div className="my-1.5">
            <div className="font-sans text-lg font-bold tabular-nums text-zinc-950 sm:text-2xl">
              {location.currentSpeed} <span className="text-xs font-normal font-sans text-zinc-500">m/s</span>
            </div>
            <span className="font-sans text-[10px] text-zinc-500 sm:text-[11px]">
              ~{(location.currentSpeed * 1.94).toFixed(1)} knots
            </span>
          </div>
          <div className="text-[10px] font-sans text-zinc-400">
            Heading: {location.currentDirection}
          </div>
        </Card>

        {/* Metric 6: Atmospheric Pressure */}
        <Card className="flex flex-col justify-between p-2.5 sm:p-3.5">
          <div className="flex items-center justify-between gap-1 font-sans text-[11px] text-zinc-500 sm:text-xs">
            <span className="truncate">Barometer (MSLP)</span>
            <Gauge className="h-3.5 w-3.5 shrink-0 text-purple-500 sm:h-4 sm:w-4" />
          </div>
          <div className="my-1.5">
            <div className="font-sans text-lg font-bold tabular-nums text-zinc-950 sm:text-2xl">
              {location.weather.pressure}
            </div>
            <span className="font-sans text-[10px] text-zinc-500 sm:text-[11px]">hPa (millibars)</span>
          </div>
          <div className="font-sans text-[10px] text-emerald-600">
            Steady Trend
          </div>
        </Card>

        {/* Variables a researcher reads that a skipper does not need. */}
        {role === "researcher" && (
          <>
            <Card className="flex flex-col justify-between p-2.5 sm:p-3.5">
              <div className="flex items-center justify-between gap-1 font-sans text-[11px] text-zinc-500 sm:text-xs">
                <span className="truncate">Sea Surface Temp</span>
                <Thermometer className="h-3.5 w-3.5 shrink-0 text-rose-500 sm:h-4 sm:w-4" />
              </div>
              <div className="my-1.5">
                <div className="font-sans text-lg font-bold tabular-nums text-zinc-950 sm:text-2xl">
                  {location.sst}
                  <span className="font-sans text-xs font-normal text-zinc-500"> °C</span>
                </div>
                <span className="font-sans text-[10px] text-zinc-500 sm:text-[11px]">
                  Air–sea Δ {(location.sst - location.weather.temp).toFixed(1)} °C
                </span>
              </div>
              <div className="font-sans text-[10px] text-zinc-400">Skin temperature</div>
            </Card>

            <Card className="flex flex-col justify-between p-2.5 sm:p-3.5">
              <div className="flex items-center justify-between gap-1 font-sans text-[11px] text-zinc-500 sm:text-xs">
                <span className="truncate">Chlorophyll-a</span>
                <Droplets className="h-3.5 w-3.5 shrink-0 text-emerald-500 sm:h-4 sm:w-4" />
              </div>
              <div className="my-1.5">
                <div className="font-sans text-lg font-bold tabular-nums text-zinc-950 sm:text-2xl">
                  {location.chlorophyll}
                  <span className="font-sans text-xs font-normal text-zinc-500"> mg/m³</span>
                </div>
                <span className="font-sans text-[10px] text-zinc-500 sm:text-[11px]">
                  {location.chlorophyll > 0.8 ? "Bloom signature" : "Background"}
                </span>
              </div>
              <div className="font-sans text-[10px] text-zinc-400">Ocean colour proxy</div>
            </Card>

            <Card className="flex flex-col justify-between p-2.5 sm:p-3.5">
              <div className="flex items-center justify-between gap-1 font-sans text-[11px] text-zinc-500 sm:text-xs">
                <span className="truncate">Wave Period T02</span>
                <Clock className="h-3.5 w-3.5 shrink-0 text-blue-500 sm:h-4 sm:w-4" />
              </div>
              <div className="my-1.5">
                <div className="font-sans text-lg font-bold tabular-nums text-zinc-950 sm:text-2xl">
                  {location.wavePeriod}
                  <span className="font-sans text-xs font-normal text-zinc-500"> s</span>
                </div>
                <span className="font-sans text-[10px] text-zinc-500 sm:text-[11px]">
                  Swell {location.swellPeriod}s
                </span>
              </div>
              <div className="font-sans text-[10px] text-zinc-400">
                Wavelength {((9.81 * location.wavePeriod ** 2) / (2 * Math.PI)).toFixed(0)} m
              </div>
            </Card>

            <Card className="flex flex-col justify-between p-2.5 sm:p-3.5">
              <div className="flex items-center justify-between gap-1 font-sans text-[11px] text-zinc-500 sm:text-xs">
                <span className="truncate">Visibility</span>
                <CloudSun className="h-3.5 w-3.5 shrink-0 text-amber-500 sm:h-4 sm:w-4" />
              </div>
              <div className="my-1.5">
                <div className="font-sans text-lg font-bold tabular-nums text-zinc-950 sm:text-2xl">
                  {location.weather.visibility}
                  <span className="font-sans text-xs font-normal text-zinc-500"> km</span>
                </div>
                <span className="font-sans text-[10px] text-zinc-500 sm:text-[11px]">
                  RH {location.weather.humidity}%
                </span>
              </div>
              <div className="font-sans text-[10px] text-zinc-400">Horizontal, at the surface</div>
            </Card>
          </>
        )}
      </div>

      {/* Derived physics — researchers only */}
      {role === "researcher" && (
        <MarineSciencePanel
          location={location}
          hours={hourlyData.map((item) => ({
            hour: item.hour,
            wind: item.wind,
            wave: item.wave,
            swell: item.swell,
            temp: item.temp,
          }))}
        />
      )}

      {/* Forecast Timeline Section */}
      <Card className="border-zinc-200">
        <CardHeader className="flex flex-col items-stretch gap-2 border-b border-zinc-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-sm font-bold text-zinc-950 sm:text-base">
            Marine Forecast Dynamics
          </CardTitle>

          <div className="flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-100 p-1 text-xs">
            <button
              onClick={() => setActiveTab("hourly")}
              className={`flex-1 cursor-pointer rounded px-2 py-1 text-[11px] font-medium transition-all sm:flex-none sm:px-3 sm:text-xs ${
                activeTab === "hourly"
                  ? "bg-white font-semibold text-zinc-950 shadow-xs"
                  : "text-zinc-600 hover:text-zinc-950"
              }`}
            >
              24-Hour Timeline
            </button>
            <button
              onClick={() => setActiveTab("7day")}
              className={`flex-1 cursor-pointer rounded px-2 py-1 text-[11px] font-medium transition-all sm:flex-none sm:px-3 sm:text-xs ${
                activeTab === "7day"
                  ? "bg-white font-semibold text-zinc-950 shadow-xs"
                  : "text-zinc-600 hover:text-zinc-950"
              }`}
            >
              7-Day Extended
            </button>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {activeTab === "hourly" && (
            <div className="space-y-6">
              {/* Hourly Scrub Blocks */}
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-4 sm:gap-2 md:grid-cols-8">
                {hourlyData.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedHourIndex(idx)}
                      className={`flex min-w-0 cursor-pointer flex-col justify-between overflow-hidden rounded-lg border p-2 text-left transition-all sm:p-3 ${
                      selectedHourIndex === idx
                        ? "border-zinc-900 bg-zinc-900 text-white shadow-xs"
                        : "border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-900"
                    }`}
                  >
                    <span className="mb-1 block truncate font-sans text-[9px] text-zinc-400 sm:text-[10px]">
                      {item.hour}
                    </span>
                    <div>
                      <div className="font-sans text-[13px] font-bold tabular-nums sm:text-sm">
                        {item.wave.toFixed(1)}m
                      </div>
                      <div className="font-sans text-[10px] tabular-nums opacity-80 sm:text-[11px]">
                        {item.wind} kts
                      </div>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between gap-1 border-t border-zinc-200/40 pt-1 font-sans text-[9px] sm:mt-2 sm:text-[10px]">
                      <span className="truncate">Rain {item.rain}%</span>
                      <span className={item.status === "Safe" ? "text-emerald-400" : "text-amber-400"}>
                        ●
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Detail view of selected hour */}
              <div className="flex flex-col justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 font-sans text-xs sm:flex-row sm:items-center sm:gap-4 sm:p-4">
                <div>
                  <span className="mb-1 block font-sans text-[13px] font-semibold text-zinc-900 sm:text-sm">
                    Forecast Details for {currentHour.hour} ({location.name})
                  </span>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-zinc-600 sm:gap-3 sm:text-xs">
                    <span>Wave: <strong className="text-zinc-950">{currentHour.wave.toFixed(1)}m SWH</strong></span>
                    <span>•</span>
                    <span>Wind: <strong className="text-zinc-950">{currentHour.wind} kts</strong></span>
                    <span>•</span>
                    <span>Swell: <strong className="text-zinc-950">{currentHour.swell}m</strong></span>
                    <span>•</span>
                    <span>Precipitation Risk: <strong className="text-zinc-950">{currentHour.rain}%</strong></span>
                  </div>
                </div>

                <Badge
                  className={`shrink-0 self-start whitespace-nowrap sm:self-auto ${
                    currentHour.status === "Safe"
                      ? "bg-emerald-600 text-white"
                      : "bg-amber-600 text-white"
                  }`}
                >
                  {currentHour.status} Sea State
                </Badge>
              </div>
            </div>
          )}

          {activeTab === "7day" && (
            <div className="divide-y divide-zinc-200 border border-zinc-200 rounded-lg overflow-hidden text-xs">
              {sevenDayOutlook.map((d, i) => (
                <div
                  key={i}
                  className="flex flex-col justify-between gap-2 bg-white p-3 transition-colors hover:bg-zinc-50 sm:flex-row sm:items-center sm:gap-3 sm:p-3.5"
                >
                  <div className="flex items-center gap-3 sm:w-48 sm:gap-4">
                    <span className="w-20 shrink-0 font-semibold text-zinc-900 sm:w-24">{d.day}</span>
                    <Badge variant="minimal" className="text-[10px]">
                      {d.condition}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 font-sans text-[10px] text-zinc-600 sm:gap-6 sm:text-[11px]">
                    <span>Temp: {d.tempMin}° / {d.tempMax}°C</span>
                    <span>Max Wind: {d.windMax} kts</span>
                    <span>Max Wave: {d.waveMax.toFixed(1)} m</span>
                  </div>

                  <Badge
                    variant="minimal"
                    className={
                      "shrink-0 self-start sm:self-auto " +
                      (d.risk === "Low"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : d.risk === "Moderate"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-rose-50 text-rose-700 border-rose-200")
                    }
                  >
                    {d.risk} Risk
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Astronomical Tide Station Schedule */}
      <Card className="border-zinc-200">
        <CardHeader className="border-b border-zinc-100 pb-3">
          <div className="flex items-start gap-2">
            <Waves className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
            <CardTitle className="text-[13px] font-bold leading-snug text-zinc-950 sm:text-sm">
              Astronomical Tide Table: {location.name} Tide Gauge
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 gap-2 text-center font-sans text-xs sm:grid-cols-4 sm:gap-3">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2.5 sm:p-3">
              <span className="text-zinc-400 text-[10px] block">High Tide 1</span>
              <span className="text-[13px] font-bold tabular-nums text-zinc-900 sm:text-sm">08:42 AM</span>
              <span className="text-emerald-600 text-[11px] block">+1.35 meters</span>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2.5 sm:p-3">
              <span className="text-zinc-400 text-[10px] block">Low Tide 1</span>
              <span className="text-[13px] font-bold tabular-nums text-zinc-900 sm:text-sm">02:50 PM</span>
              <span className="text-zinc-600 text-[11px] block">+0.28 meters</span>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2.5 sm:p-3">
              <span className="text-zinc-400 text-[10px] block">High Tide 2</span>
              <span className="text-[13px] font-bold tabular-nums text-zinc-900 sm:text-sm">09:15 PM</span>
              <span className="text-emerald-600 text-[11px] block">+1.42 meters</span>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2.5 sm:p-3">
              <span className="text-zinc-400 text-[10px] block">Low Tide 2</span>
              <span className="text-[13px] font-bold tabular-nums text-zinc-900 sm:text-sm">03:30 AM (Tom.)</span>
              <span className="text-zinc-600 text-[11px] block">+0.32 meters</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
