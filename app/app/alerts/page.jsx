"use client";

import * as React from "react";
import Link from "next/link";
import { useMarine } from "@/lib/marine-context";
import { marineAlerts } from "@/lib/marine-data";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Sparkles, ArrowLeft } from "lucide-react";
import { ResearchAlertsCard } from "@/components/operator/research-alerts-card";

const sourceOptions = [
  { id: "all", label: "All Alerts" },
  { id: "official", label: "Official Warnings Only" },
  { id: "salty", label: "SALTY AI Only" },
];

export default function AlertsDisastersPage() {
  const { setIsAiDrawerOpen } = useMarine();
  const [filterType, setFilterType] = React.useState("all");
  const [sourceFilter, setSourceFilter] = React.useState("all");

  const filteredAlerts = marineAlerts.filter((a) => {
    if (
      filterType !== "all" &&
      !a.type.toLowerCase().includes(filterType.toLowerCase())
    ) {
      return false;
    }
    if (sourceFilter === "official" && !a.source.startsWith("Official")) {
      return false;
    }
    if (sourceFilter === "salty" && !a.source.includes("SALTY")) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
        <div>
          <Link
            href="/app"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-950 mb-1 font-medium transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Dashboard</span>
          </Link>
          <h1 className="text-lg leading-snug sm:text-2xl lg:text-3xl font-bold tracking-tight text-zinc-950">
            Alerts & Disaster Early Warning
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setIsAiDrawerOpen(true)}
            className="text-xs h-8 bg-zinc-950 hover:bg-zinc-800 text-white gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5 text-zinc-300" />
            <span>Ask Emergency Agent</span>
          </Button>
        </div>
      </div>

      {/* Findings escalated from the research console */}
      <ResearchAlertsCard />

      {/* Critical Verification Notice: Official vs AI Distinction */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
        <div className="p-3.5 rounded-lg border border-zinc-200 bg-white shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-2 w-2 rounded-full bg-blue-600" />
            <div>
              <span className="font-semibold text-zinc-950 block">
                Official Government Bulletins
              </span>
              <span className="text-[11px] text-zinc-500">
                Direct statutory warnings from IMD, INCOIS, and Indian Coast Guard.
              </span>
            </div>
          </div>
          <Badge variant="minimal" className="font-sans text-[10px]">
            Statutory Mandate
          </Badge>
        </div>

        <div className="p-3.5 rounded-lg border border-purple-200/80 bg-purple-50/40 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-2 w-2 rounded-full bg-purple-600" />
            <div>
              <span className="font-semibold text-zinc-950 block">
                SALTY AI Predictive Insights
              </span>
              <span className="text-[11px] text-zinc-500">
                Radar anomaly and satellite IR clustering; 2-4 hr early detection.
              </span>
            </div>
          </div>
          <Badge
            variant="minimal"
            className="bg-purple-100 text-purple-700 border-purple-200 font-sans text-[10px]"
          >
            Model Advisory
          </Badge>
        </div>
      </div>

      {/* Filter Tabs Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-zinc-200 bg-white shadow-xs">
        {/* Source filter */}
        <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-md text-xs">
          <span className="font-sans text-[10px] uppercase text-zinc-400 px-2 font-semibold">
            Source:
          </span>
          {sourceOptions.map((s) => (
            <button
              key={s.id}
              onClick={() => setSourceFilter(s.id)}
              className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-all ${
                sourceFilter === s.id
                  ? "bg-white text-zinc-950 font-semibold shadow-xs"
                  : "text-zinc-600 hover:text-zinc-950"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Hazard category filter */}
        <div className="flex items-center gap-1 text-xs">
          <span className="font-sans text-[10px] uppercase text-zinc-400 font-semibold mr-1">
            Type:
          </span>
          {["all", "Cyclone", "Wind", "Wave", "Squall"].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                filterType === t
                  ? "bg-zinc-900 text-white font-semibold"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {t === "all" ? "All Hazards" : t}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Feed */}
      <div className="space-y-4">
        {filteredAlerts.length > 0 ? (
          filteredAlerts.map((alert) => {
            const isOfficial = alert.source.startsWith("Official");
            const isSevere = alert.severity === "Severe" || alert.severity === "Critical";

            return (
              <Card
                key={alert.id}
                className={`overflow-hidden transition-all ${
                  isSevere
                    ? "border-rose-300 bg-rose-50/10 shadow-sm"
                    : "border-zinc-200 bg-white shadow-xs"
                }`}
              >
                <CardHeader className="pb-3 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <Badge
                      className={`text-[10px] px-2 py-0.5 font-sans ${
                        isOfficial ? "bg-zinc-900 text-white" : "bg-purple-700 text-white"
                      }`}
                    >
                      {alert.source}
                    </Badge>
                    <Badge
                      variant="minimal"
                      className={`text-[10px] ${
                        isSevere
                          ? "bg-rose-100 text-rose-700 border-rose-200 font-semibold"
                          : "bg-amber-50 text-amber-700 border-amber-200 font-medium"
                      }`}
                    >
                      {alert.severity} • {alert.type}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-sans text-zinc-400">
                    <span>Issued: {alert.issuedAt}</span>
                    <span>•</span>
                    <span className="text-zinc-700 font-medium">
                      Expires: {alert.expiresAt}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-3 text-xs font-sans">
                  <div>
                    <h3 className="text-base font-bold text-zinc-950 mb-1">
                      {alert.title}
                    </h3>
                    <p className="text-xs text-zinc-600 leading-relaxed">
                      {alert.summary}
                    </p>
                  </div>

                  {/* Operational Advisory Action */}
                  <div
                    className={`p-3 rounded-lg border text-xs leading-relaxed ${
                      isSevere
                        ? "bg-rose-50/80 border-rose-200 text-rose-900"
                        : "bg-zinc-50 border-zinc-200 text-zinc-800"
                    }`}
                  >
                    <strong className="font-sans text-[11px] uppercase block mb-0.5">
                      Operational Action Mandate:
                    </strong>
                    {alert.operationalAction}
                  </div>

                  {/* Affected Regions */}
                  <div className="flex items-center gap-2 pt-1 font-sans text-[11px] text-zinc-500 flex-wrap">
                    <span className="flex items-center gap-1 font-semibold text-zinc-700">
                      <MapPin className="h-3.5 w-3.5 text-zinc-500" />
                      Affected Maritime Regions:
                    </span>
                    {alert.affectedRegions.map((region, rIdx) => (
                      <span
                        key={rIdx}
                        className="bg-zinc-100 text-zinc-800 px-2 py-0.5 rounded"
                      >
                        {region}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="p-12 text-center border border-zinc-200 rounded-xl bg-white text-zinc-500 text-xs">
            No active hazard alerts matching the selected filters.
          </div>
        )}
      </div>
    </div>
  );
}
