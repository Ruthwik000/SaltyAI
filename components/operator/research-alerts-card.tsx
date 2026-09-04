"use client";

/**
 * Findings escalated by researchers, as coastal operations sees them.
 *
 * Each one carries the evidence the researcher based it on, so an operator can
 * judge it rather than just receive it.
 */

import * as React from "react";
import { Check, FlaskConical, Microscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ALERT_CATEGORIES,
  acknowledgeResearchAlert,
  severityTone,
  useResearchAlerts,
} from "@/lib/research-alerts";

function categoryLabel(id: string) {
  return ALERT_CATEGORIES.find((item) => item.id === id)?.label || "Finding";
}

export function ResearchAlertsCard({ limit }: { limit?: number }) {
  const alerts = useResearchAlerts();
  const [expanded, setExpanded] = React.useState<string | null>(null);

  const shown = limit ? alerts.slice(0, limit) : alerts;
  const pending = alerts.filter((alert) => !alert.acknowledgedAt).length;

  if (alerts.length === 0) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-zinc-950">
          <Microscope className="h-4 w-4 text-indigo-600" />
          <span>Research findings</span>
        </h2>
        <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
          Nothing escalated from the research console yet. Findings raised by
          researchers — species decline, disease events, developing threats —
          land here with the evidence behind them.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-zinc-100 p-4">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-zinc-950">
          <Microscope className="h-4 w-4 text-indigo-600" />
          <span>Research findings</span>
        </h2>
        {pending > 0 && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
            {pending} awaiting review
          </span>
        )}
      </div>

      <ul className="divide-y divide-zinc-100">
        {shown.map((alert) => {
          const isOpen = expanded === alert.id;
          return (
            <li key={alert.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${severityTone(
                        alert.severity
                      )}`}
                    >
                      {alert.severity}
                    </span>
                    <span className="font-sans text-[10px] uppercase tracking-wide text-zinc-400">
                      {categoryLabel(alert.category)}
                    </span>
                  </div>
                  <h3 className="mt-1 text-xs font-semibold leading-snug text-zinc-950">
                    {alert.title}
                  </h3>
                  <p className="mt-0.5 font-sans text-[10px] text-zinc-500">
                    {alert.region} · {alert.reportedBy} ·{" "}
                    {new Date(alert.createdAt).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
                {alert.acknowledgedAt ? (
                  <span className="flex shrink-0 items-center gap-1 text-[10px] font-medium text-emerald-700">
                    <Check className="h-3 w-3" />
                    <span>Acknowledged</span>
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => acknowledgeResearchAlert(alert.id)}
                    className="h-7 shrink-0 border-zinc-200 text-[11px]"
                  >
                    Acknowledge
                  </Button>
                )}
              </div>

              <p className="mt-2 text-[11px] leading-relaxed text-zinc-700">
                {alert.summary}
              </p>

              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : alert.id)}
                className="mt-2 flex items-center gap-1 text-[11px] font-medium text-zinc-600 underline underline-offset-2"
              >
                <FlaskConical className="h-3 w-3" />
                <span>{isOpen ? "Hide evidence" : "Show evidence"}</span>
              </button>

              {isOpen && (
                <div className="mt-2 space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  <p className="text-[11px] leading-relaxed text-zinc-700">
                    {alert.evidence}
                  </p>
                  {alert.datasets.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {alert.datasets.map((id) => (
                        <span
                          key={id}
                          className="rounded bg-white px-1.5 py-0.5 font-sans text-[10px] text-zinc-600 ring-1 ring-zinc-200"
                        >
                          {id}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
