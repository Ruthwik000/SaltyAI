"use client";

/**
 * Trips the fisherman has planned or completed, kept on the device.
 *
 * The backend owns live trips (see startTrip / pushTripPing in fisherman-api).
 * This store is the fisherman's own record: what they lined up from a risk
 * check and what they have already done. It survives a reload and works with
 * no signal, which is the point — the plan has to be readable at sea.
 */

import * as React from "react";

const PLANNED_KEY = "salty_planned_trips";
const HISTORY_KEY = "salty_trip_history";
const MAX_HISTORY = 40;

/* ------------------------------------------------------------------ */
/* Storage                                                             */
/* ------------------------------------------------------------------ */

function read(key) {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be full or blocked (private windows). The trip still runs;
    // it just will not be here next time.
  }
}

/* ------------------------------------------------------------------ */
/* Subscription                                                        */
/* ------------------------------------------------------------------ */

const listeners = new Set();

// useSyncExternalStore compares snapshots by identity, so they are cached and
// only replaced when something actually changes.
let plannedSnapshot = null;
let historySnapshot = null;
const EMPTY = [];

function emit() {
  plannedSnapshot = null;
  historySnapshot = null;
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function plannedSnap() {
  if (!plannedSnapshot) plannedSnapshot = read(PLANNED_KEY);
  return plannedSnapshot;
}

function historySnap() {
  if (!historySnapshot) historySnapshot = read(HISTORY_KEY);
  return historySnapshot;
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

function newId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function addPlannedTrip(trip) {
  const saved = {
    ...trip,
    id: newId("plan"),
    createdAt: new Date().toISOString(),
  };
  // Re-planning the same zone and departure replaces the earlier entry rather
  // than stacking near-duplicates.
  const rest = plannedSnap().filter(
    (item) =>
      !(
        item.destinationZoneId === saved.destinationZoneId &&
        item.departureAt === saved.departureAt
      )
  );
  write(PLANNED_KEY, [saved, ...rest]);
  emit();
  return saved;
}

export function removePlannedTrip(id) {
  write(
    PLANNED_KEY,
    plannedSnap().filter((item) => item.id !== id)
  );
  emit();
}

export function addTripRecord(record) {
  const saved = { ...record, id: newId("trip") };
  write(HISTORY_KEY, [saved, ...historySnap()].slice(0, MAX_HISTORY));
  emit();
  return saved;
}

export function clearTripHistory() {
  write(HISTORY_KEY, []);
  emit();
}

/** Planned trips, newest first. Empty during server render. */
export function usePlannedTrips() {
  return React.useSyncExternalStore(subscribe, plannedSnap, () => EMPTY);
}

/** Completed trips, newest first. Empty during server render. */
export function useTripHistory() {
  return React.useSyncExternalStore(subscribe, historySnap, () => EMPTY);
}
