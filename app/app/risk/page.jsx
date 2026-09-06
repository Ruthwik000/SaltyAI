"use client";

import * as React from "react";
import { useMarine } from "@/lib/marine-context";
import { TripSafetyView } from "@/components/fisherman/trip-safety-view";
import { RiskConsoleView } from "@/components/legacy/risk-console-view";

export default function RiskSafetyPage() {
  const { role } = useMarine();

  // Fishermen get the trip-planning flow; researchers and operators keep the
  // composite risk console they had before.
  if (role !== "fisherman") return <RiskConsoleView />;

  // TripSafetyView reads the ?zone= deep link from Fishing Zones.
  return (
    <React.Suspense
      fallback={<div className="h-64 animate-pulse rounded-xl bg-zinc-100" />}
    >
      <TripSafetyView />
    </React.Suspense>
  );
}
