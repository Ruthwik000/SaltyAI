"use client";

import * as React from "react";
import { marineLocations, MarineLocation } from "./marine-data";
import { MapLayersResponse, saltyFetch } from "./api";

export type UserRole = "fisherman" | "researcher" | "operator";

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

  React.useEffect(() => {
    const controller = new AbortController();
    saltyFetch<MapLayersResponse>("/api/map/layers", controller.signal)
      .then((data) => {
        setBackendLayers(data);
        setBackendStatus("ready");
      })
      .catch(() => setBackendStatus("offline"));
    return () => controller.abort();
  }, []);

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

  const location =
    marineLocations.find((l) => l.id === locationId) || marineLocations[0];

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
