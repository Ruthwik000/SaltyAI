"use client";

/**
 * Lightning and storms.
 *
 * A small open boat has no lightning protection at all, so a thunderstorm hour
 * matters more here than a wave height does. INCOIS cannot answer this — its
 * Ocean State Forecast is an ocean model with no thunderstorm signal — so the
 * data is Open-Meteo and the card says so.
 *
 * It deliberately does NOT turn a high instability reading into a cyclone
 * warning. A named cyclone comes from IMD, and the card sends the reader there
 * rather than inventing one from CAPE.
 */

import * as React from "react";
import { CloudLightning, CloudSun, Wind } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SpeakButton } from "@/components/fisherman/speak-button";
import { fetchStorms, localTime, localDay } from "@/lib/marine-live";
import { useT } from "@/lib/i18n";

const INSTABILITY_TONE = {
  extreme: "border-rose-200 bg-rose-50 text-rose-800",
  strong: "border-orange-200 bg-orange-50 text-orange-800",
  moderate: "border-amber-200 bg-amber-50 text-amber-800",
  low: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

export function StormCard({ location }) {
  const { t } = useT();
  // The result carries the position it belongs to, so "still loading" is a
  // comparison rather than a setState inside the effect body.
  const key = `${location?.lat},${location?.lon}`;
  const [state, setState] = React.useState({ status: "loading", key: null });

  React.useEffect(() => {
    if (location?.lat == null || location?.lon == null) return undefined;
    const controller = new AbortController();
    fetchStorms(location.lat, location.lon, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      setState(
        result.ok
          ? { status: "ready", key, data: result.data }
          : { status: "error", key, error: result.error }
      );
    });
    return () => controller.abort();
  }, [key, location?.lat, location?.lon]);

  const status = state.key === key ? state.status : "loading";
  const data = state.key === key ? state.data : undefined;
  const storms = data?.thunderstorms || [];
  const clear = data && storms.length === 0;

  const spoken = data
    ? clear
      ? t("storm.spokenClear")
      : t("storm.spokenWarning", {
          count: storms.length,
          time: localTime(storms[0].time),
        })
    : "";

  return (
    <Card className="border-zinc-200 bg-white">
      <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-100 pb-3">
        <div className="flex items-center gap-2">
          <div
            className={`rounded-md border p-1 ${
              storms.length
                ? "border-orange-200/80 bg-orange-50 text-orange-600"
                : "border-zinc-200 bg-zinc-50 text-zinc-500"
            }`}
          >
            <CloudLightning className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold text-zinc-950">
              {t("storm.title")}
            </CardTitle>
            <span className="text-[10px] text-zinc-500">{t("storm.subtitle")}</span>
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
            {t("storm.unavailable")}
          </p>
        )}

        {status === "ready" && (
          <>
            <div
              className={`rounded-xl border p-3 ${
                clear
                  ? "border-emerald-200 bg-emerald-50/70 text-emerald-900"
                  : "border-orange-200 bg-orange-50/70 text-orange-900"
              }`}
            >
              <p className="text-sm font-semibold">
                {clear ? t("storm.noneForecast") : t("storm.hours", { count: storms.length })}
              </p>
              {!clear && (
                <p className="mt-0.5 text-xs">
                  {t("storm.firstAt", {
                    time: localTime(storms[0].time),
                    day: localDay(storms[0].time),
                  })}
                </p>
              )}
            </div>

            {storms.length > 1 && (
              <div className="flex flex-wrap gap-1.5">
                {storms.slice(0, 6).map((storm) => (
                  <span
                    key={storm.time}
                    className="rounded-full border border-orange-200 bg-white px-2 py-0.5 text-[10px] text-orange-700"
                  >
                    {localTime(storm.time)}
                  </span>
                ))}
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2">
                <CloudSun className="mx-auto h-3.5 w-3.5 text-zinc-500" />
                <p className="mt-1 truncate text-[11px] font-medium text-zinc-800">
                  {data.now.description}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2">
                <Wind className="mx-auto h-3.5 w-3.5 text-zinc-500" />
                <p className="mt-1 text-[11px] font-medium text-zinc-800">
                  {data.maxGustMs != null
                    ? t("storm.gust", { value: Math.round(data.maxGustMs) })
                    : "—"}
                </p>
              </div>
              <div
                className={`rounded-lg border p-2 ${
                  INSTABILITY_TONE[data.now.instability] || "border-zinc-200 bg-zinc-50 text-zinc-800"
                }`}
              >
                <p className="text-[10px] uppercase tracking-wide opacity-70">
                  {t("storm.instability")}
                </p>
                <p className="mt-0.5 text-[11px] font-medium">
                  {data.now.instability
                    ? t(`storm.instability.${data.now.instability}`)
                    : "—"}
                </p>
              </div>
            </div>

            {/* Never let a CAPE reading become a cyclone warning. */}
            <p className="text-[10px] leading-snug text-zinc-500">{t("storm.provenance")}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
