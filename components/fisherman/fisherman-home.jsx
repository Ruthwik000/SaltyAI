"use client";

/**
 * Fisherman home: the one question first, as a colour, a symbol and a word,
 * then the four figures that decide it, the nearest fishing zones, today's
 * market prices, and the actions. Every heading comes from the chosen
 * language, and the answer can be read out loud.
 */

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUp,
  ArrowUpRight,
  CalendarDays,
  Check,
  CloudRain,
  Fish,
  HelpCircle,
  Loader2,
  Mic,
  Navigation,
  Phone,
  ShieldCheck,
  Waves,
  Wind,
  X,
} from "lucide-react";
import { useMarine } from "@/lib/marine-context";
import { fetchForecast, fetchOceanAlerts, fetchPfzZones } from "@/lib/fisherman-api";
import { getLocationMarketProfile } from "@/lib/marine-data";
import { useT } from "@/lib/i18n";
import { SpeakButton } from "@/components/fisherman/speak-button";

const VERDICTS = {
  go: { key: "home.go", color: "#0e7a4b", icon: Check },
  careful: { key: "home.careful", color: "#c26a00", icon: AlertTriangle },
  stop: { key: "home.stop", color: "#d0182a", icon: X },
  unknown: { key: "home.unknown", color: "#55545a", icon: HelpCircle },
};

function verdictFor(forecast, alerts) {
  const severe = alerts.some((a) => a.severity === "Critical" || a.severity === "Severe");
  if (severe) return "stop";
  const risk = forecast?.daily?.[0]?.risk;
  if (!risk) return "unknown";
  if (risk === "High") return "stop";
  if (risk === "Moderate" || alerts.length > 0) return "careful";
  return "go";
}

function SectionHead({ index, title, action }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4 border-b border-[#0b0b0c] pb-3">
      <div className="min-w-0">
        <span className="sw-index">{index}</span>
        <h2 className="sw-serif mt-1 text-2xl leading-tight sm:text-3xl">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

function Figure({ icon: Icon, label, value, unit }) {
  return (
    <div className="flex min-w-0 flex-col justify-between gap-4 bg-white p-4 sm:gap-6 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <span className="sw-label truncate">{label}</span>
        <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden />
      </div>
      <div className="flex min-w-0 items-baseline gap-1.5">
        <span className="sw-num truncate text-4xl font-semibold leading-none tracking-[-0.045em] sm:text-6xl">
          {value ?? "—"}
        </span>
        {value != null && unit && (
          <span className="text-sm font-medium text-[#6d6c70] sm:text-base">{unit}</span>
        )}
      </div>
    </div>
  );
}

function Action({ href, index, icon: Icon, label, onClick, danger = false }) {
  const className = `group flex min-h-36 min-w-0 flex-col justify-between p-4 sm:min-h-40 sm:p-6 sw-press ${
    danger
      ? "bg-[#d0182a] text-white hover:bg-[#a51322]"
      : "bg-white text-[#0b0b0c] hover:bg-[#0b0b0c] hover:text-white"
  }`;
  const body = (
    <>
      <div className="flex items-start justify-between">
        <span className={`sw-num text-[11px] font-semibold tracking-[0.14em] ${danger ? "text-white/80" : "text-[#6d6c70] group-hover:text-white/70"}`}>
          {index}
        </span>
        <ArrowUpRight className="h-5 w-5" strokeWidth={1.75} aria-hidden />
      </div>
      <div className="min-w-0">
        <Icon className="mb-3 h-8 w-8" strokeWidth={1.5} aria-hidden />
        <span className="block break-words text-lg font-bold leading-tight tracking-[-0.025em] sm:text-2xl">
          {label}
        </span>
      </div>
    </>
  );
  if (href.startsWith("tel:")) {
    return (
      <a href={href} onClick={onClick} className={className}>
        {body}
      </a>
    );
  }
  return (
    <Link href={href} onClick={onClick} className={className}>
      {body}
    </Link>
  );
}

export function FishermanHome() {
  const { location, reportLostFishermanSOS } = useMarine();
  const { t } = useT();

  const [forecast, setForecast] = React.useState(null);
  const [alerts, setAlerts] = React.useState([]);
  const [zones, setZones] = React.useState([]);
  const coastKey = `${location.lat},${location.lon}`;
  const [loadedKey, setLoadedKey] = React.useState(null);
  const loading = loadedKey !== coastKey;

  React.useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetchForecast(location.lat, location.lon, controller.signal),
      fetchOceanAlerts(location.lat, location.lon, controller.signal),
      fetchPfzZones(location.lat, location.lon, controller.signal),
    ]).then(([forecastResponse, alertsResponse, zonesResponse]) => {
      if (controller.signal.aborted) return;
      setForecast(forecastResponse.data);
      // Demo warnings would push a real skipper to stay home; only live ones count.
      setAlerts(alertsResponse.source === "live" ? alertsResponse.data : []);
      setZones(zonesResponse.data || []);
      setLoadedKey(coastKey);
    });
    return () => controller.abort();
  }, [location.lat, location.lon, coastKey]);

  // Market prices are bundled sample data until a live market feed exists.
  const market = React.useMemo(
    () => getLocationMarketProfile(location.id || location.name),
    [location.id, location.name]
  );

  const now = forecast?.hourly?.[0];
  const verdict = VERDICTS[verdictFor(forecast, alerts)];
  const VerdictIcon = verdict.icon;
  const highTide = forecast?.tides?.nextHigh?.time
    ? new Date(forecast.tides.nextHigh.time).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
  const today = new Date().toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });

  const spoken = [
    t("home.canIGo"),
    t(verdict.key),
    now ? `${t("home.waves")} ${now.wave} ${t("common.unit.m")}` : "",
    now?.wind != null ? `${t("home.wind")} ${now.wind} ${t("common.unit.knots")}` : "",
    alerts.length ? t("home.warnings", { count: alerts.length }) : "",
  ]
    .filter(Boolean)
    .join(". ");

  return (
    <div className="space-y-10 lg:space-y-14">
      {/* 01 — market prices */}
      <section className="min-w-0">
        <SectionHead
          index="01"
          title={t("home.market")}
        />
        <p className="sw-label mb-2">{market.harbourName}</p>
        <ul className="grid grid-cols-1 gap-px border border-[#dcd9d1] bg-[#dcd9d1] sm:grid-cols-2 xl:grid-cols-5">
          {market.items.slice(0, 5).map((item) => {
            const up = item.priceChange24h >= 0;
            const Trend = up ? ArrowUpRight : ArrowDownRight;
            return (
              <li
                key={item.species}
                className="grid grid-cols-[1fr_auto] items-center gap-3 bg-white p-4"
              >
                <span className="min-w-0">
                  <span className="block truncate text-base font-bold tracking-[-0.02em] sm:text-lg">
                    {item.localName}
                  </span>
                  <span className="block truncate text-sm text-[#6d6c70]">{item.species}</span>
                </span>
                <span className="text-right">
                  <span className="sw-num block text-3xl font-semibold leading-none tracking-[-0.04em] sm:text-4xl">
                    ₹{item.pricePerKg}
                  </span>
                  <span className="sw-label">{t("home.perKg")}</span>
                </span>
                <span
                  className={`sw-num col-span-2 flex items-center justify-end gap-1 text-sm font-semibold ${
                    up ? "text-[#0e7a4b]" : "text-[#d0182a]"
                  }`}
                >
                  <Trend className="h-4 w-4" strokeWidth={2} aria-hidden />
                  {up ? "+" : "−"}₹{Math.abs(item.priceChange24h)}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* 02 — risk today */}
      <section className="grid gap-px border border-[#dcd9d1] bg-[#dcd9d1] lg:grid-cols-12">
        <div
          className="relative flex min-h-72 min-w-0 flex-col justify-between p-5 text-white sm:min-h-80 sm:p-8 lg:col-span-7 lg:p-10"
          style={{ backgroundColor: loading ? "#0b0b0c" : verdict.color }}
          aria-live="polite"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
                02 — {location.name}
              </span>
              <p className="mt-2 text-base font-medium text-white/90 sm:text-xl">{t("home.canIGo")}</p>
            </div>
            <span className="hidden shrink-0 text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70 sm:block">
              {today}
            </span>
          </div>

          <div className="mt-8 flex min-w-0 items-end gap-4 sm:gap-5">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center border border-white/40 sm:h-24 sm:w-24">
              {loading ? (
                <Loader2 className="h-8 w-8 animate-spin sm:h-10 sm:w-10" strokeWidth={1.5} aria-hidden />
              ) : (
                <VerdictIcon className="h-9 w-9 sm:h-12 sm:w-12" strokeWidth={2} aria-hidden />
              )}
            </span>
            <h1 className="sw-serif min-w-0 break-words text-[clamp(2.25rem,10vw,6rem)] leading-[0.98]">
              {loading ? t("home.checking") : t(verdict.key)}
            </h1>
          </div>

          {!loading && (
            <SpeakButton
              text={spoken}
              label
              className="mt-6 h-12 w-fit border-white/60 px-5 text-white hover:bg-white hover:text-[#0b0b0c] sm:mt-8"
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-px lg:col-span-5">
          <Figure icon={Waves} label={t("home.waves")} value={now?.wave} unit={t("common.unit.m")} />
          <Figure icon={Wind} label={t("home.wind")} value={now?.wind} unit={t("common.unit.knots")} />
          <Figure icon={CloudRain} label={t("home.rain")} value={now?.rain} unit="%" />
          <Figure icon={ArrowUp} label={t("home.tide")} value={highTide} />
        </div>
      </section>

      {/* Warnings, only when there are some */}
      {alerts.length > 0 && (
        <Link
          href="/app/alerts"
          className="sw-press group -mt-4 flex items-center gap-4 border-l-4 border-[#c26a00] bg-[#0b0b0c] px-5 py-4 text-white hover:bg-[#3a393e] sm:px-6 sm:py-5 lg:-mt-8"
        >
          <AlertTriangle className="h-7 w-7 shrink-0 text-[#ffb547]" strokeWidth={1.75} />
          <span className="min-w-0 flex-1 text-lg font-bold tracking-[-0.02em] sm:text-2xl">
            {t("home.warnings", { count: alerts.length })}
          </span>
          <ArrowUpRight className="h-6 w-6 shrink-0" strokeWidth={1.75} />
        </Link>
      )}

      {/* 03 — fishing zones */}
      <section className="min-w-0">
        <SectionHead
          index="03"
          title={t("home.pfz")}
          action={
            <Link href="/app/fishing-zones" className="sw-link whitespace-nowrap text-sm font-semibold">
              {t("home.viewAll")}
            </Link>
          }
        />
        {loading ? (
          <p className="py-6 text-[#6d6c70]">{t("common.loading")}</p>
        ) : zones.length === 0 ? (
          <p className="py-6 text-lg font-semibold">{t("home.noZones")}</p>
        ) : (
          <ul className="divide-y divide-[#dcd9d1] border-b border-[#dcd9d1]">
            {zones.slice(0, 4).map((zone, index) => (
              <li key={zone.id}>
                <Link
                  href={`/app/fishing-zones?select=${encodeURIComponent(zone.id)}`}
                  className="sw-press group grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 py-4 hover:bg-white sm:grid-cols-[3rem_1fr_auto] sm:gap-4 sm:px-2"
                >
                  <span
                    className="flex h-10 w-10 items-center justify-center border border-[#0b0b0c] group-hover:bg-[#0b0b0c] group-hover:text-white"
                    title={zone.bearing}
                  >
                    <Navigation
                      className="h-5 w-5"
                      strokeWidth={1.75}
                      style={{ transform: `rotate(${(zone.bearingDeg ?? 0) - 45}deg)` }}
                      aria-hidden
                    />
                  </span>
                  <span className="min-w-0">
                    <span className="sw-num text-[11px] font-semibold tracking-[0.14em] text-[#6d6c70]">
                      {String(index + 1).padStart(2, "0")} · {zone.bearing}
                    </span>
                    <span className="block truncate text-base font-bold tracking-[-0.02em] sm:text-lg">
                      {zone.name}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="sw-num block text-3xl font-semibold leading-none tracking-[-0.04em] sm:text-4xl">
                      {zone.distanceNM != null ? Math.round(zone.distanceNM) : "—"}
                    </span>
                    <span className="sw-label">{t("common.unit.nm")} {t("home.away")}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>


      {/* 04 — what to do next */}
      <section>
        <SectionHead index="04" title={t("home.actions")} />
        <div className="grid grid-cols-2 gap-px border border-[#dcd9d1] bg-[#dcd9d1] md:grid-cols-3 xl:grid-cols-6">
          <Action href="/app/fishing-zones" index="A" icon={Fish} label={t("home.zones")} />
          <Action href="/app/risk" index="B" icon={ShieldCheck} label={t("home.safety")} />
          <Action href="/app/vessel" index="C" icon={Navigation} label={t("home.trip")} />
          <Action href="/app/ai-agent" index="D" icon={Mic} label={t("home.ask")} />
          <Action href="/app/weather" index="E" icon={CalendarDays} label={t("home.weather")} />
          <Action
            href="tel:1554"
            index="SOS"
            icon={Phone}
            label={t("home.sos")}
            danger
            onClick={() => reportLostFishermanSOS(location)}
          />
        </div>
      </section>
    </div>
  );
}
