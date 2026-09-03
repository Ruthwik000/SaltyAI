import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function LandingWorkflow() {
  return (
    <section id="workflow" className="border-b border-zinc-200/80 bg-zinc-950 py-20 text-white sm:py-24">
      <div className="mx-auto grid max-w-5xl gap-12 px-4 sm:px-6 md:grid-cols-[1fr_1.2fr] md:items-center">
        <div>
          <Badge variant="outline" className="border-zinc-700 bg-zinc-900 font-sans text-[10px] text-zinc-300">
            THE SALTY LOOP
          </Badge>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl text-white">
            Ask the water.
            <br />
            See the evidence.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-zinc-400">
            The local agent can interpret a question, choose an approved data tool, and return a grounded answer. You keep the query, source, and returned records in view.
          </p>
          <Link
            href="/app/ai-agent"
            className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-white underline underline-offset-4 hover:text-zinc-200 transition-colors"
          >
            Try the grounded agent <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="border border-zinc-800 bg-zinc-900/70 p-4 font-sans text-xs rounded-lg shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3 text-zinc-500">
            <span>REQUEST TRACE / 0018</span>
            <span className="text-emerald-400 font-medium">GROUNDED</span>
          </div>
          <div className="space-y-4 py-5">
            <div>
              <span className="text-zinc-500 font-semibold block text-[10px] uppercase tracking-wider">user</span>
              <p className="mt-1 text-zinc-200">What are the wind and wave conditions near Visakhapatnam?</p>
            </div>
            <div>
              <span className="text-sky-400 font-semibold block text-[10px] uppercase tracking-wider">
                tool → get_forecast()
              </span>
              <p className="mt-1 text-zinc-400 font-mono text-[11px]">
                dataset: prototype_marine / window: next 72h
              </p>
            </div>
            <div>
              <span className="text-emerald-400 font-semibold block text-[10px] uppercase tracking-wider">response</span>
              <p className="mt-1 leading-relaxed text-zinc-200">
                Wind and wave values are available from the returned forecast records. Every value carries its source and validity window.
              </p>
            </div>
          </div>
          <div className="border-t border-zinc-800 pt-3 text-[10px] text-zinc-500">
            <span className="text-zinc-300 font-medium">guardrail:</span> no returned data → NOT AVAILABLE
          </div>
        </div>
      </div>
    </section>
  );
}
