"use client";

/**
 * Chart primitives for the research console.
 *
 * Hand-rolled SVG rather than a charting dependency, so the console works with
 * no network install and stays in the app's own visual language.
 *
 * Palette: validated categorical/diverging steps (blue #2a78d6, red #e34948,
 * neutral #d4d4d8) against a white chart surface. One y-axis per chart, one hue
 * per sequential encoding, a warm/cool pair with a neutral midpoint for
 * anomalies, recessive axes, and a hover readout on every plot. Each chart also
 * offers a table view — exact values matter for research, and it is the relief
 * required for the lower-contrast steps.
 */

import * as React from "react";
import { Table2, LineChart as LineIcon } from "lucide-react";

const INK = "#18181b";
const MUTED = "#71717a";
const GRID = "#e4e4e7";
const SERIES = "#2a78d6";
const BASELINE = "#a1a1aa";
const WARM = "#e34948";
const COOL = "#2a78d6";

const M = { top: 14, right: 14, bottom: 26, left: 46 };

/** Responsive width without a resize-on-every-render loop. */
function useWidth(fallback = 640) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(fallback);

  React.useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const next = Math.round(entries[0].contentRect.width);
      setWidth((current) => (Math.abs(current - next) > 1 ? next : current));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}

function niceTicks(min: number, max: number, count = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
    return [min];
  }
  const raw = (max - min) / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || mag * 10;
  const first = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  for (let v = first; v <= max + step * 0.001; v += step) ticks.push(Number(v.toFixed(6)));
  return ticks;
}

function fmt(value: number, unit = ""): string {
  const abs = Math.abs(value);
  const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  return `${value.toFixed(digits)}${unit ? ` ${unit}` : ""}`;
}

function monthLabel(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}

/* ------------------------------------------------------------------ */
/* Shell                                                               */
/* ------------------------------------------------------------------ */

export function ChartCard({
  title,
  caption,
  children,
  table,
}: {
  title: string;
  caption?: string;
  children: React.ReactNode;
  table?: React.ReactNode;
}) {
  const [showTable, setShowTable] = React.useState(false);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-xs font-semibold text-zinc-950">{title}</h3>
          {caption && (
            <p className="mt-0.5 text-[11px] leading-snug text-zinc-500">{caption}</p>
          )}
        </div>
        {table && (
          <button
            type="button"
            onClick={() => setShowTable((open) => !open)}
            className="flex shrink-0 items-center gap-1 rounded-md border border-zinc-200 px-2 py-1 text-[10px] font-medium text-zinc-600 hover:bg-zinc-50"
          >
            {showTable ? (
              <>
                <LineIcon className="h-3 w-3" />
                <span>Chart</span>
              </>
            ) : (
              <>
                <Table2 className="h-3 w-3" />
                <span>Values</span>
              </>
            )}
          </button>
        )}
      </div>

      <div className="mt-3">{showTable && table ? table : children}</div>
    </section>
  );
}

export function ValueTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: (string | number)[][];
}) {
  return (
    <div className="max-h-64 overflow-auto rounded-lg border border-zinc-200">
      <table className="w-full text-left font-sans text-[11px]">
        <thead className="sticky top-0 bg-zinc-50 text-zinc-500">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-2.5 py-1.5 font-medium">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 text-zinc-800">
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-2.5 py-1.5">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Time series with a climatology baseline                             */
/* ------------------------------------------------------------------ */

export function TimeSeriesChart({
  points,
  baseline,
  unit,
  height = 230,
}: {
  points: { t: string; value: number }[];
  baseline?: { t: string; value: number }[];
  unit: string;
  height?: number;
}) {
  const { ref, width } = useWidth();
  const [hover, setHover] = React.useState<number | null>(null);

  if (points.length === 0) {
    return <p className="py-8 text-center text-xs text-zinc-500">No values in range.</p>;
  }

  const innerW = Math.max(80, width - M.left - M.right);
  const innerH = height - M.top - M.bottom;

  const all = [...points.map((p) => p.value), ...(baseline || []).map((p) => p.value)];
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const pad = (hi - lo) * 0.12 || 0.5;
  const yMin = lo - pad;
  const yMax = hi + pad;

  const x = (i: number) =>
    M.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => M.top + innerH - ((v - yMin) / (yMax - yMin)) * innerH;

  const path = (data: { value: number }[]) =>
    data.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");

  const ticks = niceTicks(yMin, yMax);
  const labelEvery = Math.max(1, Math.ceil(points.length / 6));
  const active = hover != null ? points[hover] : null;

  return (
    <div ref={ref} className="relative w-full">
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={`Time series in ${unit || "units"}`}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(event) => {
          const box = event.currentTarget.getBoundingClientRect();
          const rel = event.clientX - box.left - M.left;
          const i = Math.round((rel / innerW) * (points.length - 1));
          setHover(Math.max(0, Math.min(points.length - 1, i)));
        }}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={M.left} x2={width - M.right} y1={y(tick)} y2={y(tick)} stroke={GRID} strokeWidth={1} />
            <text x={M.left - 8} y={y(tick)} textAnchor="end" dominantBaseline="middle" fontSize={10} fill={MUTED}>
              {fmt(tick)}
            </text>
          </g>
        ))}

        {points.map((point, index) =>
          index % labelEvery === 0 ? (
            <text key={point.t} x={x(index)} y={height - 8} textAnchor="middle" fontSize={10} fill={MUTED}>
              {monthLabel(point.t)}
            </text>
          ) : null
        )}

        {baseline && baseline.length === points.length && (
          <path d={path(baseline)} fill="none" stroke={BASELINE} strokeWidth={1.5} strokeDasharray="5 4" />
        )}

        <path d={path(points)} fill="none" stroke={SERIES} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {hover != null && (
          <>
            <line x1={x(hover)} x2={x(hover)} y1={M.top} y2={M.top + innerH} stroke={INK} strokeWidth={1} strokeOpacity={0.25} />
            {/* 2px surface ring keeps the marker readable over the line */}
            <circle cx={x(hover)} cy={y(points[hover].value)} r={5} fill={SERIES} stroke="#ffffff" strokeWidth={2} />
          </>
        )}
      </svg>

      <div className="mt-1 flex flex-wrap items-center gap-3 text-[10px] text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full" style={{ background: SERIES }} />
          <span>Observed</span>
        </span>
        {baseline && (
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full" style={{ background: BASELINE }} />
            <span>Monthly climatology</span>
          </span>
        )}
      </div>

      {active && (
        <div
          className="pointer-events-none absolute -top-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[10px] shadow-sm"
          style={{ left: Math.min(Math.max(x(hover as number) - 40, 0), Math.max(0, width - 96)) }}
        >
          <div className="text-zinc-500">{monthLabel(active.t)}</div>
          <div className="font-semibold text-zinc-950">{fmt(active.value, unit)}</div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Anomaly bars (diverging around zero)                                */
/* ------------------------------------------------------------------ */

export function AnomalyChart({
  points,
  baseline,
  unit,
  height = 170,
}: {
  points: { t: string; value: number }[];
  baseline: { t: string; value: number }[];
  unit: string;
  height?: number;
}) {
  const { ref, width } = useWidth();
  const [hover, setHover] = React.useState<number | null>(null);

  const anomalies = points.map((point, index) => ({
    t: point.t,
    value: point.value - (baseline[index]?.value ?? point.value),
  }));

  if (anomalies.length === 0) return null;

  const innerW = Math.max(80, width - M.left - M.right);
  const innerH = height - M.top - M.bottom;
  const extent = Math.max(...anomalies.map((a) => Math.abs(a.value))) || 1;
  const y = (v: number) => M.top + innerH / 2 - (v / extent) * (innerH / 2);
  const slot = innerW / anomalies.length;
  const barW = Math.max(1, slot - 2); // 2px surface gap between adjacent bars
  const labelEvery = Math.max(1, Math.ceil(anomalies.length / 6));

  return (
    <div ref={ref} className="relative w-full">
      <svg width={width} height={height} role="img" aria-label="Departure from climatology" onMouseLeave={() => setHover(null)}>
        <line x1={M.left} x2={width - M.right} y1={y(0)} y2={y(0)} stroke={GRID} strokeWidth={1} />
        <text x={M.left - 8} y={y(extent)} textAnchor="end" dominantBaseline="middle" fontSize={10} fill={MUTED}>
          +{fmt(extent)}
        </text>
        <text x={M.left - 8} y={y(-extent)} textAnchor="end" dominantBaseline="middle" fontSize={10} fill={MUTED}>
          -{fmt(extent)}
        </text>

        {anomalies.map((item, index) => {
          const top = item.value >= 0 ? y(item.value) : y(0);
          const h = Math.max(1, Math.abs(y(item.value) - y(0)));
          return (
            <g key={item.t} onMouseEnter={() => setHover(index)}>
              <rect x={M.left + index * slot} y={M.top} width={slot} height={innerH} fill="transparent" />
              <rect
                x={M.left + index * slot + (slot - barW) / 2}
                y={top}
                width={barW}
                height={h}
                rx={Math.min(2, barW / 2)}
                fill={item.value >= 0 ? WARM : COOL}
                fillOpacity={hover == null || hover === index ? 1 : 0.45}
              />
            </g>
          );
        })}

        {anomalies.map((item, index) =>
          index % labelEvery === 0 ? (
            <text key={item.t} x={M.left + index * slot + slot / 2} y={height - 8} textAnchor="middle" fontSize={10} fill={MUTED}>
              {monthLabel(item.t)}
            </text>
          ) : null
        )}
      </svg>

      <div className="mt-1 flex flex-wrap items-center gap-3 text-[10px] text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ background: WARM }} />
          <span>Above climatology</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ background: COOL }} />
          <span>Below climatology</span>
        </span>
      </div>

      {hover != null && (
        <div
          className="pointer-events-none absolute -top-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[10px] shadow-sm"
          style={{ left: Math.min(Math.max(M.left + hover * slot - 30, 0), Math.max(0, width - 110)) }}
        >
          <div className="text-zinc-500">{monthLabel(anomalies[hover].t)}</div>
          <div className="font-semibold text-zinc-950">
            {anomalies[hover].value >= 0 ? "+" : ""}
            {fmt(anomalies[hover].value, unit)}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Simple categorical bars (climatology, histogram)                    */
/* ------------------------------------------------------------------ */

export function BarChart({
  bars,
  unit,
  height = 170,
  valueLabel,
}: {
  bars: { label: string; value: number }[];
  unit?: string;
  height?: number;
  valueLabel?: (value: number) => string;
}) {
  const { ref, width } = useWidth();
  const [hover, setHover] = React.useState<number | null>(null);

  if (bars.length === 0) return null;

  const innerW = Math.max(80, width - M.left - M.right);
  const innerH = height - M.top - M.bottom;
  const lo = Math.min(0, ...bars.map((b) => b.value));
  const hi = Math.max(...bars.map((b) => b.value));
  const span = hi - lo || 1;
  const y = (v: number) => M.top + innerH - ((v - lo) / span) * innerH;
  const slot = innerW / bars.length;
  const barW = Math.max(2, slot - 2);
  const ticks = niceTicks(lo, hi, 3);

  return (
    <div ref={ref} className="relative w-full">
      <svg width={width} height={height} role="img" aria-label="Distribution" onMouseLeave={() => setHover(null)}>
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={M.left} x2={width - M.right} y1={y(tick)} y2={y(tick)} stroke={GRID} strokeWidth={1} />
            <text x={M.left - 8} y={y(tick)} textAnchor="end" dominantBaseline="middle" fontSize={10} fill={MUTED}>
              {fmt(tick)}
            </text>
          </g>
        ))}

        {bars.map((bar, index) => (
          <g key={`${bar.label}-${index}`} onMouseEnter={() => setHover(index)}>
            <rect x={M.left + index * slot} y={M.top} width={slot} height={innerH} fill="transparent" />
            <rect
              x={M.left + index * slot + (slot - barW) / 2}
              y={y(bar.value)}
              width={barW}
              height={Math.max(1, y(lo) - y(bar.value))}
              rx={Math.min(4, barW / 2)}
              fill={SERIES}
              fillOpacity={hover == null || hover === index ? 1 : 0.45}
            />
          </g>
        ))}

        {bars.map((bar, index) =>
          bars.length <= 12 || index % 2 === 0 ? (
            <text
              key={`label-${bar.label}-${index}`}
              x={M.left + index * slot + slot / 2}
              y={height - 8}
              textAnchor="middle"
              fontSize={10}
              fill={MUTED}
            >
              {bar.label}
            </text>
          ) : null
        )}
      </svg>

      {hover != null && (
        <div
          className="pointer-events-none absolute -top-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[10px] shadow-sm"
          style={{ left: Math.min(Math.max(M.left + hover * slot - 30, 0), Math.max(0, width - 110)) }}
        >
          <div className="text-zinc-500">{bars[hover].label}</div>
          <div className="font-semibold text-zinc-950">
            {valueLabel ? valueLabel(bars[hover].value) : fmt(bars[hover].value, unit)}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Stat tile                                                           */
/* ------------------------------------------------------------------ */

export function StatTile({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "warm" | "cool";
}) {
  const colour =
    tone === "warm" ? "text-rose-700" : tone === "cool" ? "text-sky-700" : "text-zinc-950";
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3">
      <div className="text-[10px] uppercase tracking-wide text-zinc-400">{label}</div>
      <div className={`mt-1 font-sans text-base font-bold sm:text-lg ${colour}`}>{value}</div>
      {hint && <div className="text-[10px] leading-snug text-zinc-500">{hint}</div>}
    </div>
  );
}
