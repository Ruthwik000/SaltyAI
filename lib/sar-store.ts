"use client";

/**
 * Open search cases, shared between the SAR console and the marine map.
 *
 * The operator computes a datum on Lost Fisherman and then wants to see it on
 * the chart with the drift track drawn. Keeping the case here means both
 * screens show the same numbers rather than each recomputing them.
 */

import * as React from "react";
import type { LatLon } from "./geo";
import type { SarPrediction } from "./operations-api";

const KEY = "salty_search_cases";
const FOCUS_KEY = "salty_focused_case";
const MAX = 20;

export interface SearchCase {
  id: string;
  incidentId: string;
  targetName: string;
  targetType: string;
  lastKnownLat: number;
  lastKnownLon: number;
  elapsedHours: number;
  prediction: SarPrediction;
  /** "demo" means the datum came from the on-device estimate, not the model. */
  source: "live" | "demo";
  createdAt: string;
  status: "active" | "closed";
}

export type { LatLon };

const listeners = new Set<() => void>();
let casesSnapshot: SearchCase[] | null = null;
let focusSnapshot: string | null | undefined;
const EMPTY: never[] = [];

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function emit() {
  casesSnapshot = null;
  focusSnapshot = undefined;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function casesSnap(): SearchCase[] {
  if (!casesSnapshot) casesSnapshot = read<SearchCase[]>(KEY, []);
  return casesSnapshot;
}

function focusSnap(): string | null {
  if (focusSnapshot === undefined) focusSnapshot = read<string | null>(FOCUS_KEY, null);
  return focusSnapshot;
}

function write(cases: SearchCase[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cases.slice(0, MAX)));
  } catch {
    // ignore
  }
  emit();
}

export function saveSearchCase(
  entry: Omit<SearchCase, "id" | "createdAt" | "status">
): SearchCase {
  const saved: SearchCase = {
    ...entry,
    id: `case-${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    status: "active",
  };
  // Re-running the drift for the same incident replaces the earlier datum
  // rather than leaving two contradictory ones on the chart.
  const rest = casesSnap().filter((item) => item.incidentId !== saved.incidentId);
  write([saved, ...rest]);
  return saved;
}

export function closeSearchCase(id: string) {
  write(
    casesSnap().map((item) =>
      item.id === id ? { ...item, status: "closed" as const } : item
    )
  );
}

export function removeSearchCase(id: string) {
  write(casesSnap().filter((item) => item.id !== id));
}

/** Which case the map should open on. */
export function focusSearchCase(id: string | null) {
  try {
    if (id) window.localStorage.setItem(FOCUS_KEY, JSON.stringify(id));
    else window.localStorage.removeItem(FOCUS_KEY);
  } catch {
    // ignore
  }
  emit();
}

export function useSearchCases(): SearchCase[] {
  return React.useSyncExternalStore(subscribe, casesSnap, () => EMPTY);
}

export function useFocusedCaseId(): string | null {
  return React.useSyncExternalStore(subscribe, focusSnap, () => null);
}
