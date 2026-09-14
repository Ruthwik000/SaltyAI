"use client";

/**
 * Weather & sea: live INCOIS sea state and Open-Meteo air weather now, the
 * next 24 hours, seven days, tides, and (for researchers) the derived physics.
 */

import * as React from "react";
import { ArrowUpRight } from "lucide-react";
import { useMarine } from "@/lib/marine-context";
import { fetchForecast, fetchPointConditions } from "@/lib/fisherman-api";
import { MarineSciencePanel } from "@/components/research/marine-science-panel";
import { Figure, ForecastLine, SectionHead, num } from "@/components/ui/swiss";

const METRICS = [
  { key: "wave", label: "Waves", unit: "m", digits: 2 },
  { key: "swell", label: "Swell", unit: "m", digits: 2 },
  { key: "wind", label: "Wind", unit: "kts", digits: 0 },
  { key: "rain", label: "Rain", unit: "%", digits: 0 },
  { key: "temp", label: "Air", unit: "°C", digits: 1 },
];

const RISK_COLOUR = { Low: "#0e7a4b", Safe: "#0e7a4b", Moderate: "#c26a00", High: "#d0182a" };

function localTime(value, options) {
  return value ? new Date(value).toLocaleString([], options) : "—";
}

export default function WeatherMarinePage() {
  const { location, openAiDrawer, role } = useMarine();
  const coastKey = `${location.lat},${location.lon}`;

  const [conditions, setConditions] = React.useState({ key: null, data: null, source: null });
  const [forecast, setForecast] = React.useState({ key: null, data: null });
  const [metricKey, setMetricKey] = React.useState("wave");

  React.useEffect(() => {
    const controller = new AbortController();
    fetchPointConditions(location.lat, location.lon, controller.signal).then((response) => {
      if (!controller.signal.aborted) setConditions({ key: coastKey, data: response.data, source: response.source });
    });
    fetchForecast(location.lat, location.lon, controller.signal).then((response) => {
      if (!controller.signal.aborted) setForecast({ key: coastKey, data: response.data });
    });
    return () => controller.abort();
  }, [location.lat, location.lon, coastKey]);

  const now = conditions.key === coastKey && conditions.source === "live" ? conditions.data : null;
  const forecastData = forecast.key === coastKey ? forecast.data : null;
  const hours = forecastData?.hourly || [];
  const days = forecastData?.daily || [];
  const tides = forecastData?.tides?.turningPoints || [];
  const metric = METRICS.find((item) => item.key === metricKey) || METRICS[0];

  // The physics panel works from a location record; give it live readings
  // wherever they exist, and only the bundled values where they do not.
  const scienceLocation = React.useMemo(() => {
    const pick = (value, fallback) => (value === null || value === undefined ? fallback : value);
    return {
      ...location,
      sst: pick(now?.sst, location.sst),
      waveHeight: pick(now?.waveHeight, location.waveHeight),
      wavePeriod: pick(now?.wavePeriod, location.wavePeriod),
      swellHeight: pick(now?.swellHeight, location.swellHeight),
      windSpeed: pick(now?.windSpeed, location.windSpeed),
      weather: { ...location.weather, temp: pick(now?.airTemp, location.weather.temp) },
    };
  }, [location, now]);
  const scienceHours = hours
    .filter((hour) => hour.wave != null && hour.swell != null && hour.wind != null)
    .map((hour) => ({
      hour: hour.hour,
      wind: hour.wind,
      wave: hour.wave,
      swell: hour.swell,
      temp: hour.temp ?? scienceLocation.weather.temp,
    }));

  return (
    <div className="space-y-12 lg:space-y-16">
      <header className="grid gap-4 border-b border-[#0b0b0c] pb-6 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-8">
          <span className="sw-index">Weather · {location.name}</span>
          <h1 className="sw-page-title mt-2">Weather &amp; sea</h1>
        </div>
        <div className="flex items-end lg:col-span-4 lg:justify-end">
          <button
            type="button"
            onClick={() =>
              openAiDrawer(
                `Summarise the sea and weather at ${location.name} now and over the next 24 hours: waves, swell, wind, current, tides, thunderstorms, and whether it is safe to go out.`
              )
            }
            className="sw-press inline-flex h-11 items-center gap-2 rounded-[2px] bg-[#0b0b0c] px-5 text-sm font-semibold text-white hover:bg-[#3a393e]"
          >
            Ask agent <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </header>

      {/* 01 — now */}
      <section>
        <SectionHead
          index="01"
          title="Now"
          aside={
            <span className="sw-label">
              {conditions.key !== coastKey
                ? "Loading"
                : now
                  ? `${localTime(now.observedAt, { hour: "2-digit", minute: "2-digit" })} · INCOIS / Open-Meteo`
                  : "Not available"}
            </span>
          }
        />
        <div className="grid grid-cols-2 gap-px border border-[#dcd9d1] bg-[#dcd9d1] md:grid-cols-3 xl:grid-cols-6">
          <Figure label={now?.condition ? `Air · ${now.condition}` : "Air"} value={num(now?.airTemp, 1)} unit="°C" />
          <Figure label="Wind" value={num(now?.windSpeed, 0)} unit={now?.windDirection ? `kts ${now.windDirection}` : "kts"} />
          <Figure label="Waves" value={num(now?.waveHeight, 2)} unit="m" />
          <Figure label="Swell" value={num(now?.swellHeight, 2)} unit="m" />
          <Figure label="Current" value={num(now?.currentSpeed, 2)} unit="m/s" />
          <Figure label="Sea temp" value={num(now?.sst, 1)} unit="°C" />
        </div>
        {now?.lightningRisk && (
          <p className="sw-label mt-3">
            Humidity {num(now.humidity, 0)}% · Lightning: {now.lightningRisk}
          </p>
        )}
      </section>

      {/* 02 — next 24 hours */}
      <section>
        <SectionHead
          index="02"
          title="Next 24 hours"
          aside={
            <div role="tablist" className="flex flex-wrap border border-[#0b0b0c]">
              {METRICS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="tab"
                  aria-selected={item.key === metricKey}
                  onClick={() => setMetricKey(item.key)}
                  className={`sw-press px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                    item.key === metricKey ? "bg-[#0b0b0c] text-white" : "hover:bg-white"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          }
        />
        <div className="sw-panel p-4 sm:p-6">
          {forecastData ? (
            <ForecastLine hours={hours} metric={metric} />
          ) : (
            <p className="py-16 text-center text-sm text-[#6d6c70]">
              {forecast.key === coastKey ? "Forecast not available" : "Loading forecast"}
            </p>
          )}
        </div>
        {hours.length > 0 && (
          <ol className="mt-px grid auto-cols-[minmax(7.5rem,1fr)] grid-flow-col gap-px overflow-x-auto border border-[#dcd9d1] bg-[#dcd9d1]">
            {hours.map((hour) => (
              <li key={hour.time} className="bg-white p-3">
                <span className="sw-label block">{String(hour.hour).replace("Now ", "Now · ")}</span>
                <span className="sw-num mt-2 block text-2xl font-semibold tracking-[-0.03em]">
                  {num(hour.wave, 1)}
                  <span className="ml-1 text-sm font-medium text-[#6d6c70]">m</span>
                </span>
                <span className="sw-num block text-sm text-[#3a393e]">
                  {num(hour.wind, 0)} kts · {num(hour.rain, 0)}%
                </span>
                <span
                  className="mt-2 block text-[11px] font-semibold uppercase tracking-[0.12em]"
                  style={{ color: RISK_COLOUR[hour.status] || "#0b0b0c" }}
                >
                  {hour.status}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
        {/* 03 — seven days */}
        <section className="min-w-0 lg:col-span-8">
          <SectionHead index="03" title="Seven days" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm tabular-nums">
              <thead>
                <tr className="border-b border-[#0b0b0c] text-[11px] uppercase tracking-[0.12em] text-[#6d6c70]">
                  <th className="py-3 pr-4 font-semibold">Day</th>
                  <th className="px-2 py-3 text-right font-semibold">Wave</th>
                  <th className="px-2 py-3 text-right font-semibold">Wind</th>
                  <th className="px-2 py-3 text-right font-semibold">Air</th>
                  <th className="px-2 py-3 text-right font-semibold">Rain</th>
                  <th className="py-3 pl-2 text-right font-semibold">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dcd9d1]">
                {days.map((day) => (
                  <tr key={day.date}>
                    <td className="py-3 pr-4">
                      <span className="block font-semibold">{day.day}</span>
                      <span className="block text-xs capitalize text-[#6d6c70]">{day.condition}</span>
                    </td>
                    <td className="px-2 py-3 text-right">{num(day.waveMax, 1)} m</td>
                    <td className="px-2 py-3 text-right">{num(day.windMax, 0)} kts</td>
                    <td className="px-2 py-3 text-right">
                      {num(day.tempMin, 0)}–{num(day.tempMax, 0)}°
                    </td>
                    <td className="px-2 py-3 text-right">{num(day.rainMax, 0)}%</td>
                    <td className="py-3 pl-2 text-right font-semibold" style={{ color: RISK_COLOUR[day.risk] || "#0b0b0c" }}>
                      {day.risk}
                    </td>
                  </tr>
                ))}
                {days.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-[#6d6c70]">
                      {forecast.key === coastKey ? "Not available" : "Loading"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* 04 — tides */}
        <section className="min-w-0 lg:col-span-4">
          <SectionHead index="04" title="Tides" aside={<span className="sw-label">Open-Meteo</span>} />
          {tides.length === 0 ? (
            <p className="py-4 text-[#6d6c70]">{forecast.key === coastKey ? "Not available" : "Loading"}</p>
          ) : (
            <ul className="divide-y divide-[#dcd9d1] border-b border-[#dcd9d1]">
              {tides.slice(0, 4).map((point) => (
                <li key={point.time} className="flex items-baseline justify-between gap-4 py-3">
                  <span>
                    <span className="sw-label block">{point.kind === "high" ? "High water" : "Low water"}</span>
                    <span className="sw-num mt-1 block text-2xl font-semibold tracking-[-0.03em]">
                      {localTime(point.time, { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </span>
                  <span className="sw-num text-right text-sm text-[#3a393e]">
                    {localTime(point.time, { weekday: "short" })}
                    <span className="block font-semibold text-[#0b0b0c]">
                      {point.heightM >= 0 ? "+" : ""}
                      {point.heightM} m
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* 05 — derived physics, for researchers */}
      {role === "researcher" && scienceHours.length > 1 && (
        <section>
          <SectionHead index="05" title="Derived physics" aside={<span className="sw-label">Computed from live values</span>} />
          <MarineSciencePanel location={scienceLocation} hours={scienceHours} />
        </section>
      )}
    </div>
  );
}
