"use client";

/**
 * Researcher → coastal operations escalation.
 *
 * A finding is only actionable once someone can act on it, so this puts the
 * evidence and the ask in one place: what was observed, how serious it is,
 * where, and what it rests on. Submitted reports appear in the operator
 * console.
 */

import * as React from "react";
import { Check, ChevronDown, Radio, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KNOWN_INCOIS_DATASETS } from "@/lib/erddap";
import { useBookmarks } from "@/lib/dataset-bookmarks";
import { useMarine } from "@/lib/marine-context";
import {
  ALERT_CATEGORIES,
  ALERT_SEVERITIES,
  severityTone,
  submitResearchAlert,
  useResearchAlerts,
  withdrawResearchAlert,
  type AlertCategory,
  type AlertSeverity,
} from "@/lib/research-alerts";

const FIELD =
  "h-10 w-full rounded-lg border border-zinc-200 bg-white px-2.5 text-xs text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10";
const AREA =
  "w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10";
const LABEL = "mb-1 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500";

export function ReportFindingCard() {
  const { location, addOperatorNotification } = useMarine();
  const alerts = useResearchAlerts();
  const bookmarks = useBookmarks();
  // Offer what this researcher actually works with first.
  const citable = [
    ...bookmarks,
    ...KNOWN_INCOIS_DATASETS.filter((id) => !bookmarks.includes(id)),
  ];

  const [open, setOpen] = React.useState(false);
  const [category, setCategory] = React.useState<AlertCategory>("species");
  const [severity, setSeverity] = React.useState<AlertSeverity>("Warning");
  const [title, setTitle] = React.useState("");
  const [summary, setSummary] = React.useState("");
  const [evidence, setEvidence] = React.useState("");
  const [region, setRegion] = React.useState(location.name);
  const [datasets, setDatasets] = React.useState<string[]>([]);
  const [reportedBy, setReportedBy] = React.useState("");
  const [justSent, setJustSent] = React.useState(false);

  const canSubmit =
    title.trim().length > 3 && summary.trim().length > 10 && evidence.trim().length > 10;

  const toggleDataset = (id: string) =>
    setDatasets((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    const saved = submitResearchAlert({
      category,
      severity,
      title: title.trim(),
      summary: summary.trim(),
      evidence: evidence.trim(),
      region: region.trim() || location.name,
      datasets,
      reportedBy: reportedBy.trim() || "Marine researcher",
    });

    // Also raise it in the live session so an operator watching right now sees
    // it without a reload.
    addOperatorNotification({
      title: `Research finding: ${saved.title}`,
      message: `${saved.severity} · ${saved.region}. ${saved.summary}`,
      type: "general",
      severity:
        saved.severity === "Critical" || saved.severity === "Severe"
          ? "critical"
          : "warning",
      locationName: saved.region,
    });

    setTitle("");
    setSummary("");
    setEvidence("");
    setDatasets([]);
    setOpen(false);
    setJustSent(true);
    setTimeout(() => setJustSent(false), 4000);
  };

  const mine = alerts.slice(0, 4);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white">
      <div className="flex items-start justify-between gap-3 border-b border-zinc-100 p-4">
        <div className="min-w-0">
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-zinc-950">
            <Radio className="h-4 w-4 text-amber-600" />
            <span>Report a finding to coastal operations</span>
          </h2>
          <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">
            Species decline, a disease or mortality event, a developing weather
            threat — send it with the evidence behind it.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="flex shrink-0 items-center gap-1 rounded-md border border-zinc-200 px-2.5 py-1.5 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50"
        >
          <span>{open ? "Cancel" : "New report"}</span>
          <ChevronDown
            className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {justSent && (
        <p className="flex items-center gap-1.5 border-b border-emerald-100 bg-emerald-50 px-4 py-2 text-[11px] text-emerald-800">
          <Check className="h-3.5 w-3.5" />
          <span>Sent to coastal operations.</span>
        </p>
      )}

      {open && (
        <form onSubmit={handleSubmit} className="space-y-3 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={LABEL} htmlFor="finding-category">
                What kind of finding
              </label>
              <select
                id="finding-category"
                value={category}
                onChange={(event) => setCategory(event.target.value as AlertCategory)}
                className={FIELD}
              >
                {ALERT_CATEGORIES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL} htmlFor="finding-severity">
                How serious
              </label>
              <select
                id="finding-severity"
                value={severity}
                onChange={(event) => setSeverity(event.target.value as AlertSeverity)}
                className={FIELD}
              >
                {ALERT_SEVERITIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={LABEL} htmlFor="finding-title">
              Headline
            </label>
            <Input
              id="finding-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Oil sardine landings down sharply off Kakinada"
              className="h-10 text-xs"
            />
          </div>

          <div>
            <label className={LABEL} htmlFor="finding-region">
              Area affected
            </label>
            <Input
              id="finding-region"
              value={region}
              onChange={(event) => setRegion(event.target.value)}
              className="h-10 text-xs"
            />
          </div>

          <div>
            <label className={LABEL} htmlFor="finding-summary">
              What operations need to know
            </label>
            <textarea
              id="finding-summary"
              rows={3}
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="The finding in plain terms, and what you are asking them to do about it."
              className={AREA}
            />
          </div>

          <div>
            <label className={LABEL} htmlFor="finding-evidence">
              Evidence this rests on
            </label>
            <textarea
              id="finding-evidence"
              rows={3}
              value={evidence}
              onChange={(event) => setEvidence(event.target.value)}
              placeholder="Observations, survey counts, the analysis window, how confident you are and why."
              className={AREA}
            />
          </div>

          <div>
            <span className={LABEL}>Supporting INCOIS datasets</span>
            <div className="flex flex-wrap gap-1.5">
              {citable.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleDataset(id)}
                  aria-pressed={datasets.includes(id)}
                  className={`rounded-md px-2 py-1 font-sans text-[11px] transition-colors ${
                    datasets.includes(id)
                      ? "bg-zinc-900 font-medium text-white"
                      : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                  }`}
                >
                  {id}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={LABEL} htmlFor="finding-author">
              Reported by
            </label>
            <Input
              id="finding-author"
              value={reportedBy}
              onChange={(event) => setReportedBy(event.target.value)}
              placeholder="Your name or institution"
              className="h-10 text-xs"
            />
          </div>

          <Button
            type="submit"
            disabled={!canSubmit}
            className="h-11 w-full gap-2 bg-zinc-950 text-xs text-white hover:bg-zinc-800"
          >
            <Send className="h-4 w-4" />
            <span>Send to coastal operations</span>
          </Button>
          {!canSubmit && (
            <p className="text-center text-[10px] text-zinc-400">
              A headline, a summary and the evidence are all needed before this
              can be sent.
            </p>
          )}
        </form>
      )}

      {mine.length > 0 && (
        <div className="border-t border-zinc-100 p-4">
          <h3 className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
            Reports you have sent
          </h3>
          <ul className="mt-2 space-y-2">
            {mine.map((alert) => (
              <li
                key={alert.id}
                className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-[11px] font-semibold text-zinc-950">
                      {alert.title}
                    </div>
                    <div className="mt-0.5 font-sans text-[10px] text-zinc-500">
                      {alert.region} ·{" "}
                      {new Date(alert.createdAt).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                      })}
                      {alert.acknowledgedAt ? " · acknowledged" : " · awaiting acknowledgement"}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span
                      className={`rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${severityTone(
                        alert.severity
                      )}`}
                    >
                      {alert.severity}
                    </span>
                    <button
                      type="button"
                      onClick={() => withdrawResearchAlert(alert.id)}
                      aria-label={`Withdraw ${alert.title}`}
                      className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
