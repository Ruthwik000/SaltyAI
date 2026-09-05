"use client";

/**
 * Open search cases, shared between the SAR console and the marine map.
 *
 * The operator computes a datum on Lost Fisherman and then wants to see it on
 * the chart with the drift track drawn. Keeping the case here means both
 * screens show the same numbers rather than each recomputing them.
 */

import * as React from "react";

const KEY = "salty_search_cases";
const FOCUS_KEY = "salty_focused_case";
const MAX = 20;

const listeners = new Set();
let casesSnapshot = null;
let focusSnapshot;
const EMPTY = [];

function read(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function emit() {
  casesSnapshot = null;
  focusSnapshot = undefined;
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function casesSnap() {
  if (!casesSnapshot) casesSnapshot = read(KEY, []);
  return casesSnapshot;
}

function focusSnap() {
  if (focusSnapshot === undefined) focusSnapshot = read(FOCUS_KEY, null);
  return focusSnapshot;
}

function write(cases) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cases.slice(0, MAX)));
  } catch {
    // ignore
  }
  emit();
}

export function saveSearchCase(entry) {
  const saved = {
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

export function closeSearchCase(id) {
  write(
    casesSnap().map((item) => (item.id === id ? { ...item, status: "closed" } : item))
  );
}

export function removeSearchCase(id) {
  write(casesSnap().filter((item) => item.id !== id));
}

/** Which case the map should open on. */
export function focusSearchCase(id) {
  try {
    if (id) window.localStorage.setItem(FOCUS_KEY, JSON.stringify(id));
    else window.localStorage.removeItem(FOCUS_KEY);
  } catch {
    // ignore
  }
  emit();
}

export function useSearchCases() {
  return React.useSyncExternalStore(subscribe, casesSnap, () => EMPTY);
}

export function useFocusedCaseId() {
  return React.useSyncExternalStore(subscribe, focusSnap, () => null);
}
