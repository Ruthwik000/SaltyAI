"use client";

import * as React from "react";
import {
  LandingHeader,
  LandingHero,
  LandingSignals,
  LandingCapabilities,
  LandingWorkflow,
  LandingCta,
  LandingFooter,
} from "@/components/landing";

export default function LandingPage() {
  const [apiState, setApiState] = React.useState<"checking" | "ready" | "demo">("checking");

  React.useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_SALTY_API_URL || "http://127.0.0.1:8010"}/api/health`, {
      cache: "no-store",
    })
      .then((response) => {
        if (!response.ok) throw new Error("offline");
        setApiState("ready");
      })
      .catch(() => setApiState("demo"));
  }, []);

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <LandingHeader apiState={apiState} />
      <main>
        <LandingHero />
        <LandingSignals />
        <LandingCapabilities />
        <LandingWorkflow />
        <LandingCta />
      </main>
      <LandingFooter />
    </div>
  );
}
