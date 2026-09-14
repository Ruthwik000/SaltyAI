"use client";

import * as React from "react";
import { marineLocations, MarineLocation } from "./marine-data";
import { saltyFetch } from "./api";

const MarineContext = React.createContext(undefined);

export function MarineProvider({ children }) {
  const [role, setRoleState] = React.useState(() => {
    if (typeof window !== "undefined") {
      try {
        const savedRole = localStorage.getItem("salty_role");
        if (savedRole && ["fisherman", "researcher", "operator"].includes(savedRole)) {
          return savedRole;
        }
      } catch {
        // ignore
      }
    }
    return "fisherman";
  });

  const [locationId, setLocationIdState] = React.useState(() => {
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

  const [phoneNumber, setPhoneNumberState] = React.useState(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("salty_phone_number") || "";
      } catch {
        // ignore
      }
    }
    return "";
  });

  const [isAiDrawerOpen, setIsAiDrawerOpen] = React.useState(false);
  const [savedZoneIds, setSavedZoneIds] = React.useState(["pfz-vizag-01"]);
  const [backendStatus, setBackendStatus] = React.useState("loading");
  const [backendLayers] = React.useState(null);

  const refreshBackendLayers = React.useCallback(() => {
    const controller = new AbortController();
    saltyFetch("/api/health", controller.signal)
      .then(() => {
        setBackendStatus("ready");
      })
      .catch(() => setBackendStatus("offline"));
  }, []);

  React.useEffect(() => {
    refreshBackendLayers();
  }, [refreshBackendLayers]);

  const setRole = (newRole) => {
    setRoleState(newRole);
    try {
      localStorage.setItem("salty_role", newRole);
    } catch {
      // ignore
    }
  };

  const setPhoneNumber = (newPhoneNumber) => {
    setPhoneNumberState(newPhoneNumber);
    try {
      localStorage.setItem("salty_phone_number", newPhoneNumber);
    } catch {
      // ignore
    }
  };

  const setLocationId = (newId) => {
    setLocationIdState(newId);
    try {
      localStorage.setItem("salty_location", newId);
    } catch {
      // ignore
    }
  };

  const toggleSaveZone = (id) => {
    setSavedZoneIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const [operatorNotifications, setOperatorNotifications] = React.useState([
    {
      id: "notif-init-1",
      title: "Coast Guard Fleet Link Online",
      message:
        "Automated coastal tracking synced with Indian Coast Guard coastal radar nodes.",
      timestamp: "06:00 IST",
      type: "general",
      severity: "info",
    },
  ]);

  const [activeJourney, setActiveJourney] = React.useState(null);

  const addOperatorNotification = React.useCallback((notif) => {
    const newNotif = {
      ...notif,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: "Just now",
    };
    setOperatorNotifications((prev) => [newNotif, ...prev]);
  }, []);

  const dismissNotification = React.useCallback((id) => {
    setOperatorNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const location = marineLocations.find((l) => l.id === locationId) || marineLocations[0];

  const startJourney = React.useCallback(
    (destinationZone, distanceNM = 18.5, vesselName = "Matsya-Kuber IV") => {
      const journey = {
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
    (loc, note) => {
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
        phoneNumber,
        setPhoneNumber,
        location,
        setLocationId,
        isAiDrawerOpen,
        setIsAiDrawerOpen,
        savedZoneIds,
        toggleSaveZone,
        activeAlertCount: 4,
        backendStatus,
        backendLayers,
        refreshBackendLayers: () => {
          void refreshBackendLayers();
        },
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
