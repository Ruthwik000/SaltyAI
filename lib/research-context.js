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

const KEY = "salty_agent_data_context";

const listeners = new Set();
let snapshot;

function readStore() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function emit() {
  snapshot = undefined;
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  if (snapshot === undefined) snapshot = readStore();
  return snapshot;
}

export function setAgentContext(context) {
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
export function describeAgentContext(context) {
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

export function useAgentContext() {
  return React.useSyncExternalStore(subscribe, getSnapshot, () => null);
}
