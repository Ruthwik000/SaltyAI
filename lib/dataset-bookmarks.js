"use client";

/**
 * Datasets a researcher has starred.
 *
 * The INCOIS catalogue runs to dozens of entries; the handful someone actually
 * works with should be one click away. Kept on the device.
 */

import * as React from "react";

const KEY = "salty_dataset_bookmarks";

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
    window.localStorage.setItem(KEY, JSON.stringify(value));
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

export function toggleBookmark(datasetId) {
  const current = getSnapshot();
  writeStore(
    current.includes(datasetId)
      ? current.filter((id) => id !== datasetId)
      : [datasetId, ...current]
  );
}

export function useBookmarks() {
  return React.useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}
