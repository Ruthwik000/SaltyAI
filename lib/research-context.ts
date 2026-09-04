"use client";

/**
 * The dataset selection a researcher hands to the AI agent.
 *
 * Set from the Research & Data console, read by the agent page so the question
 * arrives with the dataset, variable, region, window and summary statistics
 * already attached — rather than the researcher retyping them into a prompt.
 *
 * Kept in sessionStorage: it should survive the navigation between the two
 * screens, but it is a working selection, not something to remember for weeks.
 */

import * as React from "react";
import type { RegionBounds, SeriesStats } from "./research-api";

const KEY = "salty_agent_data_context";

export interface AgentDataContext {
  datasetId: string;
  datasetName: string;
  instrument: string;
  variable: string;
  unit: string;
  region: RegionBounds;
  start: string;
  end: string;
  /** Whether the statistics came from the backend or the demo series. */
  source: "live" | "demo";
  stats: SeriesStats;
  erddapUrl: string;
  attachedAt: string;
}

const listeners = new Set<() => void>();
let snapshot: AgentDataContext | null | undefined;

function readStore(): AgentDataContext | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AgentDataContext) : null;
  } catch {
    return null;
  }
}

function emit() {
  snapshot = undefined;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): AgentDataContext | null {
  if (snapshot === undefined) snapshot = readStore();
  return snapshot;
}

export function setAgentContext(context: Omit<AgentDataContext, "attachedAt">) {
  try {
    window.sessionStorage.setItem(
      KEY,
      JSON.stringify({ ...context, attachedAt: new Date().toISOString() })
    );
  } catch {
    // Session storage unavailable; the agent simply gets no attachment.
  }
  emit();
}

export function clearAgentContext() {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
  emit();
}

/** Renders a one-line description of the attachment for a prompt preamble. */
export function describeAgentContext(context: AgentDataContext): string {
  const { region } = context;
  return [
    `Dataset: ${context.datasetName} (${context.datasetId}), instrument ${context.instrument}.`,
    `Variable: ${context.variable}${context.unit ? ` in ${context.unit}` : ""}.`,
    `Region: ${region.minLat}–${region.maxLat}°N, ${region.minLon}–${region.maxLon}°E.`,
    `Window: ${context.start} to ${context.end}.`,
    `Summary: mean ${context.stats.mean}, range ${context.stats.min} to ${context.stats.max},`,
    `SD ${context.stats.stdDev}, trend ${context.stats.trendPerDecade} per decade,`,
    `mean anomaly ${context.stats.anomalyMean}.`,
    context.source === "demo"
      ? "These statistics come from SALTY's demo series, not from measured data."
      : "These statistics come from the SALTY backend.",
  ].join(" ");
}

export function useAgentContext(): AgentDataContext | null {
  return React.useSyncExternalStore(subscribe, getSnapshot, () => null);
}
