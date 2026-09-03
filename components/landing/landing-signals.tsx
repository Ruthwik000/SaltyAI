interface SignalItem {
  name: string;
  value: string;
  unit: string;
  detail: string;
}

const defaultSignals: SignalItem[] = [
  { name: "SST", value: "28.4", unit: "°C", detail: "thermal front" },
  { name: "CHL-A", value: "0.85", unit: "mg/m³", detail: "ocean colour" },
  { name: "WIND", value: "14", unit: "kts", detail: "ENE / 065°" },
  { name: "WAVE", value: "1.6", unit: "m", detail: "7.8s period" },
];

export function LandingSignals({ signals = defaultSignals }: { signals?: SignalItem[] }) {
  return (
    <section id="signals" className="border-b border-zinc-200/80 bg-zinc-50/70 py-8">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mb-4 flex items-center justify-between">
          <span className="font-sans text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            Coastline signal / demo feed
          </span>
          <span className="font-sans text-[10px] text-zinc-400">Updated just now</span>
        </div>

        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-zinc-200 bg-zinc-200 md:grid-cols-4">
          {signals.map((signal) => (
            <div key={signal.name} className="bg-white p-4">
              <div className="flex items-center justify-between font-sans text-[10px] text-zinc-400">
                <span>{signal.name}</span>
                <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
              </div>
              <div className="mt-2 font-sans text-2xl font-bold tracking-tight text-zinc-950">
                {signal.value}
                <span className="ml-1 text-xs font-normal text-zinc-500">{signal.unit}</span>
              </div>
              <div className="mt-1 text-[11px] text-zinc-500">{signal.detail}</div>
            </div>
          ))}
        </div>

        <p className="mt-3 text-center font-sans text-[10px] text-zinc-400">
          Prototype fallback values are labelled in the console when remote feeds are unavailable.
        </p>
      </div>
    </section>
  );
}
