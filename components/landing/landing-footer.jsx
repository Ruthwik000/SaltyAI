import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="border-t border-zinc-200 bg-zinc-50/50">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-8 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded bg-zinc-950 font-sans text-[10px] font-bold text-white">
            S*
          </span>
          <span className="font-semibold text-zinc-900">salty.marine</span>
          <span>• Marine intelligence, grounded in data.</span>
        </div>
        <div className="flex gap-4 font-sans text-[10px]">
          <Link href="/app/research" className="hover:text-zinc-950 transition-colors">
            Research
          </Link>
          <Link href="/app/map" className="hover:text-zinc-950 transition-colors">
            Marine Map
          </Link>
          <Link href="/app/alerts" className="hover:text-zinc-950 transition-colors">
            Alerts
          </Link>
        </div>
      </div>
    </footer>
  );
}
