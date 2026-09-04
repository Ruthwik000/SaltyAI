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
import type { BoatType } from "./fisherman-api";

const PLANNED_KEY = "salty_planned_trips";
const HISTORY_KEY = "salty_trip_history";
const MAX_HISTORY = 40;

export interface PlannedTrip {
  id: string;
  createdAt: string;
  departurePort: string;
  departureLat: number;
  departureLon: number;
  destinationZoneId: string;
  destinationZoneName: string;
  destinationLat: number;
  destinationLon: number;
  distanceNM: number;
  boatType: BoatType;
  departureAt: string;
  returnAt: string;
  /** Snapshot of the assessment this plan was saved from, if there was one. */
  risk: {
    score: number;
    level: string;
    /** "demo" means it was an on-device estimate, not the risk model. */
    source: "live" | "demo";
  } | null;
}

export interface TripRecord {
  id: string;
  startedAt: string;
  endedAt: string;
  departurePort: string;
  destinationZoneName: string | null;
  boatType: BoatType | null;
  distanceNM: number;
  maxSpeedKnots: number | null;
  pointCount: number;
  /** True when the trip was never registered with the operator console. */
  offline: boolean;
}

/* ------------------------------------------------------------------ */
/* Storage                                                             */
/* ------------------------------------------------------------------ */

function read<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, value: T[]) {
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

const listeners = new Set<() => void>();

// useSyncExternalStore compares snapshots by identity, so they are cached and
// only replaced when something actually changes.
let plannedSnapshot: PlannedTrip[] | null = null;
let historySnapshot: TripRecord[] | null = null;
const EMPTY: never[] = [];

function emit() {
  plannedSnapshot = null;
  historySnapshot = null;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function plannedSnap(): PlannedTrip[] {
  if (!plannedSnapshot) plannedSnapshot = read<PlannedTrip>(PLANNED_KEY);
  return plannedSnapshot;
}

function historySnap(): TripRecord[] {
  if (!historySnapshot) historySnapshot = read<TripRecord>(HISTORY_KEY);
  return historySnapshot;
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

export function addPlannedTrip(
  trip: Omit<PlannedTrip, "id" | "createdAt">
): PlannedTrip {
  const saved: PlannedTrip = {
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

export function removePlannedTrip(id: string) {
  write(
    PLANNED_KEY,
    plannedSnap().filter((item) => item.id !== id)
  );
  emit();
}

export function addTripRecord(record: Omit<TripRecord, "id">): TripRecord {
  const saved: TripRecord = { ...record, id: newId("trip") };
  write(HISTORY_KEY, [saved, ...historySnap()].slice(0, MAX_HISTORY));
  emit();
  return saved;
}

export function clearTripHistory() {
  write(HISTORY_KEY, []);
  emit();
}

/** Planned trips, newest first. Empty during server render. */
export function usePlannedTrips(): PlannedTrip[] {
  return React.useSyncExternalStore(subscribe, plannedSnap, () => EMPTY);
}

/** Completed trips, newest first. Empty during server render. */
export function useTripHistory(): TripRecord[] {
  return React.useSyncExternalStore(subscribe, historySnap, () => EMPTY);
}
