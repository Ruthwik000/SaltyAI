"use client";

import * as React from "react";
import { useMarine } from "@/lib/marine-context";
import { TripTrackerView } from "@/components/fisherman/trip-tracker-view";
import { VesselTelemetryView } from "@/components/legacy/vessel-telemetry-view";

export default function VesselGpsPage() {
  const { role } = useMarine();

  // Fishermen track their own boat live; operators keep the fleet telemetry
  // console they had before.
  if (role !== "fisherman") return <VesselTelemetryView />;

  // TripTrackerView reads the ?zone= deep link from Fishing Zones.
  return (
    <React.Suspense
      fallback={<div className="h-64 animate-pulse rounded-xl bg-zinc-100" />}
    >
      <TripTrackerView />
    </React.Suspense>
  );
}
