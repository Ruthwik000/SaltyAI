"use client";

import * as React from "react";
import { distanceNM } from "./geo";

const MS_TO_KNOTS = 1.94384;

/** Ignore jitter below this so a moored boat does not draw a scribble. */
const MIN_TRACK_STEP_NM = 0.01;

/**
 * Watches the device GPS while `active` is true and accumulates a track.
 * Requires a secure context (HTTPS, or localhost in development).
 *
 * `status` and `message` are derived from props plus whatever the geolocation
 * callbacks last reported, so the effect never sets state synchronously.
 */
export function useGeolocation(active) {
  const [fix, setFix] = React.useState(null);
  const [track, setTrack] = React.useState([]);
  const [watch, setWatch] = React.useState(null);

  // Same client-detection pattern as components/role-gate.tsx: server renders
  // the optimistic value, the client corrects it on hydration.
  const supported = React.useSyncExternalStore(
    () => () => {},
    () => typeof navigator !== "undefined" && Boolean(navigator.geolocation),
    () => true
  );

  React.useEffect(() => {
    if (!active || !supported) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const next = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          at: position.timestamp,
          accuracyM: position.coords.accuracy ?? null,
          speedKnots:
            position.coords.speed != null && position.coords.speed >= 0
              ? position.coords.speed * MS_TO_KNOTS
              : null,
          headingDeg:
            position.coords.heading != null && !Number.isNaN(position.coords.heading)
              ? position.coords.heading
              : null,
        };

        setFix(next);
        setWatch({ status: "tracking", message: null });
        setTrack((previous) => {
          const last = previous[previous.length - 1];
          if (last && distanceNM(last, next) < MIN_TRACK_STEP_NM) return previous;
          return [...previous, next];
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setWatch({
            status: "denied",
            message:
              "Location permission is off. Allow location access to track your trip.",
          });
          return;
        }
        setWatch({
          status: "error",
          message:
            error.code === error.TIMEOUT
              ? "No GPS fix yet. Move somewhere with a clear view of the sky."
              : "GPS position is unavailable right now.",
        });
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [active, supported]);

  const reset = React.useCallback(() => {
    setTrack([]);
    setFix(null);
    setWatch(null);
  }, []);

  const status = !active
    ? "idle"
    : !supported
      ? "unsupported"
      : (watch?.status ?? "locating");

  const message = !active
    ? null
    : !supported
      ? "This device or browser does not provide GPS."
      : (watch?.message ?? null);

  return { fix, track, status, message, reset };
}
