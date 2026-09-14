"use client";

/**
 * Researcher home: present state, the forecast, the live dataset catalogue and
 * the warnings in force, each as one numbered section. Every value is read
 * live from INCOIS, Open-Meteo or INCOIS ERDDAP; nothing here is bundled.
 */

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, CloudSun, Database, Map, Mic } from "lucide-react";
import { useMarine } from "@/lib/marine-context";
import { fetchForecast, fetchOceanAlerts, fetchPointConditions } from "@/lib/fisherman-api";
import { ReportFindingCard } from "@/components/research/report-finding-card";
import { Figure, ForecastLine, SectionHead, num } from "@/components/ui/swiss";

const API_BASE = process.env.NEXT_PUBLIC_SALTY_API_URL || "http://127.0.0.1:8010";

const METRICS = [
  { key: "wave", label: "Waves", unit: "m", digits: 2 },
  { key: "swell", label: "Swell", unit: "m", digits: 2 },
  { key: "wind", label: "Wind", unit: "kts", digits: 0 },
  { key: "rain", label: "Rain", unit: "%", digits: 0 },
  { key: "temp", label: "Air", unit: "°C", digits: 1 },
];

const RISK_COLOUR = { Low: "#0e7a4b", Moderate: "#c26a00", High: "#d0182a" };

function ActionLink({ href, index, icon: Icon, label }) {
  return (
    <Link
      href={href}
      className="sw-press group flex min-h-28 flex-col justify-between bg-white p-4 hover:bg-[#0b0b0c] hover:text-white sm:p-5"
    >
      <span className="flex items-start justify-between">
        <span className="sw-num text-[11px] font-semibold tracking-[0.14em] text-[#6d6c70] group-hover:text-white/70">
          {index}
        </span>
        <ArrowUpRight className="h-5 w-5" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="flex items-center gap-3">
        <Icon className="h-6 w-6 shrink-0" strokeWidth={1.5} aria-hidden />
        <span className="text-lg font-bold tracking-[-0.02em]">{label}</span>
      </span>
    </Link>
  );
}

export function ResearcherHome() {
  const { location } = useMarine();
  const coastKey = `${location.lat},${location.lon}`;

  const [conditions, setConditions] = React.useState({ key: null, data: null, source: null });
  const [forecast, setForecast] = React.useState({ key: null, data: null });
  const [alerts, setAlerts] = React.useState({ key: null, data: [] });
  const [catalog, setCatalog] = React.useState({ loaded: false, datasets: [], error: null });
  const [metricKey, setMetricKey] = React.useState("wave");

  React.useEffect(() => {
    const controller = new AbortController();
    fetchPointConditions(location.lat, location.lon, controller.signal).then((response) => {
      if (!controller.signal.aborted) setConditions({ key: coastKey, data: response.data, source: response.source });
    });
    fetchForecast(location.lat, location.lon, controller.signal).then((response) => {
      if (!controller.signal.aborted) setForecast({ key: coastKey, data: response.data });
    });
    fetchOceanAlerts(location.lat, location.lon, controller.signal).then((response) => {
      if (!controller.signal.aborted) {
        setAlerts({ key: coastKey, data: response.source === "live" ? response.data : [] });
      }
    });
    return () => controller.abort();
  }, [location.lat, location.lon, coastKey]);

  React.useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE}/api/research/catalog`, { signal: controller.signal, cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`SALTY API ${response.status}`);
        return response.json();
      })
      .then((body) => setCatalog({ loaded: true, datasets: body.datasets || [], error: null }))
      .catch((error) => {
        if (error.name !== "AbortError") {
          setCatalog({ loaded: true, datasets: [], error: error.message || "Catalogue unavailable" });
        }
      });
    return () => controller.abort();
  }, []);

  const now = conditions.key === coastKey && conditions.source === "live" ? conditions.data : null;
  const conditionsLoading = conditions.key !== coastKey;
  const forecastData = forecast.key === coastKey ? forecast.data : null;
  const hours = forecastData?.hourly || [];
  const days = forecastData?.daily || [];
  const warnings = alerts.key === coastKey ? alerts.data : [];
  const metric = METRICS.find((item) => item.key === metricKey) || METRICS[0];
  const observed = now?.observedAt
    ? new Date(now.observedAt).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="space-y-12 lg:space-y-16">
      <header className="grid gap-4 border-b border-[#0b0b0c] pb-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <span className="sw-index">Researcher · {location.name}</span>
          <h1 className="sw-page-title mt-2">Ocean state</h1>
        </div>
        <div className="flex items-end lg:col-span-4 lg:justify-end">
          <span className="sw-label">
            {location.lat.toFixed(2)}°N · {location.lon.toFixed(2)}°E
          </span>
        </div>
      </header>

      {/* 01 — present state */}
      <section>
        <SectionHead
          index="01"
          title="Present state"
          aside={
            <span className="sw-label">
              {conditionsLoading ? "Loading" : now ? `Observed ${observed || "—"} · INCOIS / Open-Meteo` : "Not available"}
            </span>
          }
        />
        <div className="grid grid-cols-2 gap-px border border-[#dcd9d1] bg-[#dcd9d1] md:grid-cols-3 xl:grid-cols-6">
          <Figure label="Sea surface temp" value={num(now?.sst, 1)} unit="°C" />
          <Figure label="Significant wave" value={num(now?.waveHeight, 2)} unit="m" />
          <Figure label="Swell" value={num(now?.swellHeight, 2)} unit="m" />
          <Figure label="Wave period" value={num(now?.wavePeriod, 1)} unit="s" />
          <Figure label="Wind" value={num(now?.windSpeed, 0)} unit={now?.windDirection ? `kts ${now.windDirection}` : "kts"} />
          <Figure label="Surface current" value={num(now?.currentSpeed, 2)} unit="m/s" />
        </div>
      </section>

      {/* 02 — forecast */}
      <section>
        <SectionHead
          index="02"
          title="Forecast"
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
        <div className="grid gap-px border border-[#dcd9d1] bg-[#dcd9d1] lg:grid-cols-12">
          <div className="min-w-0 bg-white p-4 sm:p-6 lg:col-span-7">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="sw-label">Next 24 hours · {metric.unit}</span>
            </div>
            {forecastData ? (
              <ForecastLine hours={hours} metric={metric} />
            ) : (
              <p className="py-16 text-center text-sm text-[#6d6c70]">
                {forecast.key === coastKey ? "Forecast not available" : "Loading forecast"}
              </p>
            )}
          </div>
          <div className="min-w-0 overflow-x-auto bg-white lg:col-span-5">
            <table className="w-full min-w-[420px] text-left text-sm tabular-nums">
              <thead>
                <tr className="border-b border-[#0b0b0c] text-[11px] uppercase tracking-[0.12em] text-[#6d6c70]">
                  <th className="px-4 py-3 font-semibold">Day</th>
                  <th className="px-2 py-3 text-right font-semibold">Wave</th>
                  <th className="px-2 py-3 text-right font-semibold">Wind</th>
                  <th className="px-2 py-3 text-right font-semibold">Air</th>
                  <th className="px-4 py-3 text-right font-semibold">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dcd9d1]">
                {days.map((day) => (
                  <tr key={day.date}>
                    <td className="px-4 py-3">
                      <span className="block font-semibold">{day.day}</span>
                      <span className="block text-xs capitalize text-[#6d6c70]">{day.condition}</span>
                    </td>
                    <td className="px-2 py-3 text-right">{num(day.waveMax, 1)} m</td>
                    <td className="px-2 py-3 text-right">{num(day.windMax, 0)} kts</td>
                    <td className="px-2 py-3 text-right">
                      {num(day.tempMin, 0)}–{num(day.tempMax, 0)}°
                    </td>
                    <td className="px-4 py-3 text-right font-semibold" style={{ color: RISK_COLOUR[day.risk] || "#0b0b0c" }}>
                      {day.risk}
                    </td>
                  </tr>
                ))}
                {days.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-[#6d6c70]">
                      —
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
        {/* 03 — datasets */}
        <section className="min-w-0 lg:col-span-8">
          <SectionHead
            index="03"
            title="Datasets"
            aside={
              <>
                <span className="sw-label">INCOIS ERDDAP · {catalog.datasets.length || "—"}</span>
                <Link href="/app/research" className="sw-link text-sm font-semibold">
                  All data
                </Link>
              </>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#0b0b0c] text-[11px] uppercase tracking-[0.12em] text-[#6d6c70]">
                  <th className="py-3 pr-4 font-semibold">Dataset</th>
                  <th className="px-2 py-3 font-semibold">Variable</th>
                  <th className="px-2 py-3 font-semibold">Coverage</th>
                  <th className="py-3 pl-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dcd9d1]">
                {!catalog.loaded && (
                  <tr>
                    <td colSpan={4} className="py-8 text-[#6d6c70]">Loading catalogue</td>
                  </tr>
                )}
                {catalog.error && (
                  <tr>
                    <td colSpan={4} className="border-l-2 border-[#d0182a] py-4 pl-3 text-[#d0182a]">
                      {catalog.error}
                    </td>
                  </tr>
                )}
                {catalog.datasets.slice(0, 8).map((dataset) => {
                  const start = dataset.timeCoverage?.time_coverage_start?.slice(0, 4);
                  const end = dataset.timeCoverage?.time_coverage_end?.slice(0, 4);
                  return (
                    <tr key={dataset.id} className="group">
                      <td className="py-3 pr-4">
                        <span className="block font-semibold">{dataset.title || dataset.id}</span>
                        <span className="block font-mono text-xs text-[#6d6c70]">{dataset.id}</span>
                      </td>
                      <td className="px-2 py-3">
                        <span className="font-mono text-xs">{dataset.variable || "—"}</span>
                        {dataset.unit && <span className="ml-1 text-xs text-[#6d6c70]">{dataset.unit}</span>}
                      </td>
                      <td className="sw-num px-2 py-3 text-[#3a393e]">
                        {dataset.error ? <span className="text-[#d0182a]">Unavailable</span> : start ? `${start}–${end}` : "—"}
                      </td>
                      <td className="py-3 pl-2 text-right">
                        <Link
                          href={`/app/research?dataset=${encodeURIComponent(dataset.id)}`}
                          aria-label={`Open ${dataset.id}`}
                          className="inline-flex h-8 w-8 items-center justify-center border border-[#0b0b0c] hover:bg-[#0b0b0c] hover:text-white"
                        >
                          <ArrowUpRight className="h-4 w-4" strokeWidth={1.75} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* 04 — warnings */}
        <section className="min-w-0 lg:col-span-4">
          <SectionHead
            index="04"
            title="Warnings"
            aside={<span className="sw-label">{alerts.key === coastKey ? warnings.length : "—"} in force</span>}
          />
          {alerts.key === coastKey && warnings.length === 0 && (
            <p className="py-4 text-[#6d6c70]">No INCOIS warning for this coast.</p>
          )}
          <ul className="divide-y divide-[#dcd9d1]">
            {warnings.slice(0, 4).map((alert) => (
              <li key={alert.id} className="py-3">
                <span
                  className="text-[11px] font-semibold uppercase tracking-[0.12em]"
                  style={{ color: alert.severity === "Critical" || alert.severity === "Severe" ? "#d0182a" : "#c26a00" }}
                >
                  {alert.severity} · {alert.type}
                </span>
                <span className="mt-1 block font-semibold">{alert.affectedRegions?.[0] || alert.title}</span>
              </li>
            ))}
          </ul>
          {warnings.length > 0 && (
            <Link href="/app/alerts" className="sw-link mt-3 inline-block text-sm font-semibold">
              All warnings
            </Link>
          )}
        </section>
      </div>

      {/* 05 — tools */}
      <section>
        <SectionHead index="05" title="Tools" />
        <div className="grid grid-cols-2 gap-px border border-[#dcd9d1] bg-[#dcd9d1] lg:grid-cols-4">
          <ActionLink href="/app/research" index="A" icon={Database} label="Datasets" />
          <ActionLink href="/app/map" index="B" icon={Map} label="Map layers" />
          <ActionLink href="/app/weather" index="C" icon={CloudSun} label="Weather" />
          <ActionLink href="/app/ai-agent" index="D" icon={Mic} label="Ask agent" />
        </div>
        <div className="mt-8">
          <ReportFindingCard />
        </div>
      </section>
    </div>
  );
}
