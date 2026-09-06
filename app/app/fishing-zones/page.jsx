"use client";

import { useMarine } from "@/lib/marine-context";
import { ZonesMapView } from "@/components/fisherman/zones-map-view";
import { PfzCatalogView } from "@/components/legacy/pfz-catalog-view";

export default function FishingZonesPage() {
  const { role } = useMarine();

  // Fishermen work from the map; researchers keep the catalogue and the
  // side-by-side zone comparison they had before.
  return role === "fisherman" ? <ZonesMapView /> : <PfzCatalogView />;
}
