import Link from "next/link";
import { Compass, Layers3, Map, ShieldCheck, Waves } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function LandingHero() {
  return (
    <section className="relative overflow-hidden border-b border-zinc-200/80 pt-16 pb-14 sm:pt-24 sm:pb-20">
      <div className="absolute inset-0 -z-10 bg-grid-subtle opacity-60 [mask-image:radial-gradient(ellipse_65%_70%_at_50%_0%,#000_55%,transparent_100%)]" />
      <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">

        <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
          The ocean is the signal.
          <br />
          <span className="underline decoration-zinc-300 decoration-2 underline-offset-8">
            Make it legible.
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-zinc-600 sm:text-lg">
          SALTY brings satellite, oceanographic, forecast, warning, historical, and boundary data into one grounded workspace for people who work on the coast.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/app">
            <Button size="lg" className="h-11 w-full bg-zinc-950 px-6 text-sm text-white hover:bg-zinc-800 sm:w-auto">
              <Compass className="mr-2 h-4 w-4" />
              Explore the marine console
            </Button>
          </Link>
          <Link href="/app/map">
            <Button size="lg" variant="outline" className="h-11 w-full px-6 text-sm sm:w-auto">
              <Map className="mr-2 h-4 w-4" />
              Open live map
            </Button>
          </Link>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-sans text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-zinc-700" />
            Source-labelled data
          </span>
          <span className="text-zinc-300">•</span>
          <span className="flex items-center gap-1.5">
            <Layers3 className="h-3.5 w-3.5 text-zinc-700" />
            Map-ready layers
          </span>
          <span className="text-zinc-300">•</span>
          <span className="flex items-center gap-1.5">
            <Waves className="h-3.5 w-3.5 text-zinc-700" />
            No invented coordinates
          </span>
        </div>
      </div>
    </section>
  );
}
