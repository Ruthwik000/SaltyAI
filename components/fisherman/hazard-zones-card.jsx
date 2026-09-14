"use client";

/**
 * Water to keep clear of.
 *
 * Two things a fisherman can act on: an INCOIS advisory in force for this
 * district, and how close the edge of Indian waters is. Crossing that line is
 * how boats get detained, so the distance and the direction are shown even
 * when nothing is wrong, not only when it is close.
 *
 * The honest part is at the bottom. India publishes no machine-readable feed
 * of gazetted restricted or no-fishing areas, so this card is explicit that it
 * does not cover them. An empty list here means "nothing found in what could
 * be checked", never "the sea is clear" — and when a source is down the card
 * says which one, because those two must not look the same on a safety screen.
 */

import * as React from "react";
import { ShieldAlert, ShieldCheck, Compass } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SpeakButton } from "@/components/fisherman/speak-button";
import { fetchHazardZones } from "@/lib/marine-live";
import { useT } from "@/lib/i18n";
import { ignoreAbort } from "@/lib/fisherman-api";

/** The API answers in English; the card must not. */
const KIND_KEY = {
  "high wave": "hazard.kind.highWave",
  "swell surge": "hazard.kind.swellSurge",
  "maritime boundary": "hazard.kind.boundary",
};

const TONE = {
  red: "border-rose-200 bg-rose-50 text-rose-900",
  orange: "border-orange-200 bg-orange-50 text-orange-900",
  yellow: "border-amber-200 bg-amber-50 text-amber-900",
};

export function HazardZonesCard({ location }) {
  const { t } = useT();
  // The result carries the place it belongs to, so "still loading" is a
  // comparison rather than a setState inside the effect body.
  const key = `${location?.lat},${location?.lon},${location?.name},${location?.state}`;
  const [state, setState] = React.useState({ status: "loading", key: null });

  React.useEffect(() => {
    if (location?.lat == null || location?.lon == null) return undefined;
    const controller = new AbortController();
    fetchHazardZones(
      location.lat,
      location.lon,
      location.name,
      location.state,
      controller.signal
    ).then((result) => {
      if (controller.signal.aborted) return;
      setState(
        result.ok
          ? { status: "ready", key, data: result.data }
          : { status: "error", key, error: result.error }
      );
    }).catch(ignoreAbort);
    return () => controller.abort();
  }, [key, location?.lat, location?.lon, location?.name, location?.state]);

  const status = state.key === key ? state.status : "loading";
  const data = state.key === key ? state.data : undefined;
  const hazards = data?.hazards || [];
  const eez = data?.eez;
  const partial = data?.sourcesNotChecked?.length > 0;

  const spoken = data
    ? hazards.length
      ? hazards
          .slice(0, 2)
          .map((hazard) => hazard.detail)
          .join(" ")
      : t("hazard.spokenClear")
    : "";

  return (
    <Card className="border-zinc-200 bg-white">
      <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-100 pb-3">
        <div className="flex items-center gap-2">
          <div
            className={`rounded-md border p-1 ${
              hazards.length
                ? "border-rose-200/80 bg-rose-50 text-rose-600"
                : "border-emerald-200/80 bg-emerald-50 text-emerald-600"
            }`}
          >
            {hazards.length ? (
              <ShieldAlert className="h-4 w-4" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
          </div>
          <div>
            <CardTitle className="text-sm font-semibold text-zinc-950">
              {t("hazard.title")}
            </CardTitle>
            <span className="text-[10px] text-zinc-500">{t("hazard.subtitle")}</span>
          </div>
        </div>
        {spoken && <SpeakButton size="sm" text={spoken} />}
      </CardHeader>

      <CardContent className="space-y-3 pt-4">
        {status === "loading" && (
          <p className="text-xs text-zinc-500">{t("common.loading")}</p>
        )}

        {status === "error" && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            {t("hazard.unavailable")}
          </p>
        )}

        {status === "ready" && (
          <>
            {hazards.length === 0 && (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-900">
                {t("hazard.nothingFound")}
              </p>
            )}

            {hazards.slice(0, 4).map((hazard, index) => (
              <div
                key={`${hazard.kind}-${index}`}
                className={`rounded-xl border p-3 text-xs ${
                  TONE[hazard.severity] || "border-zinc-200 bg-zinc-50 text-zinc-800"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
                    {KIND_KEY[hazard.kind] ? t(KIND_KEY[hazard.kind]) : hazard.kind}
                  </span>
                  {hazard.area && (
                    <span className="truncate text-[10px] opacity-70">{hazard.area}</span>
                  )}
                </div>
                <p className="mt-1 leading-snug">{hazard.detail}</p>
              </div>
            ))}

            {eez?.distanceKm != null && (
              <div className="flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <Compass className="h-4 w-4 shrink-0 text-zinc-500" />
                <p className="text-xs text-zinc-700">
                  {t("hazard.eezDistance", {
                    km: Math.round(eez.distanceKm),
                    direction: t(`compass.${eez.bearingText}`),
                  })}
                </p>
              </div>
            )}

            {partial && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-900">
                {t("hazard.partial", { sources: data.sourcesNotChecked.join(", ") })}
              </p>
            )}

            <p className="text-[10px] leading-snug text-zinc-500">{t("hazard.provenance")}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
