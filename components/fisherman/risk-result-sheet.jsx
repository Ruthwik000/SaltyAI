"use client";

import * as React from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Loader2,
  Plus,
  ShieldAlert,
  TriangleAlert,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataBadge } from "@/components/fisherman/data-badge";
import { SpeakButton } from "@/components/fisherman/speak-button";
import {
  riskLevelLabel,
  riskSpeech,
  riskVerdictLabel,
} from "@/components/fisherman/speech-text";
import { useT } from "@/lib/i18n";

const LEVEL_STYLES = {
  Low: {
    ring: "border-emerald-200 bg-emerald-50 text-emerald-700",
    chip: "bg-emerald-600",
    text: "text-emerald-700",
  },
  Moderate: {
    ring: "border-amber-200 bg-amber-50 text-amber-700",
    chip: "bg-amber-500",
    text: "text-amber-700",
  },
  Elevated: {
    ring: "border-orange-200 bg-orange-50 text-orange-700",
    chip: "bg-orange-500",
    text: "text-orange-700",
  },
  High: {
    ring: "border-rose-200 bg-rose-50 text-rose-700",
    chip: "bg-rose-600",
    text: "text-rose-700",
  },
};

/**
 * The computed trip assessment.
 *
 * A risk score is a safety judgement, so when it did not come from the model
 * the sheet says so in the badge and in a banner above the score — it is shown
 * as an illustration of the output, never as a verdict to sail on.
 */
export function RiskResultSheet({
  open,
  loading,
  result,
  source,
  reason,
  destinationName,
  onAddToTrips,
  added = false,
  onClose,
}) {
  const { t } = useT();

  React.useEffect(() => {
    if (!open) return;
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const styles = result ? LEVEL_STYLES[result.level] : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("risk.result")}
        className="relative z-10 flex h-[100dvh] w-full flex-col border-zinc-200 bg-white shadow-2xl sm:h-auto sm:max-h-[88dvh] sm:max-w-lg sm:rounded-2xl sm:border"
      >
        <div
          className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-4 py-3"
          style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-zinc-700" />
            <span className="text-sm font-semibold text-zinc-950">
              {t("risk.result")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {result && <SpeakButton size="sm" text={riskSpeech(t, result)} />}
            {result && <DataBadge source={source} reason={reason} />}
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 active:bg-zinc-100"
              aria-label={t("common.close")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-2 px-4 py-12 text-xs text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{t("risk.checking")}</span>
          </div>
        )}

        {!loading && !result && (
          <div className="space-y-4 px-4 py-8">
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <div className="text-xs leading-relaxed text-amber-900">
                <strong className="block">Risk assessment unavailable</strong>
                The SALTY risk service did not respond, so there is no score for this
                trip. Do not treat that as a safe result — check the official IMD and
                INCOIS bulletins before you sail.
                {reason && (
                  <span className="mt-1 block text-[11px] text-amber-800/80">
                    {reason}
                  </span>
                )}
              </div>
            </div>
            <Button onClick={onClose} variant="outline" className="h-10 w-full text-xs">
              {t("common.close")}
            </Button>
          </div>
        )}

        {!loading && result && styles && (
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
            {source === "demo" && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" />
                <p className="text-[11px] leading-relaxed text-amber-900">
                  <strong>Demo estimate.</strong> The SALTY risk model is not reachable,
                  so this score was worked out on this device from the bundled sample
                  conditions. Do not sail on it — check the official IMD and INCOIS
                  bulletins.
                </p>
              </div>
            )}

            {/* Score */}
            <div
              className={`flex items-center gap-4 rounded-xl border p-4 ${styles.ring}`}
            >
              <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-full bg-white/70">
                <span className="font-sans text-2xl font-bold leading-none text-zinc-950">
                  {result.score}
                </span>
                <span className="text-[9px] text-zinc-500">/100</span>
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold">
                  {riskVerdictLabel(t, result.level)} · {riskLevelLabel(t, result.level)}
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-zinc-700">
                  {result.summary}
                </p>
              </div>
            </div>

            {result.safeWindow && (
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5">
                <span className="block text-[10px] uppercase tracking-wide text-zinc-400">
                  Safe departure window
                </span>
                <span className="text-sm font-semibold text-zinc-950">
                  {result.safeWindow}
                </span>
              </div>
            )}

            {/* Contributing factors */}
            {result.factors.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                  {t("risk.whatDrivesIt")}
                </h3>
                <div className="space-y-2">
                  {result.factors.map((factor) => (
                    <div
                      key={factor.name}
                      className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-zinc-900">
                          {factor.name}
                        </div>
                        <div className="font-sans text-[11px] text-zinc-500">
                          {factor.value}
                        </div>
                      </div>
                      <div className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className={`h-full rounded-full ${
                            factor.score < 34
                              ? "bg-emerald-500"
                              : factor.score < 67
                                ? "bg-amber-500"
                                : "bg-rose-500"
                          }`}
                          style={{
                            width: `${Math.min(100, Math.max(0, factor.score))}%`,
                          }}
                        />
                      </div>
                      <span className="w-8 shrink-0 text-right font-sans text-[11px] font-semibold text-zinc-900">
                        {factor.score}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                  {t("risk.advice")}
                </h3>
                <ul className="space-y-1.5">
                  {result.recommendations.map((item, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-xs text-zinc-700"
                    >
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Precautions */}
            {result.precautions.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                  {t("risk.precautions")} — {destinationName}
                </h3>
                <ul className="space-y-1.5 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                  {result.precautions.map((item, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-xs text-amber-900"
                    >
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div
              className="flex flex-col gap-2 pb-2"
              style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
            >
              {onAddToTrips && (
                <Button
                  onClick={onAddToTrips}
                  disabled={added}
                  className={`h-11 w-full gap-2 text-xs ${
                    added
                      ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
                      : "bg-emerald-600 text-white hover:bg-emerald-700"
                  }`}
                >
                  {added ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span>{t("risk.added")}</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      <span>{t("risk.addToTrips")}</span>
                    </>
                  )}
                </Button>
              )}
              <Button
                onClick={onClose}
                variant={onAddToTrips ? "outline" : "default"}
                className={`h-11 w-full text-xs ${
                  onAddToTrips
                    ? "border-zinc-200"
                    : "bg-zinc-950 text-white hover:bg-zinc-800"
                }`}
              >
                {t("common.close")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
