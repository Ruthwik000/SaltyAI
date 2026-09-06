"use client";

/**
 * Findings a researcher escalates to coastal operations.
 *
 * A researcher who spots a species decline, a disease signal or a developing
 * weather threat needs a way to put it in front of the people who act on it.
 * These are stored on the device and read by the operator console, so the
 * hand-off works in this build without waiting on the backend. When the backend
 * lands, POST the same shape and keep this as the offline queue.
 */

import * as React from "react";

const KEY = "salty_research_alerts";
const MAX = 60;

export const ALERT_CATEGORIES = [
  { id: "species", label: "Species decline or shift" },
  { id: "disease", label: "Disease or mortality event" },
  { id: "weather", label: "Developing weather threat" },
  { id: "pollution", label: "Pollution or water quality" },
  { id: "habitat", label: "Habitat damage" },
  { id: "other", label: "Other finding" },
];

export const ALERT_SEVERITIES = ["Advisory", "Warning", "Severe", "Critical"];

const listeners = new Set();
let snapshot = null;
const EMPTY = [];

function readStore() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStore(value) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(value.slice(0, MAX)));
  } catch {
    // ignore
  }
  snapshot = null;
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  if (!snapshot) snapshot = readStore();
  return snapshot;
}

export function submitResearchAlert(alert) {
  const saved = {
    ...alert,
    id: `ra-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    acknowledgedAt: null,
  };
  writeStore([saved, ...getSnapshot()]);
  return saved;
}

export function acknowledgeResearchAlert(id) {
  writeStore(
    getSnapshot().map((alert) =>
      alert.id === id ? { ...alert, acknowledgedAt: new Date().toISOString() } : alert
    )
  );
}

export function withdrawResearchAlert(id) {
  writeStore(getSnapshot().filter((alert) => alert.id !== id));
}

export function useResearchAlerts() {
  return React.useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

export function severityTone(severity) {
  switch (severity) {
    case "Critical":
      return "bg-rose-100 text-rose-800 border-rose-200";
    case "Severe":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "Warning":
      return "bg-amber-50 text-amber-700 border-amber-200";
    default:
      return "bg-sky-50 text-sky-700 border-sky-200";
  }
}
