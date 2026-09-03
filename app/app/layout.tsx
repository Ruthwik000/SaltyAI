import * as React from "react";
import type { Metadata } from "next";
import { MarineProvider } from "@/lib/marine-context";
import { AppShell } from "@/components/app-shell";
import { RoleGate } from "@/components/role-gate";

export const metadata: Metadata = {
  title: "SALTY — Marine Intelligence Platform",
  description:
    "Comprehensive marine intelligence for fishermen, oceanographic researchers, and coastal operators. Combining satellite SST, chlorophyll, weather, geofencing, and AI agent predictions.",
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MarineProvider>
      <RoleGate><AppShell>{children}</AppShell></RoleGate>
    </MarineProvider>
  );
}
