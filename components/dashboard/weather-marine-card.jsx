"use client";

import * as React from "react";
import Link from "next/link";
import {
  CloudSun,
  Wind,
  Waves,
  Thermometer,
  Compass,
  ArrowRight,
  Droplets,
  Gauge,
  Calendar,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { useT } from "@/lib/i18n";
import { conditionLabel, riskLevelLabel } from "@/components/fisherman/speech-text";

export function WeatherMarineCard({ location }) {
  const { t } = useT();

  const threeDayOutlook = [
    {
      day: t("w.today"),
      condition: location.weather.condition,
      temp: `${location.weather.temp}°C`,
      wind: `${location.windSpeed} kts`,
      wave: `${location.waveHeight}m`,
      risk: location.riskLevel,
      safe: location.riskLevel === "Low" || location.riskLevel === "Moderate",
    },
    {
      day: t("w.tomorrow"),
      condition: "Fair",
      temp: "29°C",
      wind: "12 kts NE",
      wave: "1.4m",
      risk: "Low",
      safe: true,
      window: "04:30 - 13:30 IST",
    },
    {
      day: t("w.day3"),
      condition: "Cloudy",
      temp: "28°C",
      wind: "18 kts ENE",
      wave: "1.9m",
      risk: "Moderate",
      safe: true,
      note: "Swell rising",
    },
  ];

  return (
    <Card className="border-zinc-200 bg-white">
      <CardHeader className="pb-3 border-b border-zinc-100 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-amber-50 border border-amber-200/80 text-amber-600">
            <CloudSun className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm sm:text-base font-semibold text-zinc-950">
              {t("w.title")}
            </CardTitle>
            <p className="text-[11px] text-zinc-500">
              {location.name} • {location.sea}
            </p>
          </div>
        </div>

        {/* Know More Button at Header */}
        <Link href="/app/weather">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7.5 px-3 border-zinc-200 hover:bg-zinc-100 text-zinc-800 font-medium gap-1 cursor-pointer"
          >
            <span>{t("dash.knowMore")}</span>
            <ArrowRight className="h-3 w-3 text-zinc-500" />
          </Button>
        </Link>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Core Sea State & Atmospheric Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-sans">
          {/* Temperature & Condition */}
          <div className="p-3 rounded-xl border border-zinc-200/80 bg-zinc-50/60 space-y-1">
            <div className="flex items-center justify-between text-zinc-500 text-[10px]">
              <span className="font-semibold uppercase tracking-wider">
                {t("w.airSky")}
              </span>
              <Thermometer className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <div className="text-base font-bold text-zinc-950">
              {location.weather.temp}°C
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-600">
              <span className="font-medium text-zinc-900">
                {conditionLabel(t, location.weather.condition)}
              </span>
              <span>•</span>
              <span>{location.weather.humidity}% hum</span>
            </div>
          </div>

          {/* Wind Vector */}
          <div className="p-3 rounded-xl border border-zinc-200/80 bg-zinc-50/60 space-y-1">
            <div className="flex items-center justify-between text-zinc-500 text-[10px]">
              <span className="font-semibold uppercase tracking-wider">
                {t("w.surfaceWind")}
              </span>
              <Wind className="h-3.5 w-3.5 text-sky-500" />
            </div>
            <div className="text-base font-bold text-zinc-950">
              {location.windSpeed}{" "}
              <span className="text-xs font-normal text-zinc-600">kts</span>
            </div>
            <div className="text-[11px] text-zinc-600">
              Direction:{" "}
              <span className="font-semibold text-zinc-900">
                {location.windDirection}
              </span>{" "}
              ({location.windDegrees}°)
            </div>
          </div>

          {/* Waves & Swell */}
          <div className="p-3 rounded-xl border border-zinc-200/80 bg-zinc-50/60 space-y-1">
            <div className="flex items-center justify-between text-zinc-500 text-[10px]">
              <span className="font-semibold uppercase tracking-wider">
                {t("w.waveSwell")}
              </span>
              <Waves className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <div className="text-base font-bold text-zinc-950">
              {location.waveHeight}m{" "}
              <span className="text-xs font-normal text-zinc-600">SWH</span>
            </div>
            <div className="text-[11px] text-zinc-600">
              Period:{" "}
              <span className="font-semibold text-zinc-900">{location.wavePeriod}s</span>{" "}
              • Swell: {location.swellHeight}m
            </div>
          </div>

          {/* Tide & Current Drift */}
          <div className="p-3 rounded-xl border border-zinc-200/80 bg-zinc-50/60 space-y-1">
            <div className="flex items-center justify-between text-zinc-500 text-[10px]">
              <span className="font-semibold uppercase tracking-wider">
                {t("w.tideDrift")}
              </span>
              <Compass className="h-3.5 w-3.5 text-indigo-500" />
            </div>
            <div className="text-base font-bold text-zinc-950">{location.tideStatus}</div>
            <div className="text-[11px] text-zinc-600 truncate">
              High:{" "}
              <span className="font-semibold text-zinc-900">
                {location.nextHighTide.split(" ")[0]}
              </span>{" "}
              • {location.currentSpeed} m/s
            </div>
          </div>
        </div>

        {/* 3-Day Fisherman Marine Outlook Strip */}
        <div className="p-3 rounded-xl border border-zinc-200 bg-zinc-50/40 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-zinc-500 font-sans">
            <span className="font-semibold text-zinc-700 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-zinc-500" />
              {t("w.outlook")}
            </span>
            <span className="text-[10px] text-zinc-400">INCOIS WaveWatch III</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {threeDayOutlook.map((item, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-lg border border-zinc-200/80 bg-white space-y-1 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-950 text-xs">{item.day}</span>
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1.5 py-0 ${
                      item.risk === "Low"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-medium"
                        : "bg-amber-50 text-amber-700 border-amber-200 font-medium"
                    }`}
                  >
                    {riskLevelLabel(t, item.risk)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-600 pt-0.5">
                  <span>{conditionLabel(t, item.condition)}</span>
                  <span className="font-medium text-zinc-900">{item.temp}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-0.5 border-t border-zinc-100">
                  <span>
                    {t("cond.waves")}: {item.wave}
                  </span>
                  <span>
                    {t("cond.wind")}: {item.wind}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Safe Departure Window Advisory */}
        <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200/80 text-xs text-emerald-950">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
          <div className="flex-1 text-[11px] leading-snug">
            <span className="font-semibold text-emerald-900">
              {t("w.safeDeparture")}:
            </span>{" "}
            <strong>04:30 – 13:30 IST</strong> ({location.waveHeight} m).{" "}
            {t("w.safeDepartureBody")}
          </div>
        </div>

        {/* Bottom Know More Button */}
        <Link href="/app/weather" className="block pt-1">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs h-8 border-zinc-200 hover:bg-zinc-100 text-zinc-800 font-medium flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>{t("dash.knowMore")}</span>
            <ArrowRight className="h-3.5 w-3.5 text-zinc-600" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
