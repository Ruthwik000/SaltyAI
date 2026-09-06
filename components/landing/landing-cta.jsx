import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LandingCta() {
  return (
    <section id="sources" className="py-16 sm:py-20 border-b border-zinc-200/80 bg-white">
      <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-6 px-4 sm:flex-row sm:items-center sm:px-6">
        <Link href="/app">
          <Button className="h-10 shrink-0 bg-zinc-950 text-xs text-white hover:bg-zinc-800">
            Enter SALTY Marine <ArrowRight className="ml-2 h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </section>
  );
}
