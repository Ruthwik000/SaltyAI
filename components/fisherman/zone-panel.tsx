"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Compass,
  Fish,
  Gauge,
  Loader2,
  ShieldCheck,
  Waves,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConditionsGrid } from "@/components/fisherman/conditions-grid";
import { DataBadge } from "@/components/fisherman/data-badge";
import { formatCoord } from "@/lib/geo";
import { useT } from "@/lib/i18n";
import { SpeakButton } from "@/components/fisherman/speak-button";
import { zoneSpeech } from "@/components/fisherman/speech-text";
import type {
  DataSource,
  PfzZoneFeature,
  ZoneDetail,
} from "@/lib/fisherman-api";

interface ZonePanelProps {
  zones: PfzZoneFeature[];
  zonesSource: DataSource;
  zonesReason?: string;
  selectedZoneId: string | null;
  detail: ZoneDetail | null;
  detailSource: DataSource;
  detailLoading: boolean;
  onSelect: (zoneId: string) => void;
  onBack: () => void;
  portName: string;
}

/**
 * The content of the Fishing Zones side panel (desktop) and bottom sheet
 * (mobile): a distance-sorted zone list, and the detail view for whichever
 * zone the fisherman tapped on the map.
 */
export function ZonePanel({
  zones,
  zonesSource,
  zonesReason,
  selectedZoneId,
  detail,
  detailSource,
  detailLoading,
  onSelect,
  onBack,
  portName,
}: ZonePanelProps) {
  const { t } = useT();
  const selectedZone = zones.find((zone) => zone.id === selectedZoneId) || null;

  if (selectedZoneId) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-3">
          <button
            type="button"
            onClick={onBack}
            className="-ml-1 flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 active:bg-zinc-100"
            aria-label={t("zones.back")}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="text-xs font-semibold text-zinc-950">{t("zones.detail")}</span>
          <div className="ml-auto flex items-center gap-1.5">
            {selectedZone && <SpeakButton size="sm" text={zoneSpeech(t, selectedZone)} />}
            {!detailLoading && <DataBadge source={detailSource} />}
          </div>
        </div>

        {detailLoading && (
          <div className="flex items-center gap-2 px-4 py-8 text-xs text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{t("zones.loadingDetail")}</span>
          </div>
        )}

        {!detailLoading && !detail && (
          <div className="px-4 py-8 text-xs leading-relaxed text-zinc-500">
            {t("zones.detailUnavailable")}
          </div>
        )}

        {!detailLoading && detail && (
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <div>
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-base font-bold leading-snug text-zinc-950">
                  {detail.name}
                </h2>
                <Badge className="shrink-0 bg-emerald-600 text-[10px] text-white">
                  {detail.suitabilityScore}%
                </Badge>
              </div>
              <p className="mt-1 font-sans text-[11px] text-zinc-500">
                {formatCoord(detail.lat, detail.lon)}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2.5">
                <Compass className="mx-auto h-3.5 w-3.5 text-zinc-400" />
                <div className="mt-1 text-sm font-bold text-zinc-950">
                  {detail.distanceNM} {t("common.unit.nm")}
                </div>
                <div className="text-[10px] text-zinc-500">
                  {detail.bearing} ({detail.bearingDeg}°)
                </div>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2.5">
                <Waves className="mx-auto h-3.5 w-3.5 text-zinc-400" />
                <div className="mt-1 text-sm font-bold text-zinc-950">
                  {detail.depthMeters} {t("common.unit.m")}
                </div>
                <div className="text-[10px] text-zinc-500">{t("zones.depth")}</div>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2.5">
                <Gauge className="mx-auto h-3.5 w-3.5 text-zinc-400" />
                <div className="mt-1 text-sm font-bold text-zinc-950">
                  {detail.radiusNM} {t("common.unit.nm")}
                </div>
                <div className="text-[10px] text-zinc-500">{t("zones.radius")}</div>
              </div>
            </div>

            {/* Species */}
            <section className="space-y-2">
              <h3 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                <Fish className="h-3 w-3" />
                <span>{t("zones.speciesHere")}</span>
              </h3>
              {detail.species.length === 0 ? (
                <p className="text-xs text-zinc-500">{t("zones.noSpecies")}</p>
              ) : (
                <ul className="divide-y divide-zinc-100 overflow-hidden rounded-lg border border-zinc-200">
                  {detail.species.map((species) => (
                    <li
                      key={species.name}
                      className="flex items-center justify-between bg-white px-3 py-2.5"
                    >
                      <div>
                        <div className="text-xs font-semibold text-zinc-900">
                          {species.name}
                        </div>
                        {species.depthRange && (
                          <div className="text-[10px] text-zinc-500">
                            {species.depthRange}
                          </div>
                        )}
                      </div>
                      <span className="shrink-0 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                        {species.abundance}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Conditions at the zone coordinates */}
            <section className="space-y-2">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                {t("zones.weatherHere")}
              </h3>
              <ConditionsGrid conditions={detail.conditions} columns={2} />
            </section>

            {/* Advisory */}
            <section className="space-y-2">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                {t("zones.advisory")}
              </h3>
              <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700">
                <div className="flex justify-between gap-3">
                  <span className="text-zinc-500">{t("zones.gear")}</span>
                  <span className="text-right font-medium text-zinc-900">
                    {detail.recommendedGear}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-zinc-500">{t("zones.valid")}</span>
                  <span className="text-right font-medium text-zinc-900">
                    {detail.advisoryValidity}
                  </span>
                </div>
                {detail.notes.map((note, index) => (
                  <p key={index} className="text-[11px] leading-relaxed text-zinc-600">
                    {note}
                  </p>
                ))}
              </div>
            </section>

            <div className="flex flex-col gap-2 pb-2">
              <Link href={`/app/risk?zone=${encodeURIComponent(detail.zoneId)}`}>
                <Button className="h-10 w-full gap-1.5 bg-zinc-950 text-xs text-white hover:bg-zinc-800">
                  <ShieldCheck className="h-4 w-4" />
                  <span>{t("zones.checkSafety")}</span>
                </Button>
              </Link>
              <Link href={`/app/vessel?zone=${encodeURIComponent(detail.zoneId)}`}>
                <Button
                  variant="outline"
                  className="h-10 w-full gap-1.5 border-zinc-200 text-xs"
                >
                  <Compass className="h-4 w-4" />
                  <span>{t("zones.startTrip")}</span>
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-zinc-200 px-4 py-3">
        <div>
          <h2 className="text-xs font-semibold text-zinc-950">
            {t("zones.near", { port: portName })}
          </h2>
          <p className="text-[10px] text-zinc-500">
            {t("zones.count", { count: zones.length })}
          </p>
        </div>
        <DataBadge source={zonesSource} reason={zonesReason} />
      </div>

      <ul className="flex-1 divide-y divide-zinc-100 overflow-y-auto">
        {zones.map((zone) => (
          <li key={zone.id}>
            <button
              type="button"
              onClick={() => onSelect(zone.id)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left active:bg-zinc-50"
            >
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold text-zinc-950">
                  {zone.name}
                </div>
                <div className="mt-0.5 font-sans text-[11px] text-zinc-500">
                  {zone.distanceNM} {t("common.unit.nm")} · {zone.bearing} (
                  {zone.bearingDeg}°) · {zone.depthMeters} {t("common.unit.m")}
                </div>
                {zone.primarySpecies.length > 0 && (
                  <div className="mt-1 truncate text-[10px] text-zinc-400">
                    {zone.primarySpecies.slice(0, 3).join(", ")}
                  </div>
                )}
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-bold text-white ${
                  zone.suitabilityScore >= 90
                    ? "bg-emerald-600"
                    : zone.suitabilityScore >= 75
                    ? "bg-emerald-500"
                    : "bg-amber-500"
                }`}
              >
                {zone.suitabilityScore}%
              </span>
            </button>
          </li>
        ))}

        {zones.length === 0 && (
          <li className="px-4 py-8 text-center text-xs text-zinc-500">
            {t("zones.noneCoast")}
          </li>
        )}
      </ul>
    </div>
  );
}
