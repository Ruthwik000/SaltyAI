import Link from "next/link";
import {
  ArrowRight,
  CloudSun,
  Database,
  Fish,
  Map,
  Radio,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const defaultCapabilities = [
  {
    icon: Map,
    label: "Marine map",
    title: "Read the water as a living grid.",
    text: "Layer SST, chlorophyll, wind, waves, swell, currents, and restricted zones over one coastal view.",
    href: "/app/map",
    tag: "MAP / LAYERS",
  },
  {
    icon: Fish,
    label: "Fishing zones",
    title: "Find the signal. Verify the source.",
    text: "Keep PFZ advisories distinct from environmental inputs. No invented coordinates, no black-box certainty.",
    href: "/app/fishing-zones",
    tag: "PFZ / ADVISORY",
  },
  {
    icon: CloudSun,
    label: "Forecast & warnings",
    title: "Know what the next tide brings.",
    text: "Cyclone, wind, wave, swell, rainfall, lightning, and thunderstorm data in one warning-aware workspace.",
    href: "/app/alerts",
    tag: "FORECAST / ALERTS",
  },
  {
    icon: Database,
    label: "Research",
    title: "Go back through the record.",
    text: "Query historical ranges, compare zones, and export chart-ready CSV, JSON, or NetCDF data.",
    href: "/app/research",
    tag: "ERDDAP / HISTORY",
  },
  {
    icon: ShieldCheck,
    label: "Safety boundary",
    title: "Make the boundary unambiguous.",
    text: "Run point-in-zone checks and nearest-boundary queries against GeoJSON restricted areas.",
    href: "/app/map",
    tag: "GEOFENCE / SAFETY",
  },
  {
    icon: Radio,
    label: "Grounded agent",
    title: "Ask. Inspect. Decide.",
    text: "A local Ollama agent can call approved ERDDAP tools and show the returned evidence beside its answer.",
    href: "/app/ai-agent",
    tag: "OLLAMA / TOOLS",
  },
];

export function LandingCapabilities({ capabilities = defaultCapabilities }) {
  return (
    <section id="platform" className="border-b border-zinc-200/80 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mb-12 max-w-2xl">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl text-zinc-950">
            From raw feeds to a decision you can inspect.
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            Each surface is built around the data task, not an abstract AI promise.
          </p>
        </div>

        <div className="grid gap-px overflow-hidden rounded-xl border border-zinc-200 bg-zinc-200 md:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className="group bg-white p-6 transition-colors hover:bg-zinc-50 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <Icon className="h-5 w-5 text-zinc-700" />
                  </div>
                  <h3 className="mt-8 text-base font-semibold tracking-tight text-zinc-950">
                    {item.title}
                  </h3>
                  <p className="mt-2 min-h-12 text-xs leading-relaxed text-zinc-600">
                    {item.text}
                  </p>
                </div>
                <span className="mt-6 inline-flex items-center gap-1 text-xs font-medium text-zinc-950">
                  {item.label}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
