"use client";

import * as React from "react";
import { useMarine } from "@/lib/marine-context";
import { pfzZones, activeVessels } from "@/lib/marine-data";
import { fetchOceanAlerts, ignoreAbort } from "@/lib/fisherman-api";
import {
  DashboardHeader,
  MarineMetricsGrid,
  FishermanWidget,
  OperatorWidget,
  HazardAlertsCard,
  WeatherMarineCard,
  AiConsultCard,
} from "@/components/dashboard";
import { TideCard } from "@/components/fisherman/tide-card";
import { StormCard } from "@/components/fisherman/storm-card";
import { HazardZonesCard } from "@/components/fisherman/hazard-zones-card";
import { ReportFindingCard } from "@/components/research/report-finding-card";
import { FishermanHome } from "@/components/fisherman/fisherman-home";
import { ResearcherHome } from "@/components/research/researcher-home";
import { ResearchAlertsCard } from "@/components/operator/research-alerts-card";

export default function DashboardPage() {
  const { role, location, setIsAiDrawerOpen } = useMarine();

  const nearbyPFZ =
    pfzZones.find((z) => z.referencePort === location.name) || pfzZones[0];
  // Live INCOIS advisories for this coast (already filtered by the backend);
  // the demo list only when the data API cannot answer.
  const [activeAlertsForRegion, setActiveAlertsForRegion] = React.useState([]);
  const [alertsLoaded, setAlertsLoaded] = React.useState(false);
  React.useEffect(() => {
    const controller = new AbortController();
    fetchOceanAlerts(location.lat, location.lon, controller.signal).then((response) => {
      if (controller.signal.aborted) return;
      setActiveAlertsForRegion(response.data || []);
      setAlertsLoaded(true);
    }).catch(ignoreAbort);
    return () => controller.abort();
  }, [location.lat, location.lon]);

  if (role === "fisherman") return <FishermanHome />;
  if (role === "researcher") return <ResearcherHome />;

  return (
    <div className="space-y-6">
      <DashboardHeader role={role} onOpenAiDrawer={() => setIsAiDrawerOpen(true)} />

      <MarineMetricsGrid
        location={location}
        role={role}
        alerts={activeAlertsForRegion}
        alertsLoaded={alertsLoaded}
      />

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
              {/* Tide and lightning are the two things that change what a
                  small boat does in the next few hours, and neither comes
                  from INCOIS. Both fetch through this app's own route
                  handlers, so the console does not need the Python service
                  running to show them. */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <TideCard location={location} />
                <StormCard location={location} />
              </div>
            </>
          )}

          {role === "researcher" && (
            <>
              <ReportFindingCard />
            </>
          )}

          {role === "operator" && (
            <>
              <OperatorWidget location={location} vessels={activeVessels} />
              <ResearchAlertsCard limit={3} />
            </>
          )}
        </div>

        <div className="space-y-6">
          <HazardAlertsCard
            alerts={activeAlertsForRegion}
            totalAlertsCount={activeAlertsForRegion.length}
          />

          {role === "fisherman" && <HazardZonesCard location={location} />}

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
