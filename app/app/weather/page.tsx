"use client";

import * as React from "react";
import { useMarine } from "@/lib/marine-context";
import { marineLocations, MarineLocation } from "@/lib/marine-data";
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
} from "lucide-react";

export default function WeatherMarinePage() {
  const { location, setLocationId, setIsAiDrawerOpen } = useMarine();
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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950">
            Weather & Marine Conditions
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Location Selector */}
          <select
            value={location.id}
            onChange={(e) => setLocationId(e.target.value)}
            className="h-8 rounded-md border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-800 shadow-xs focus-visible:ring-zinc-900"
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
            className="text-xs h-8 bg-zinc-950 hover:bg-zinc-800 text-white gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5 text-zinc-300" />
            <span>AI Forecast Summary</span>
          </Button>
        </div>
      </div>

      {/* Atmospheric & Oceanographic Deep Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Metric 1: Temp & Condition */}
        <Card className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 text-xs font-sans">
            <span>Air Temp</span>
            <Thermometer className="h-4 w-4 text-amber-500" />
          </div>
          <div className="my-1.5">
            <div className="text-2xl font-bold font-sans text-zinc-950">
              {location.weather.temp}°C
            </div>
            <span className="text-[11px] text-zinc-500 font-sans">
              {location.weather.condition}
            </span>
          </div>
          <div className="text-[10px] font-sans text-zinc-400">
            Humidity: {location.weather.humidity}%
          </div>
        </Card>

        {/* Metric 2: Wind Speed */}
        <Card className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 text-xs font-sans">
            <span>Wind (Sustained)</span>
            <Wind className="h-4 w-4 text-sky-500" />
          </div>
          <div className="my-1.5">
            <div className="text-2xl font-bold font-sans text-zinc-950">
              {location.windSpeed} <span className="text-xs font-normal font-sans text-zinc-500">kts</span>
            </div>
            <span className="text-[11px] text-zinc-500 font-sans">
              Gusts to {location.windSpeed + 6} kts
            </span>
          </div>
          <div className="text-[10px] font-sans text-zinc-400">
            Vector: {location.windDirection} ({location.windDegrees}°)
          </div>
        </Card>

        {/* Metric 3: Wave Height (SWH) */}
        <Card className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 text-xs font-sans">
            <span>Wave Height (SWH)</span>
            <Waves className="h-4 w-4 text-blue-500" />
          </div>
          <div className="my-1.5">
            <div className="text-2xl font-bold font-sans text-zinc-950">
              {location.waveHeight} <span className="text-xs font-normal font-sans text-zinc-500">m</span>
            </div>
            <span className="text-[11px] text-zinc-500 font-sans">
              Period: {location.wavePeriod}s
            </span>
          </div>
          <div className="text-[10px] font-sans text-zinc-400">
            State: {location.waveHeight > 2.0 ? "Rough" : "Moderate"}
          </div>
        </Card>

        {/* Metric 4: Swell State */}
        <Card className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 text-xs font-sans">
            <span>Primary Swell</span>
            <Compass className="h-4 w-4 text-teal-500" />
          </div>
          <div className="my-1.5">
            <div className="text-2xl font-bold font-sans text-zinc-950">
              {location.swellHeight} <span className="text-xs font-normal font-sans text-zinc-500">m</span>
            </div>
            <span className="text-[11px] text-zinc-500 font-sans">
              Period: {location.swellPeriod}s
            </span>
          </div>
          <div className="text-[10px] font-sans text-zinc-400">
            Kallakkadal: None
          </div>
        </Card>

        {/* Metric 5: Surface Currents */}
        <Card className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 text-xs font-sans">
            <span>Surface Current</span>
            <Droplets className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="my-1.5">
            <div className="text-2xl font-bold font-sans text-zinc-950">
              {location.currentSpeed} <span className="text-xs font-normal font-sans text-zinc-500">m/s</span>
            </div>
            <span className="text-[11px] text-zinc-500 font-sans">
              ~{(location.currentSpeed * 1.94).toFixed(1)} knots
            </span>
          </div>
          <div className="text-[10px] font-sans text-zinc-400">
            Heading: {location.currentDirection}
          </div>
        </Card>

        {/* Metric 6: Atmospheric Pressure */}
        <Card className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 text-xs font-sans">
            <span>Barometer (MSLP)</span>
            <Gauge className="h-4 w-4 text-purple-500" />
          </div>
          <div className="my-1.5">
            <div className="text-2xl font-bold font-sans text-zinc-950">
              {location.weather.pressure}
            </div>
            <span className="text-[11px] text-zinc-500 font-sans">hPa (millibars)</span>
          </div>
          <div className="text-[10px] font-sans text-emerald-600">
            Steady Trend
          </div>
        </Card>
      </div>

      {/* Forecast Timeline Section */}
      <Card className="border-zinc-200">
        <CardHeader className="pb-3 border-b border-zinc-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-zinc-950">
              Marine Forecast Dynamics
            </CardTitle>
          </div>

          <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-md border border-zinc-200 text-xs">
            <button
              onClick={() => setActiveTab("hourly")}
              className={`px-3 py-1 rounded text-xs font-medium cursor-pointer transition-all ${
                activeTab === "hourly"
                  ? "bg-white text-zinc-950 font-semibold shadow-xs"
                  : "text-zinc-600 hover:text-zinc-950"
              }`}
            >
              24-Hour Timeline
            </button>
            <button
              onClick={() => setActiveTab("7day")}
              className={`px-3 py-1 rounded text-xs font-medium cursor-pointer transition-all ${
                activeTab === "7day"
                  ? "bg-white text-zinc-950 font-semibold shadow-xs"
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
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
                {hourlyData.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedHourIndex(idx)}
                      className={`min-w-0 overflow-hidden p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      selectedHourIndex === idx
                        ? "border-zinc-900 bg-zinc-900 text-white shadow-xs"
                        : "border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-900"
                    }`}
                  >
                    <span className="font-sans text-[10px] text-zinc-400 block mb-1">
                      {item.hour}
                    </span>
                    <div>
                      <div className="font-bold text-sm font-sans">{item.wave.toFixed(1)}m</div>
                      <div className="text-[11px] font-sans opacity-80">{item.wind} kts</div>
                    </div>
                    <div className="mt-2 pt-1 border-t border-zinc-200/40 flex items-center justify-between text-[10px] font-sans">
                      <span>Rain: {item.rain}%</span>
                      <span className={item.status === "Safe" ? "text-emerald-400" : "text-amber-400"}>
                        ●
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Detail view of selected hour */}
              <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-sans">
                <div>
                  <span className="font-semibold text-zinc-900 text-sm font-sans block mb-1">
                    Forecast Details for {currentHour.hour} ({location.name})
                  </span>
                  <div className="flex flex-wrap items-center gap-3 text-zinc-600 text-xs">
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
                  className={
                    currentHour.status === "Safe"
                      ? "bg-emerald-600 text-white"
                      : "bg-amber-600 text-white"
                  }
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
                  className="p-3.5 bg-white hover:bg-zinc-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-4 sm:w-48">
                    <span className="font-semibold text-zinc-900 w-24">{d.day}</span>
                    <Badge variant="minimal" className="text-[10px]">
                      {d.condition}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-6 font-sans text-[11px] text-zinc-600">
                    <span>Temp: {d.tempMin}° / {d.tempMax}°C</span>
                    <span>Max Wind: {d.windMax} kts</span>
                    <span>Max Wave: {d.waveMax.toFixed(1)} m</span>
                  </div>

                  <Badge
                    variant="minimal"
                    className={
                      d.risk === "Low"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : d.risk === "Moderate"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-rose-50 text-rose-700 border-rose-200"
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
        <CardHeader className="pb-3 border-b border-zinc-100 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Waves className="h-4 w-4 text-blue-600" />
            <CardTitle className="text-sm font-bold text-zinc-950">
              Astronomical Tide Table: {location.name} Tide Gauge
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs font-sans">
            <div className="p-3 rounded-lg border border-zinc-200 bg-zinc-50">
              <span className="text-zinc-400 text-[10px] block">High Tide 1</span>
              <span className="text-sm font-bold text-zinc-900">08:42 AM</span>
              <span className="text-emerald-600 text-[11px] block">+1.35 meters</span>
            </div>
            <div className="p-3 rounded-lg border border-zinc-200 bg-zinc-50">
              <span className="text-zinc-400 text-[10px] block">Low Tide 1</span>
              <span className="text-sm font-bold text-zinc-900">02:50 PM</span>
              <span className="text-zinc-600 text-[11px] block">+0.28 meters</span>
            </div>
            <div className="p-3 rounded-lg border border-zinc-200 bg-zinc-50">
              <span className="text-zinc-400 text-[10px] block">High Tide 2</span>
              <span className="text-sm font-bold text-zinc-900">09:15 PM</span>
              <span className="text-emerald-600 text-[11px] block">+1.42 meters</span>
            </div>
            <div className="p-3 rounded-lg border border-zinc-200 bg-zinc-50">
              <span className="text-zinc-400 text-[10px] block">Low Tide 2</span>
              <span className="text-sm font-bold text-zinc-900">03:30 AM (Tom.)</span>
              <span className="text-zinc-600 text-[11px] block">+0.32 meters</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
