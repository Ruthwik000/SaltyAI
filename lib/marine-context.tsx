"use client";

import * as React from "react";
import { marineLocations, MarineLocation } from "./marine-data";
import { MapLayersResponse, saltyFetch } from "./api";

export type UserRole = "fisherman" | "researcher" | "operator";

export interface OperatorNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: "journey_start" | "lost_fisherman_sos" | "general";
  severity: "info" | "warning" | "critical";
  vesselName?: string;
  locationName?: string;
  coordinates?: { lat: number; lon: number };
}

export interface ActiveJourney {
  active: boolean;
  vesselName: string;
  destination: string;
  distanceNM: number;
  departureTime: string;
}

interface MarineContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  location: MarineLocation;
  setLocationId: (id: string) => void;
  isAiDrawerOpen: boolean;
  setIsAiDrawerOpen: (open: boolean) => void;
  savedZoneIds: string[];
  toggleSaveZone: (id: string) => void;
  activeAlertCount: number;
  backendStatus: "loading" | "ready" | "offline";
  backendLayers: MapLayersResponse | null;
  refreshBackendLayers: () => void;
  operatorNotifications: OperatorNotification[];
  addOperatorNotification: (notif: Omit<OperatorNotification, "id" | "timestamp">) => void;
  dismissNotification: (id: string) => void;
  activeJourney: ActiveJourney | null;
  startJourney: (destinationZone: string, distanceNM?: number, vesselName?: string) => void;
  reportLostFishermanSOS: (loc?: MarineLocation, note?: string) => void;
}

const MarineContext = React.createContext<MarineContextType | undefined>(undefined);

export function MarineProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = React.useState<UserRole>(() => {
    if (typeof window !== "undefined") {
      try {
        const savedRole = localStorage.getItem("salty_role") as UserRole;
        if (savedRole && ["fisherman", "researcher", "operator"].includes(savedRole)) {
          return savedRole;
        }
      } catch {
        // ignore
      }
    }
    return "fisherman";
  });

  const [locationId, setLocationIdState] = React.useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const savedLoc = localStorage.getItem("salty_location");
        if (savedLoc && marineLocations.some((l) => l.id === savedLoc)) {
          return savedLoc;
        }
      } catch {
        // ignore
      }
    }
    return "vizag";
  });

  const [isAiDrawerOpen, setIsAiDrawerOpen] = React.useState(false);
  const [savedZoneIds, setSavedZoneIds] = React.useState<string[]>(["pfz-vizag-01"]);
  const [backendStatus, setBackendStatus] = React.useState<"loading" | "ready" | "offline">("loading");
  const [backendLayers, setBackendLayers] = React.useState<MapLayersResponse | null>(null);

  const refreshBackendLayers = React.useCallback(() => {
    const controller = new AbortController();
    saltyFetch<MapLayersResponse>("/api/map/layers", controller.signal)
      .then((data) => {
        setBackendLayers(data);
        setBackendStatus("ready");
      })
      .catch(() => setBackendStatus("offline"));
  }, []);

  React.useEffect(() => {
    refreshBackendLayers();
  }, [refreshBackendLayers]);

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    try {
      localStorage.setItem("salty_role", newRole);
    } catch {
      // ignore
    }
  };

  const setLocationId = (newId: string) => {
    setLocationIdState(newId);
    try {
      localStorage.setItem("salty_location", newId);
    } catch {
      // ignore
    }
  };

  const toggleSaveZone = (id: string) => {
    setSavedZoneIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const [operatorNotifications, setOperatorNotifications] = React.useState<OperatorNotification[]>([
    {
      id: "notif-init-1",
      title: "Coast Guard Fleet Link Online",
      message: "Automated coastal tracking synced with Indian Coast Guard coastal radar nodes.",
      timestamp: "06:00 IST",
      type: "general",
      severity: "info",
    },
  ]);

  const [activeJourney, setActiveJourney] = React.useState<ActiveJourney | null>(null);

  const addOperatorNotification = React.useCallback(
    (notif: Omit<OperatorNotification, "id" | "timestamp">) => {
      const newNotif: OperatorNotification = {
        ...notif,
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: "Just now",
      };
      setOperatorNotifications((prev) => [newNotif, ...prev]);
    },
    []
  );

  const dismissNotification = React.useCallback((id: string) => {
    setOperatorNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const location =
    marineLocations.find((l) => l.id === locationId) || marineLocations[0];

  const startJourney = React.useCallback(
    (destinationZone: string, distanceNM = 18.5, vesselName = "Matsya-Kuber IV") => {
      const journey: ActiveJourney = {
        active: true,
        vesselName,
        destination: destinationZone,
        distanceNM,
        departureTime: "Just now",
      };
      setActiveJourney(journey);
      addOperatorNotification({
        title: `Fleet Departure: ${vesselName}`,
        message: `Vessel ${vesselName} commenced voyage towards ${destinationZone} (${distanceNM} NM from ${location.name}). Voyage logged in Coastal Operator Fleet Console.`,
        type: "journey_start",
        severity: "info",
        vesselName,
        locationName: location.name,
        coordinates: { lat: location.lat, lon: location.lon },
      });
    },
    [addOperatorNotification, location]
  );

  const reportLostFishermanSOS = React.useCallback(
    (loc?: MarineLocation, note?: string) => {
      const targetLoc = loc || location;
      addOperatorNotification({
        title: `CRITICAL DISTRESS: Lost Fisherman / SOS`,
        message: `Emergency distress beacon triggered by fisherman in ${targetLoc.name} sector (${targetLoc.lat.toFixed(2)}°N, ${targetLoc.lon.toFixed(2)}°E). SAR kinematic drift projection initiated. Indian Coast Guard MRCC notified. ${note ? `Details: ${note}` : ""}`,
        type: "lost_fisherman_sos",
        severity: "critical",
        vesselName: "Matsya-Kuber IV",
        locationName: targetLoc.name,
        coordinates: { lat: targetLoc.lat, lon: targetLoc.lon },
      });
    },
    [addOperatorNotification, location]
  );

  return (
    <MarineContext.Provider
      value={{
        role,
        setRole,
        location,
        setLocationId,
        isAiDrawerOpen,
        setIsAiDrawerOpen,
        savedZoneIds,
        toggleSaveZone,
        activeAlertCount: 4,
        backendStatus,
        backendLayers,
        refreshBackendLayers: () => { void refreshBackendLayers(); },
        operatorNotifications,
        addOperatorNotification,
        dismissNotification,
        activeJourney,
        startJourney,
        reportLostFishermanSOS,
      }}
    >
      {children}
    </MarineContext.Provider>
  );
}

export function useMarine() {
  const ctx = React.useContext(MarineContext);
  if (!ctx) {
    throw new Error("useMarine must be used within MarineProvider");
  }
  return ctx;
}
