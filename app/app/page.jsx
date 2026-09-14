"use client";

import * as React from "react";
import { useMarine } from "@/lib/marine-context";
import { pfzZones, marineAlerts, activeVessels } from "@/lib/marine-data";
import { fetchMarineAlerts } from "@/lib/fisherman-api";
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
import { TideCard } from "@/components/fisherman/tide-card";
import { StormCard } from "@/components/fisherman/storm-card";
import { HazardZonesCard } from "@/components/fisherman/hazard-zones-card";
import { ReportFindingCard } from "@/components/research/report-finding-card";
import { ResearchAlertsCard } from "@/components/operator/research-alerts-card";

export default function DashboardPage() {
  const { role, location, setIsAiDrawerOpen } = useMarine();

  const nearbyPFZ =
    pfzZones.find((z) => z.referencePort === location.name) || pfzZones[0];
  const bundledAlertsForRegion = React.useMemo(
    () =>
      marineAlerts.filter(
        (a) =>
          a.affectedRegions.some((r) =>
            r.toLowerCase().includes(location.name.toLowerCase())
          ) || a.affectedRegions.includes("Central Bay of Bengal")
      ),
    [location.name]
  );

  // Official INCOIS High Wave / Swell Surge advisories for this district. An
  // empty list is a real answer - it means nothing is in force - so it is kept
  // distinct from the bundled demo set, which is only used if the feed fails.
  const [officialAlerts, setOfficialAlerts] = React.useState(null);

  React.useEffect(() => {
    const controller = new AbortController();
    fetchMarineAlerts(location.name, location.state, controller.signal)
      .then((result) => setOfficialAlerts(result))
      .catch(() => setOfficialAlerts(null));
    return () => controller.abort();
  }, [location.name, location.state]);

  const alertsSource = officialAlerts?.source === "live" ? "live" : "demo";
  const activeAlertsForRegion =
    alertsSource === "live" ? officialAlerts.data : bundledAlertsForRegion;

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
              <ResearcherWidget location={location} />
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
            source={alertsSource}
            reason={officialAlerts?.reason}
            issuedFor={officialAlerts?.issuedFor}
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
