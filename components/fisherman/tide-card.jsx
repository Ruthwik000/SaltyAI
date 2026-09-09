"use client";

/**
 * When the water turns.
 *
 * The tide decides when a small boat can cross a bar and when it can get back
 * in, so this is one of the few numbers on the console that changes what
 * someone does in the next hour. It is shown as a time and a wait — "high
 * water 17:40, in 3 hours" — because "1.31 m MSL" answers a question nobody
 * standing on a beach is asking.
 *
 * Source is Open-Meteo, not INCOIS, and the card says so. INCOIS has no tide
 * service at all: its own predicted-tide link is an under-construction page.
 */

import * as React from "react";
import { Waves, ArrowUp, ArrowDown } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SpeakButton } from "@/components/fisherman/speak-button";
import { fetchTides, localTime, hoursUntil } from "@/lib/marine-live";
import { useT } from "@/lib/i18n";

function waitText(t, iso, offsetSeconds) {
  const hours = hoursUntil(iso, offsetSeconds);
  if (hours === null || hours < 0) return null;
  if (hours < 1) return t("tide.inMinutes", { count: Math.max(1, Math.round(hours * 60)) });
  return t("tide.inHours", { count: Math.round(hours) });
}

function Turn({ turn, label, icon: Icon, tone, t, offsetSeconds }) {
  if (!turn) return null;
  const wait = waitText(t, turn.time, offsetSeconds);
  return (
    <div className={`flex items-center gap-3 rounded-xl border p-3 ${tone}`}>
      <Icon className="h-4 w-4 shrink-0" />
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide opacity-70">{label}</p>
        <p className="text-lg font-semibold leading-tight">{localTime(turn.time)}</p>
        {wait && <p className="text-[11px] opacity-80">{wait}</p>}
      </div>
    </div>
  );
}

export function TideCard({ location }) {
  const { t } = useT();
  // The result carries the position it belongs to. Comparing that against the
  // current one is what tells us whether we are still loading, without setting
  // state inside the effect body — which React 19 rightly flags, because it
  // costs a second render pass on every mount.
  const key = `${location?.lat},${location?.lon}`;
  const [state, setState] = React.useState({ status: "loading", key: null });

  React.useEffect(() => {
    if (location?.lat == null || location?.lon == null) return undefined;
    const controller = new AbortController();
    fetchTides(location.lat, location.lon, controller.signal).then((result) => {
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
  const spoken = data
    ? [
        data.nextHigh && t("tide.spokenHigh", { time: localTime(data.nextHigh.time) }),
        data.nextLow && t("tide.spokenLow", { time: localTime(data.nextLow.time) }),
      ]
        .filter(Boolean)
        .join(" ")
    : "";

  return (
    <Card className="border-zinc-200 bg-white">
      <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-md border border-sky-200/80 bg-sky-50 p-1 text-sky-600">
            <Waves className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold text-zinc-950">
              {t("tide.title")}
            </CardTitle>
            <span className="text-[10px] text-zinc-500">{t("tide.subtitle")}</span>
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
            {t("tide.unavailable")}
          </p>
        )}

        {status === "ready" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Turn
                turn={data.nextHigh}
                label={t("tide.high")}
                offsetSeconds={data.utcOffsetSeconds}
                icon={ArrowUp}
                tone="border-sky-200 bg-sky-50/70 text-sky-900"
                t={t}
              />
              <Turn
                turn={data.nextLow}
                label={t("tide.low")}
                offsetSeconds={data.utcOffsetSeconds}
                icon={ArrowDown}
                tone="border-zinc-200 bg-zinc-50 text-zinc-800"
                t={t}
              />
            </div>

            {data.turningPoints?.length > 2 && (
              <div className="flex flex-wrap gap-1.5">
                {data.turningPoints.slice(0, 6).map((turn) => (
                  <span
                    key={`${turn.kind}-${turn.time}`}
                    className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[10px] text-zinc-600"
                  >
                    {turn.kind === "high" ? "▲" : "▼"} {localTime(turn.time)}
                  </span>
                ))}
              </div>
            )}

            {/* Not an INCOIS product, and not a depth. Both matter enough to
                stay on the card rather than live in a tooltip. */}
            <p className="text-[10px] leading-snug text-zinc-500">{t("tide.provenance")}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
