import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function LandingWorkflow() {
  return (
    <section id="workflow" className="border-b border-zinc-200/80 bg-zinc-950 py-20 text-white sm:py-24">
      <div className="mx-auto grid max-w-5xl gap-12 px-4 sm:px-6 md:grid-cols-[1fr_1.2fr] md:items-center">
        <div>
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
      </div>
    </section>
  );
}
