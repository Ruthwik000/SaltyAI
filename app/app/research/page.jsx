"use client";

import Link from "next/link";
import { Database } from "lucide-react";
import { useMarine } from "@/lib/marine-context";
import { Button } from "@/components/ui/button";
import { ResearchConsole } from "@/components/research/research-console";

export default function ResearchPage() {
  const { role } = useMarine();

  if (role === "fisherman") {
    return (
      <div className="mx-auto my-12 max-w-xl space-y-4 rounded-xl border border-zinc-200 bg-white p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-600">
          <Database className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold text-zinc-950">Research &amp; Data</h2>
        <p className="text-xs leading-relaxed text-zinc-600">
          Dataset exploration and exports are set up for the researcher and operator
          consoles. Your work lives in Fishing Zones, Risk &amp; Safety and your trip
          tracker.
        </p>
        <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
          <Link href="/app/fishing-zones">
            <Button
              size="sm"
              className="bg-zinc-950 text-xs text-white hover:bg-zinc-800"
            >
              Go to Fishing Zones
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return <ResearchConsole />;
}
