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
      </div>
    </section>
  );
}
