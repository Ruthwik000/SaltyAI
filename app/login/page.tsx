"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Database, Fish, Radio, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/lib/marine-context";

const roles: {
  id: UserRole;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    id: "fisherman",
    label: "Fisherman",
    description: "PFZ advisories, sea conditions, trip safety, and vessel context.",
    icon: Fish,
  },
  {
    id: "researcher",
    label: "Researcher",
    description: "ERDDAP exploration, historical comparisons, and data exports.",
    icon: Database,
  },
  {
    id: "operator",
    label: "Coastal Operator",
    description: "Fleet awareness, alerts, boundaries, and search operations.",
    icon: Radio,
  },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const nextPath = nextParam?.startsWith("/app") ? nextParam : "/app";
  const [selected, setSelected] = React.useState<UserRole>("fisherman");

  const enterConsole = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("salty_role", selected);
    }
    router.push(nextPath);
  };

  return (
    <main className="min-h-screen bg-white text-zinc-950">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-8 sm:px-6">
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-950 font-sans text-xs font-bold text-white">
              S*
            </span>
            <span className="text-sm font-semibold tracking-tight">
              salty<span className="text-zinc-400">.marine</span>
            </span>
          </Link>
          <span className="font-sans text-[10px] uppercase tracking-widest text-zinc-400">
            Console access / role entry
          </span>
        </header>

        <section className="m-auto w-full max-w-3xl py-12">
          <div className="mb-10 text-center">
            <Badge variant="pill" className="gap-2 border-zinc-200 px-3 py-1 font-sans text-[10px]">
              ROLE CONFIGURATION
            </Badge>
            <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-5xl">
              Who is reading the coast?
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-zinc-600">
              Select your operational perspective to configure dashboard priorities, alerts, and spatial layers.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {roles.map((item) => {
              const Icon = item.icon;
              const active = selected === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelected(item.id)}
                  aria-pressed={active}
                  className={`group text-left rounded-lg border p-5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 ${
                    active
                      ? "border-zinc-950 bg-zinc-950 text-white"
                      : "border-zinc-200 bg-white text-zinc-950 hover:border-zinc-400"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Icon className={`h-5 w-5 ${active ? "text-white" : "text-zinc-700"}`} />
                    <span
                      className={`h-2 w-2 rounded-full ${
                        active ? "bg-sky-400" : "bg-zinc-200 group-hover:bg-sky-400"
                      }`}
                    />
                  </div>
                  <h2 className="mt-8 text-base font-semibold">{item.label}</h2>
                  <p className={`mt-2 text-xs leading-relaxed ${active ? "text-zinc-300" : "text-zinc-600"}`}>
                    {item.description}
                  </p>
                  <span
                    className={`mt-6 block font-sans text-[10px] uppercase tracking-widest ${
                      active ? "text-zinc-400" : "text-zinc-400"
                    }`}
                  >
                    {active ? "Selected" : "Select context"}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col items-center gap-3">
            <Button
              onClick={enterConsole}
              className="h-11 w-full bg-zinc-950 text-sm text-white hover:bg-zinc-800 sm:w-auto sm:px-8"
            >
              Enter marine console <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <p className="font-sans text-[10px] text-zinc-400">
              Role can be changed anytime from the dashboard sidebar or by returning here.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-white" />}>
      <LoginForm />
    </React.Suspense>
  );
}
