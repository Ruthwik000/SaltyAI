"use client";

import * as React from "react";
import { useMarine } from "@/lib/marine-context";
import { pfzZones, marineAlerts, activeVessels } from "@/lib/marine-data";
import {
  DashboardHeader,
  MarineMetricsGrid,
  FishermanWidget,
  ResearcherWidget,
  OperatorWidget,
  HazardAlertsCard,
  WeatherMarineCard,
  AiConsultCard,
} from "@/components/dashboard";

export default function DashboardPage() {
  const { role, location, setIsAiDrawerOpen } = useMarine();

  const nearbyPFZ = pfzZones.find((z) => z.referencePort === location.name) || pfzZones[0];
  const activeAlertsForRegion = marineAlerts.filter(
    (a) =>
      a.affectedRegions.some((r) => r.toLowerCase().includes(location.name.toLowerCase())) ||
      a.affectedRegions.includes("Central Bay of Bengal")
  );

  return (
    <div className="space-y-6">
      <DashboardHeader role={role} onOpenAiDrawer={() => setIsAiDrawerOpen(true)} />

      <MarineMetricsGrid location={location} role={role} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {role === "fisherman" && (
            <>
              <FishermanWidget
                location={location}
                nearbyPFZ={nearbyPFZ}
                totalZonesCount={pfzZones.length}
              />
              <WeatherMarineCard location={location} />
            </>
          )}

          {role === "researcher" && <ResearcherWidget location={location} />}

          {role === "operator" && (
            <OperatorWidget location={location} vessels={activeVessels} />
          )}
        </div>

        <div className="space-y-6">
          <HazardAlertsCard
            alerts={activeAlertsForRegion}
            totalAlertsCount={marineAlerts.length}
          />

          <AiConsultCard
            locationName={location.name}
            nearbyPfzName={nearbyPFZ.name}
            onOpenAiDrawer={() => setIsAiDrawerOpen(true)}
          />
        </div>
      </div>
    </div>
  );
}
