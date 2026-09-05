"use client";

import * as React from "react";
import Link from "next/link";
import {
  Thermometer,
  Wind,
  Waves,
  ShieldAlert,
  Fish,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Minus,
  Radar,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  type MarineLocation,
  getLocationMarketProfile,
  getFishSchoolUpdate,
  marineAlerts,
} from "@/lib/marine-data";
import { useMarine, type UserRole } from "@/lib/marine-context";
import { useT } from "@/lib/i18n";
import { riskLevelLabel } from "@/components/fisherman/speech-text";

interface MarineMetricsGridProps {
  location: MarineLocation;
  role?: UserRole;
}

export function MarineMetricsGrid({ location, role: propRole }: MarineMetricsGridProps) {
  const { t } = useT();
  const marineContext = useMarine();
  const role = propRole || marineContext?.role;
  const isFisherman = role === "fisherman";

  const [marketModalOpen, setMarketModalOpen] = React.useState(false);
  const [schoolModalOpen, setSchoolModalOpen] = React.useState(false);
  const [disasterModalOpen, setDisasterModalOpen] = React.useState(false);

  const marketData = React.useMemo(
    () => getLocationMarketProfile(location.id || location.name),
    [location.id, location.name]
  );

  const schoolData = React.useMemo(
    () => getFishSchoolUpdate(location.id || location.name),
    [location.id, location.name]
  );

  const operatorDisaster = React.useMemo(() => {
    const matched = marineAlerts.find((a) =>
      a.affectedRegions.some(
        (r) =>
          r.toLowerCase().includes(location.name.toLowerCase()) ||
          location.name.toLowerCase().includes(r.toLowerCase())
      )
    );
    if (matched) return matched;
    const regional = marineAlerts.find((a) => a.affectedRegions.includes("Central Bay of Bengal"));
    if (regional) return regional;
    return marineAlerts[0];
  }, [location.name]);

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
        {isFisherman ? (
          <>
            {/* Card 1: Popular Fish currently in the market (Replaces SST on Fisherman Dashboard) */}
            <Card className="p-3 sm:p-4 flex flex-col justify-between hover:border-zinc-300 transition-colors">
              <div className="flex items-center justify-between text-[10px] sm:text-xs font-sans text-zinc-500">
                <span className="font-medium uppercase leading-tight tracking-wide">{t("m.popularFish")}</span>
                <Fish className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-emerald-600" />
              </div>
              <div className="my-2">
                <div
                  className="text-base sm:text-2xl font-bold font-sans tracking-tight text-zinc-950 leading-tight line-clamp-2"
                  title={marketData.topSpecies}
                >
                  {marketData.topSpecies}
                </div>
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] sm:text-[11px] text-zinc-500 mt-1 leading-snug">
                  <span className="text-emerald-700 font-semibold">{marketData.demandLevel}</span>
                  <span>•</span>
                  <span className="text-zinc-600 truncate">{marketData.landingVolumeText}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-zinc-100 flex items-center justify-between gap-2 text-[10px] font-sans text-zinc-400">
                <span className="min-w-0 flex-1 truncate" title={marketData.harbourName}>
                  {marketData.harbourName.split(" ")[0]}
                </span>
                <button
                  type="button"
                  onClick={() => setMarketModalOpen(true)}
                  className="text-zinc-900 font-semibold underline hover:text-emerald-700 cursor-pointer shrink-0"
                >
                  {t("m.allSpecies", { count: marketData.items.length })}
                </button>
              </div>
            </Card>

            {/* Card 2: Market Updates & Price Modifications (Replaces Surface Wind on Fisherman Dashboard) */}
            <Card className="p-3 sm:p-4 flex flex-col justify-between hover:border-zinc-300 transition-colors">
              <div className="flex items-center justify-between text-[10px] sm:text-xs font-sans text-zinc-500">
                <span className="font-medium uppercase leading-tight tracking-wide">{t("m.marketPrices")}</span>
                <IndianRupee className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-sky-600" />
              </div>
              <div className="my-2">
                <div className="text-lg sm:text-3xl font-bold font-sans tracking-tight text-zinc-950 flex items-baseline gap-1">
                  ₹{marketData.benchmarkPrice}
                  <span className="font-sans text-xs font-normal text-zinc-500">{t("m.perKgAvg")}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] mt-1 font-sans">
                  <span
                    className={`inline-flex items-center font-semibold ${
                      marketData.priceTrendPositive ? "text-emerald-600" : "text-amber-600"
                    }`}
                  >
                    {marketData.priceTrendPositive ? (
                      <TrendingUp className="h-3 w-3 mr-0.5 inline" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-0.5 inline" />
                    )}
                    {marketData.priceChangeText}
                  </span>
                  <span className="text-zinc-500">{t("m.vsYesterday")}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-zinc-100 flex items-center justify-between gap-2 text-[10px] font-sans text-zinc-400">
                <span className="min-w-0 flex-1 truncate" title={marketData.priceUpdateNote}>
                  {marketData.priceUpdateNote}
                </span>
                <button
                  type="button"
                  onClick={() => setMarketModalOpen(true)}
                  className="text-zinc-900 font-semibold underline hover:text-sky-700 cursor-pointer shrink-0"
                >
                  {t("m.viewRates")}
                </button>
              </div>
            </Card>

            {/* Card 3: Nearby Fishzone Updates & Rapid School Growth (Replaces Wave SWH on Fisherman Dashboard) */}
            <Card className="p-3 sm:p-4 flex flex-col justify-between hover:border-zinc-300 transition-colors">
              <div className="flex items-center justify-between text-[10px] sm:text-xs font-sans text-zinc-500">
                <span className="font-medium uppercase leading-tight tracking-wide">{t("m.nearbyZoneUpdate")}</span>
                <Radar className="h-4 w-4 text-indigo-500" />
              </div>
              <div className="my-2">
                <div className="text-lg sm:text-3xl font-bold font-sans tracking-tight text-zinc-950 flex items-baseline gap-1.5">
                  {schoolData.biomassSurge}
                  <span className="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {t("m.rapidGrowth")}
                  </span>
                </div>
                <div
                  className="flex items-center gap-1.5 text-[11px] text-zinc-600 mt-1 font-sans truncate"
                  title={schoolData.schoolType}
                >
                  <span className="font-semibold text-zinc-900 min-w-0 truncate">
                    {schoolData.zoneSector}
                  </span>
                  <span>•</span>
                  <span className="truncate text-zinc-500">
                    {schoolData.schoolType.split(" ")[0]} {t("m.schoolWord")}
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-zinc-100 flex items-center justify-between gap-2 text-[10px] font-sans text-zinc-400">
                <span className="min-w-0 flex-1 truncate">{schoolData.distanceBearing.split("•")[0].trim()}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSchoolModalOpen(true)}
                    className="text-zinc-500 hover:text-zinc-900 underline cursor-pointer"
                  >
                    Details
                  </button>
                  <span>•</span>
                  <Link
                    href="/app/fishing-zones"
                    className="text-zinc-900 font-semibold underline hover:text-indigo-600"
                  >
                    {t("m.trackSchool")}
                  </Link>
                </div>
              </div>
            </Card>
          </>
        ) : (
          <>
            {/* Card 1: Disaster Prediction for Coastal Operators OR Sea Surface Temperature for Researchers */}
            {role === "operator" ? (
              <Card className="p-3 sm:p-4 flex flex-col justify-between hover:border-zinc-300 transition-colors">
                <div className="flex items-center justify-between text-xs font-sans text-zinc-500">
                  <span className="uppercase font-medium tracking-wide leading-tight">Disaster Prediction</span>
                  <AlertTriangle
                    className={`h-4 w-4 ${
                      operatorDisaster.severity === "Severe" || operatorDisaster.severity === "Critical"
                        ? "text-rose-600"
                        : "text-amber-600"
                    }`}
                  />
                </div>
                <div className="my-2">
                  <div
                    className="text-base sm:text-2xl font-bold font-sans tracking-tight text-zinc-950 leading-tight line-clamp-2"
                    title={operatorDisaster.title}
                  >
                    {operatorDisaster.type}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-sans mt-1">
                    <span
                      className={`font-semibold ${
                        operatorDisaster.severity === "Severe" || operatorDisaster.severity === "Critical"
                          ? "text-rose-600"
                          : "text-amber-600"
                      }`}
                    >
                      {operatorDisaster.severity} Warning
                    </span>
                    <span>•</span>
                    <span className="text-zinc-600 truncate">{operatorDisaster.expiresAt}</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-zinc-100 flex items-center justify-between gap-2 text-[10px] font-sans text-zinc-400">
                  <span className="min-w-0 flex-1 truncate" title={operatorDisaster.source}>
                    {operatorDisaster.source.replace("Official ", "")}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setDisasterModalOpen(true)}
                      className="text-zinc-500 hover:text-zinc-900 underline cursor-pointer"
                    >
                      {t("m.details")}
                    </button>
                    <span>•</span>
                    <Link
                      href="/app/alerts"
                      className="text-zinc-900 font-semibold underline hover:text-rose-700"
                    >
                      Radar →
                    </Link>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-3 sm:p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs font-sans text-zinc-500">
                  <span className="uppercase">Sea Surface Temp (SST)</span>
                  <Thermometer className="h-4 w-4 text-rose-500" />
                </div>
                <div className="my-2">
                  <div className="text-lg sm:text-3xl font-bold font-sans tracking-tight text-zinc-950">
                    {location.sst}°C
                  </div>
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] sm:text-[11px] text-zinc-500 mt-1 leading-snug">
                    <span className="text-emerald-600 font-medium">+0.4°C</span>
                    <span>vs 10-yr climatology</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-zinc-100 flex items-center justify-between gap-2 text-[10px] font-sans text-zinc-400">
                  <span>Sensor: INSAT-3DR</span>
                  <span className="text-emerald-600">Optimal front</span>
                </div>
              </Card>
            )}

            {/* Card 2: Wind Speed & Direction - Standard View for Researchers & Operators */}
            <Card className="p-3 sm:p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-sans text-zinc-500">
                <span className="uppercase">Surface Wind</span>
                <Wind className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-sky-500" />
              </div>
              <div className="my-2">
                <div className="text-lg sm:text-3xl font-bold font-sans tracking-tight text-zinc-950">
                  {location.windSpeed} <span className="text-sm font-sans font-normal text-zinc-500">kts</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-600 mt-1 font-sans">
                  <span>
                    Direction: {location.windDirection} ({location.windDegrees}°)
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-zinc-100 flex items-center justify-between gap-2 text-[10px] font-sans text-zinc-400">
                <span>Beaufort: Force 4</span>
                <span className="text-zinc-700">Moderate Breeze</span>
              </div>
            </Card>

            {/* Card 3: Wave Height & Period - Standard View for Researchers & Operators */}
            <Card className="p-3 sm:p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-sans text-zinc-500">
                <span className="uppercase">Wave State (SWH)</span>
                <Waves className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-blue-500" />
              </div>
              <div className="my-2">
                <div className="text-lg sm:text-3xl font-bold font-sans tracking-tight text-zinc-950">
                  {location.waveHeight} <span className="text-sm font-sans font-normal text-zinc-500">m</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] sm:text-[11px] text-zinc-500 mt-1 leading-snug">
                  <span>Period: {location.wavePeriod}s</span>
                  <span>•</span>
                  <span>Swell: {location.swellHeight}m</span>
                </div>
              </div>
              <div className="pt-2 border-t border-zinc-100 flex items-center justify-between gap-2 text-[10px] font-sans text-zinc-400">
                <span>Buoy: {location.id.toUpperCase()}-AD02</span>
                <span className={location.waveHeight > 2.0 ? "text-amber-600" : "text-emerald-600"}>
                  {location.waveHeight > 2.0 ? "Rough Sea" : "Moderate"}
                </span>
              </div>
            </Card>
          </>
        )}

        {/* Card 4: Marine Risk Index - Always Retained */}
        <Card className="p-3 sm:p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-sans text-zinc-500">
            <span className="font-medium uppercase leading-tight tracking-wide">{t("m.riskRating")}</span>
            <ShieldAlert
              className={`h-4 w-4 ${
                location.riskLevel === "Low"
                  ? "text-emerald-500"
                  : location.riskLevel === "Moderate"
                  ? "text-amber-500"
                  : "text-rose-500"
              }`}
            />
          </div>
          <div className="my-2">
            <div className="text-lg sm:text-3xl font-bold font-sans tracking-tight text-zinc-950">
              {location.riskScore}
              <span className="text-sm font-sans font-normal text-zinc-400">/100</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold mt-1">
              <span
                className={
                  location.riskLevel === "Low"
                    ? "text-emerald-600"
                    : location.riskLevel === "Moderate"
                    ? "text-amber-600"
                    : "text-rose-600"
                }
              >
                {riskLevelLabel(t, location.riskLevel)}
              </span>
            </div>
          </div>
          <div className="pt-2 border-t border-zinc-100 flex items-center justify-between gap-2 text-[10px] font-sans text-zinc-400">
            <span>{t("m.wavesWindSwell")}</span>
            {/* Researchers have no Risk & Safety section; send them to the
                sea-state detail they do have. */}
            <Link
              href={role === "researcher" ? "/app/weather" : "/app/risk"}
              className="text-zinc-900 underline"
            >
              {role === "researcher" ? "Sea state →" : t("dash.checkMyTrip")}
            </Link>
          </div>
        </Card>
      </div>

      {/* Dialog for Live Harbour Fish Market & Price Modifications */}
      <Dialog open={marketModalOpen} onOpenChange={setMarketModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Fish className="h-5 w-5 text-emerald-600" />
              <DialogTitle className="text-base sm:text-lg">
                {marketData.harbourName} — Market Board
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Live wholesale APMC auction rates, daily price modifications, and morning catch clearance.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200">
                <span className="text-[10px] text-zinc-500 block">Auction Session</span>
                <span className="font-semibold text-zinc-900">{marketData.auctionTime}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200">
                <span className="text-[10px] text-zinc-500 block">Total Landings</span>
                <span className="font-semibold text-zinc-900">{marketData.landingVolumeText}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200">
                <span className="text-[10px] text-zinc-500 block">Clearance Rate</span>
                <span className="font-semibold text-emerald-700">{marketData.clearanceRate} Sold</span>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200">
                <span className="text-[10px] text-zinc-500 block">Trading Pulse</span>
                <span className="font-semibold text-zinc-900">{marketData.priceUpdateNote}</span>
              </div>
            </div>

            <div className="border border-zinc-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-100 text-zinc-700 font-semibold border-b border-zinc-200">
                  <tr>
                    <th className="py-2.5 px-3">Fish Species</th>
                    <th className="py-2.5 px-3">Wholesale Rate</th>
                    <th className="py-2.5 px-3">24h Modification</th>
                    <th className="py-2.5 px-3">Demand</th>
                    <th className="py-2.5 px-3 text-right">Landed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-sans">
                  {marketData.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-zinc-50/80">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-zinc-900">{item.species}</div>
                        <div className="text-[10px] text-zinc-500">{item.localName}</div>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-zinc-950">
                        ₹{item.pricePerKg} <span className="text-[10px] font-normal text-zinc-500">/kg</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-medium ${
                            item.trend === "up"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : item.trend === "down"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-zinc-100 text-zinc-600 border border-zinc-200"
                          }`}
                        >
                          {item.trend === "up" && <TrendingUp className="h-3 w-3 inline" />}
                          {item.trend === "down" && <TrendingDown className="h-3 w-3 inline" />}
                          {item.trend === "stable" && <Minus className="h-3 w-3 inline" />}
                          {item.priceChange24h > 0
                            ? `+₹${item.priceChange24h} (+${item.priceChangePercent}%)`
                            : item.priceChange24h < 0
                            ? `-₹${Math.abs(item.priceChange24h)} (${item.priceChangePercent}%)`
                            : "No change"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[10px] font-semibold ${
                            item.demandLevel === "Very High"
                              ? "text-emerald-700"
                              : item.demandLevel === "High"
                              ? "text-blue-700"
                              : "text-zinc-600"
                          }`}
                        >
                          {item.demandLevel}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-zinc-800">
                        {item.landingTons} MT
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 text-xs text-zinc-600 space-y-1">
              <div className="font-semibold text-zinc-900 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-zinc-700" />
                <span>Market Advisory for Fishermen</span>
              </div>
              <p>
                {marketData.benchmarkSpecies} and export grade catches are seeing active bidding. Boats landing before 09:30 IST secure the best auction premiums.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog for the nearby shoal detail */}
      <Dialog open={schoolModalOpen} onOpenChange={setSchoolModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Radar className="h-5 w-5 text-indigo-600" />
              <DialogTitle className="text-base sm:text-lg">
                {schoolData.zoneName}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Where fish are gathering right now, and how strong the shoal is
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-semibold text-emerald-700 block">Biomass Surge Rate</span>
                <span className="text-xl font-bold text-emerald-950">{schoolData.biomassSurge} Biomass Aggregation</span>
              </div>
              <span className="text-xs font-semibold px-2 py-1 rounded bg-emerald-600 text-white">
                {schoolData.growthRateText}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-zinc-700">
              <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200">
                <span className="text-[10px] text-zinc-500 block">School Composition</span>
                <span className="font-semibold text-zinc-900">{schoolData.schoolType}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200">
                <span className="text-[10px] text-zinc-500 block">Estimated Biomass</span>
                <span className="font-semibold text-zinc-900">{schoolData.estimatedBiomassMT}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200">
                <span className="text-[10px] text-zinc-500 block">Depth Range</span>
                <span className="font-semibold text-zinc-900">{schoolData.depthRange}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200">
                <span className="text-[10px] text-zinc-500 block">Location & Bearing</span>
                <span className="font-semibold text-zinc-900">{schoolData.distanceBearing}</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 space-y-1">
              <span className="text-[10px] uppercase font-semibold text-zinc-500 block">Satellite Environmental Trigger</span>
              <p className="text-zinc-800">{schoolData.environmentalTrigger}</p>
            </div>

            <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 space-y-1">
              <span className="text-[10px] uppercase font-semibold text-zinc-500 block">Recommended Fishing Gear</span>
              <p className="text-zinc-800 font-medium">{schoolData.recommendedGear}</p>
            </div>

            <p className="text-[11px] text-zinc-500 italic">
              {schoolData.schoolAlert}
            </p>

            <Link href="/app/fishing-zones" className="block pt-1">
              <Button className="w-full bg-zinc-950 hover:bg-zinc-800 text-white text-xs h-9">
                Open Full PFZ Coordinates & Navigation
              </Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog for Live Disaster Prediction & Warning Bulletin */}
      <Dialog open={disasterModalOpen} onOpenChange={setDisasterModalOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
              <DialogTitle className="text-base sm:text-lg">
                Disaster Prediction & Early Warning
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-zinc-500">
              Sector: {location.name} • Forecast Provider: {operatorDisaster.source}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            <div className="p-3 bg-rose-50/60 border border-rose-200 rounded-lg">
              <div className="flex items-center justify-between font-sans">
                <span className="font-bold text-rose-950 text-sm">{operatorDisaster.type}</span>
                <span className="text-[10px] font-semibold bg-rose-200 text-rose-800 px-2 py-0.5 rounded">
                  {operatorDisaster.severity} Severity
                </span>
              </div>
              <p className="mt-1.5 text-zinc-900 font-semibold leading-relaxed">
                {operatorDisaster.title}
              </p>
              <p className="mt-1 text-zinc-600 text-[11px] leading-relaxed">
                {operatorDisaster.summary}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 font-sans">
              <div className="p-2.5 rounded-lg border border-zinc-200 bg-zinc-50">
                <span className="text-[10px] text-zinc-400 block uppercase">Issued Timeline</span>
                <span className="font-semibold text-zinc-900">{operatorDisaster.issuedAt}</span>
              </div>
              <div className="p-2.5 rounded-lg border border-zinc-200 bg-zinc-50">
                <span className="text-[10px] text-zinc-400 block uppercase">Forecast Horizon</span>
                <span className="font-semibold text-zinc-900">{operatorDisaster.expiresAt}</span>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-zinc-200 bg-zinc-50">
              <span className="text-[10px] font-semibold text-zinc-500 uppercase block mb-1">
                Mandatory Operational Action
              </span>
              <p className="text-zinc-700 leading-relaxed font-sans text-[11px]">
                {operatorDisaster.operationalAction}
              </p>
            </div>

            <div className="p-3 rounded-lg border border-zinc-200 bg-white">
              <span className="text-[10px] font-semibold text-zinc-500 uppercase block mb-1">
                Affected Coastal Zones
              </span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {operatorDisaster.affectedRegions.map((region) => (
                  <span
                    key={region}
                    className="px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200 text-[10px] text-zinc-800"
                  >
                    {region}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDisasterModalOpen(false)}
                className="text-xs h-8"
              >
                Close
              </Button>
              <Link href="/app/alerts">
                <Button size="sm" className="text-xs h-8 bg-zinc-950 text-white hover:bg-zinc-800">
                  Open Disaster Early Warning Center →
                </Button>
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

