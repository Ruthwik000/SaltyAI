"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight, Database, Fish, Radio } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-header";

const roles = [
  { id: "fisherman", index: "01", label: "Fisherman", more: "Safety, fishing zones and trips", icon: Fish },
  { id: "researcher", index: "02", label: "Researcher", more: "Datasets, history and exports", icon: Database },
  { id: "operator", index: "03", label: "Coastal operator", more: "Fleet, warnings and rescue", icon: Radio },
];

function RoleForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const nextPath = nextParam?.startsWith("/app") ? nextParam : "/app";
  const [selected, setSelected] = React.useState("fisherman");

  const enterConsole = (event) => {
    event.preventDefault();
    if (typeof window !== "undefined") {
      window.localStorage.setItem("salty_role", selected);
    }
    router.push(nextPath);
  };

  return (
    <form onSubmit={enterConsole} className="grid gap-10 pb-32 pt-10 sm:pb-12 lg:grid-cols-12 lg:pt-16">
      <div className="lg:col-span-4">
        <span className="sw-index">Step 01</span>
        <h1 className="sw-serif mt-3 text-6xl leading-[0.95] text-[#0b0b0c] sm:text-7xl">
          Who are
          <br />
          <span className="italic">you?</span>
        </h1>
      </div>

      <div className="lg:col-span-8">
        <div role="radiogroup" className="border-t border-[#0b0b0c]">
          {roles.map(({ id, index, label, more, icon: Icon }) => {
            const active = selected === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setSelected(id)}
                className={`sw-press grid w-full grid-cols-[2.5rem_1fr_auto] items-center gap-4 border-b border-[#dcd9d1] px-4 py-5 text-left sm:grid-cols-[4rem_1fr_auto] sm:px-6 sm:py-6 ${
                  active ? "bg-[#0b0b0c] text-white" : "hover:bg-white"
                }`}
              >
                <span className={`sw-num text-[11px] font-semibold tracking-[0.14em] ${active ? "text-white/60" : "text-[#6d6c70]"}`}>
                  {index}
                </span>
                <span className="min-w-0">
                  <span className="sw-serif block text-3xl leading-tight sm:text-4xl">{label}</span>
                  <span className={`mt-1 block text-[15px] ${active ? "text-white/70" : "text-[#6d6c70]"}`}>
                    {more}
                  </span>
                </span>
                <Icon className="h-7 w-7" strokeWidth={1.5} />
              </button>
            );
          })}
        </div>

        {/* On a phone the button lives in a fixed bar, so it can never scroll out of reach. */}
        <div
          className="sw-dark fixed inset-x-0 bottom-0 z-40 px-4 pt-3 sm:static sm:mt-8 sm:bg-transparent sm:p-0"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <button
            type="submit"
            className="sw-press flex h-14 w-full items-center justify-center gap-3 rounded-[2px] bg-white px-8 text-base font-semibold text-[#0b0b0c] hover:bg-[#dcd9d1] sm:inline-flex sm:w-auto sm:bg-[#0b0b0c] sm:text-white sm:hover:bg-[#3a393e]"
          >
            Continue <ArrowUpRight className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="w-full flex-1 px-4 sm:px-6 lg:px-10">
        <React.Suspense fallback={null}>
          <RoleForm />
        </React.Suspense>
      </main>
      <div className="hidden sm:block">
        <SiteFooter />
      </div>
    </div>
  );
}
