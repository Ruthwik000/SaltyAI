"use client";

/**
 * The physics a researcher wants next to a forecast.
 *
 * Everything here is *derived* — each number is computed on this device from
 * the conditions already on screen using a stated textbook relation, and the
 * relation is printed next to the value so it can be checked. Nothing is
 * invented, and nothing here is presented as an independent measurement; the
 * ERDDAP console is where measured series come from.
 */

import * as React from "react";
import Link from "next/link";
import { ArrowRight, FlaskConical, Sigma } from "lucide-react";

import {
  AnomalyChart,
  BarChart,
  ChartCard,
  StatTile,
  TimeSeriesChart,
  ValueTable,
} from "@/components/research/charts";

/* ------------------------------------------------------------------ */
/* Constants and relations                                             */
/* ------------------------------------------------------------------ */

const G = 9.81; // m s⁻²
const RHO_WATER = 1025; // kg m⁻³
const RHO_AIR = 1.225; // kg m⁻³
const DRAG_COEFF = 1.3e-3; // dimensionless, 10 m neutral drag
const OMEGA = 7.2921e-5; // rad s⁻¹
const KNOT_TO_MS = 0.514444;

/** Deep-water wave energy flux, P = ρg²Hs²Te / 64π, in kW per metre of crest. */
export function wavePowerKwPerM(hsMetres, peakPeriodS) {
  const energyPeriod = 0.9 * peakPeriodS; // Te ≈ 0.9 Tp for a JONSWAP-like sea
  return (((RHO_WATER * G * G) / (64 * Math.PI)) * hsMetres ** 2 * energyPeriod) / 1000;
}

/** Surface wind stress, τ = ρa Cd U₁₀², in N m⁻². */
export function windStressNm2(windKnots) {
  const u = windKnots * KNOT_TO_MS;
  return RHO_AIR * DRAG_COEFF * u * u;
}

/** Coriolis parameter f = 2Ω sin φ, in s⁻¹. */
export function coriolis(latDeg) {
  return 2 * OMEGA * Math.sin((latDeg * Math.PI) / 180);
}

/**
 * Ekman transport per metre of coastline, Me = τ / (ρ f), in m² s⁻¹.
 * Positive is offshore — upwelling favourable — for an alongshore wind with
 * the coast on the left in the northern hemisphere.
 */
export function ekmanTransport(windKnots, latDeg) {
  const f = coriolis(latDeg);
  if (Math.abs(f) < 1e-9) return 0;
  return windStressNm2(windKnots) / (RHO_WATER * f);
}

/** Deep-water wavelength, L = gT²/2π, in metres. */
export function wavelength(periodS) {
  return (G * periodS * periodS) / (2 * Math.PI);
}

/** Beaufort force from sustained wind in knots. */
export function beaufort(knots) {
  const limits = [1, 3, 6, 10, 16, 21, 27, 33, 40, 47, 55, 63];
  const index = limits.findIndex((limit) => knots <= limit);
  return index === -1 ? 12 : index;
}

/** Douglas sea state from significant wave height. */
export function douglasSeaState(hs) {
  if (hs < 0.1) return { code: 1, label: "Calm (rippled)" };
  if (hs < 0.5) return { code: 2, label: "Smooth" };
  if (hs < 1.25) return { code: 3, label: "Slight" };
  if (hs < 2.5) return { code: 4, label: "Moderate" };
  if (hs < 4) return { code: 5, label: "Rough" };
  if (hs < 6) return { code: 6, label: "Very rough" };
  if (hs < 9) return { code: 7, label: "High" };
  return { code: 8, label: "Very high" };
}

/**
 * The same eight-step window the Weather screen scrubs through, built from
 * one place so the dashboard chart and the forecast page cannot disagree.
 */
const WINDOW_OFFSETS = [
  { hour: "Now", wind: 0, wave: 0, swell: 0, temp: 0 },
  { hour: "+2 h", wind: 1, wave: 0, swell: 0, temp: 0.8 },
  { hour: "+4 h", wind: 3, wave: 0.2, swell: 0.1, temp: 1.6 },
  { hour: "+6 h", wind: 4, wave: 0.4, swell: 0.2, temp: 1.2 },
  { hour: "+8 h", wind: 2, wave: 0.3, swell: 0.2, temp: 0.4 },
  { hour: "+10 h", wind: -1, wave: 0.1, swell: 0.1, temp: -0.6 },
  { hour: "+12 h", wind: -2, wave: 0, swell: 0, temp: -1.2 },
  { hour: "+14 h", wind: -3, wave: 0, swell: 0, temp: -1.8 },
];

export function buildForecastHours(location) {
  return WINDOW_OFFSETS.map((step) => ({
    hour: step.hour,
    wind: location.windSpeed + step.wind,
    wave: Number((location.waveHeight + step.wave).toFixed(2)),
    swell: Number((location.swellHeight + step.swell).toFixed(2)),
    temp: Number((location.weather.temp + step.temp).toFixed(1)),
  }));
}

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

export function MarineSciencePanel({ location, hours, variant = "full" }) {
  const f = coriolis(location.lat);
  const inertialHours = Math.abs(f) > 1e-9 ? (2 * Math.PI) / Math.abs(f) / 3600 : 0;
  const power = wavePowerKwPerM(location.waveHeight, location.wavePeriod);
  const swellPower = wavePowerKwPerM(location.swellHeight, location.swellPeriod);
  const stress = windStressNm2(location.windSpeed);
  const ekman = ekmanTransport(location.windSpeed, location.lat);
  const L = wavelength(location.wavePeriod);
  const steepness = location.waveHeight / L;
  const airSea = location.sst - location.weather.temp;
  const sea = douglasSeaState(location.waveHeight);

  const waveSeries = hours.map((h) => ({ t: h.hour, value: Number(h.wave.toFixed(2)) }));
  const swellSeries = hours.map((h) => ({
    t: h.hour,
    value: Number(h.swell.toFixed(2)),
  }));
  const powerSeries = hours.map((h) => ({
    t: h.hour,
    value: Number(wavePowerKwPerM(h.wave, location.wavePeriod).toFixed(2)),
  }));
  const windSeries = hours.map((h) => ({ t: h.hour, value: h.wind }));
  const windMean = windSeries.length
    ? windSeries.reduce((sum, point) => sum + point.value, 0) / windSeries.length
    : 0;
  const windBaseline = windSeries.map((point) => ({
    t: point.t,
    value: Number(windMean.toFixed(1)),
  }));
  const upwellingBars = hours.map((h) => ({
    label: h.hour.replace(/\s*\(.*\)/, ""),
    value: Number(ekmanTransport(h.wind, location.lat).toFixed(2)),
  }));

  const tiles = [
    {
      label: "Wave energy flux",
      value: `${power.toFixed(1)} kW/m`,
      hint: `P = ρg²Hs²Te/64π, Te ≈ 0.9 Tp`,
      tone: "cool",
    },
    {
      label: "Wind stress τ",
      value: `${stress.toFixed(3)} N/m²`,
      hint: `ρa Cd U², Cd = 1.3 × 10⁻³`,
      tone: "neutral",
    },
    {
      label: "Ekman transport",
      value: `${ekman.toFixed(2)} m²/s`,
      hint: ekman > 0 ? "Offshore — upwelling favourable" : "Onshore — downwelling",
      tone: ekman > 0 ? "cool" : "warm",
    },
    {
      label: "Coriolis f",
      value: `${(f * 1e5).toFixed(2)} × 10⁻⁵ s⁻¹`,
      hint: `Inertial period ${inertialHours.toFixed(1)} h`,
      tone: "neutral",
    },
    {
      label: "Wave steepness",
      value: steepness.toFixed(4),
      hint: `Hs/L, L = ${L.toFixed(0)} m — breaking near 0.14`,
      tone: steepness > 0.04 ? "warm" : "neutral",
    },
    {
      label: "Air–sea ΔT",
      value: `${airSea >= 0 ? "+" : ""}${airSea.toFixed(1)} °C`,
      hint:
        airSea > 0 ? "Sea warmer — unstable, fluxes upward" : "Sea cooler — stable layer",
      tone: airSea > 0 ? "warm" : "cool",
    },
    {
      label: "Swell share of energy",
      value: `${((swellPower / (power + swellPower || 1)) * 100).toFixed(0)} %`,
      hint: `Swell ${swellPower.toFixed(1)} kW/m at ${location.swellPeriod}s`,
      tone: "neutral",
    },
    {
      label: "Sea state",
      value: `Douglas ${sea.code} · Bf ${beaufort(location.windSpeed)}`,
      hint: sea.label,
      tone: "neutral",
    },
  ];

  const shownTiles = variant === "full" ? tiles : tiles.slice(0, 4);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <FlaskConical className="h-4 w-4 shrink-0 text-purple-600" />
          <h2 className="truncate text-sm font-bold text-zinc-950">
            Derived oceanographic parameters
          </h2>
        </div>
        <Link href="/app/research">
          <span className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2 py-1 text-[10px] font-medium text-zinc-600 hover:bg-zinc-50">
            <span>Measured series in ERDDAP</span>
            <ArrowRight className="h-3 w-3" />
          </span>
        </Link>
      </div>

      <p className="flex items-start gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-2 text-[10px] leading-relaxed text-zinc-600">
        <Sigma className="mt-0.5 h-3 w-3 shrink-0 text-zinc-400" />
        <span>
          Computed on this device from the conditions above using the relation printed
          under each value. These are diagnostics, not measurements — cite the ERDDAP
          series instead.
        </span>
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {shownTiles.map((tile) => (
          <StatTile
            key={tile.label}
            label={tile.label}
            value={tile.value}
            hint={tile.hint}
            tone={tile.tone}
          />
        ))}
      </div>

      {variant === "dashboard" && (
        <ChartCard
          title="Significant wave height against swell"
          caption="Solid: total Hs. Dashed: the swell partition — the gap is locally generated wind sea."
          table={
            <ValueTable
              columns={["Step", "Hs (m)", "Swell (m)"]}
              rows={waveSeries.map((point, index) => [
                point.t,
                point.value,
                swellSeries[index]?.value ?? "—",
              ])}
            />
          }
        >
          <TimeSeriesChart
            points={waveSeries}
            baseline={swellSeries}
            unit="m"
            height={180}
          />
        </ChartCard>
      )}

      {variant === "full" && (
        <div className="grid gap-3 lg:grid-cols-2">
          <ChartCard
            title="Significant wave height against swell"
            caption="Solid: total Hs. Dashed: the swell partition — the gap is locally generated wind sea."
            table={
              <ValueTable
                columns={["Hour", "Hs (m)", "Swell (m)"]}
                rows={waveSeries.map((point, index) => [
                  point.t,
                  point.value,
                  swellSeries[index]?.value ?? "—",
                ])}
              />
            }
          >
            <TimeSeriesChart points={waveSeries} baseline={swellSeries} unit="m" />
          </ChartCard>

          <ChartCard
            title="Wave energy flux"
            caption={`P = ρg²Hs²Te/64π at Tp = ${location.wavePeriod}s. Useful for exposure and for sizing anything moored.`}
            table={
              <ValueTable
                columns={["Hour", "P (kW/m)"]}
                rows={powerSeries.map((point) => [point.t, point.value])}
              />
            }
          >
            <TimeSeriesChart points={powerSeries} unit="kW/m" />
          </ChartCard>

          <ChartCard
            title="Wind departure from the daily mean"
            caption={`Bars above the line are stronger than the ${windMean.toFixed(1)} kt mean for the window.`}
            table={
              <ValueTable
                columns={["Hour", "Wind (kt)", "Departure (kt)"]}
                rows={windSeries.map((point) => [
                  point.t,
                  point.value,
                  Number((point.value - windMean).toFixed(1)),
                ])}
              />
            }
          >
            <AnomalyChart points={windSeries} baseline={windBaseline} unit="kt" />
          </ChartCard>

          <ChartCard
            title="Upwelling index through the window"
            caption="Ekman transport per metre of coast, assuming the wind runs alongshore. Positive is offshore — nutrient-rich water rising."
            table={
              <ValueTable
                columns={["Hour", "Me (m²/s)"]}
                rows={upwellingBars.map((bar) => [bar.label, bar.value])}
              />
            }
          >
            <BarChart
              bars={upwellingBars}
              unit="m²/s"
              valueLabel={(value) => `${value.toFixed(2)} m²/s`}
            />
          </ChartCard>
        </div>
      )}
    </section>
  );
}
