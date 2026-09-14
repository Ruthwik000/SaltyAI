"use client";

/**
 * The chart kit for the research console.
 *
 * Restored: this module was deleted during a refactor while two live screens
 * still imported it — `/app/weather` through MarineSciencePanel and `/app/research`
 * through ResearchCatalog — so both were failing to build.
 *
 * Hand-rolled SVG on purpose. The project carries no charting library, and at
 * this size none is needed; it also keeps the palette under our control.
 *
 * Palette is the first three categorical slots, validated for colour-vision
 * deficiency on a light surface. ONE Y-AXIS, always: a second axis lets any
 * two lines be placed anywhere relative to each other and invites a crossing
 * that means nothing. Where two series are not comparable, they belong in
 * separate cards, not on a twin axis.
 *
 * Every card carries a Values toggle that swaps the drawing for the table it
 * was drawn from. That is the accessibility route and the contrast relief —
 * the aqua series sits below 3:1 on white — and it is what lets a researcher
 * read the exact number rather than estimate it off an axis.
 */

import * as React from "react";
import { Table2 } from "lucide-react";

const INK = "#0b0b0c";
const RULE = "#dcd9d1";
const MUTED = "#6d6c70";
const SERIES = ["#2a78d6", "#eb6834", "#1baf7a"];

const WIDTH = 720;

/**
 * X labels are printed as given.
 *
 * This is the fix for the "Invalid Date" axis: MarineSciencePanel labels its
 * steps "Now", "+2 h", "+4 h", while the ERDDAP catalogue passes ISO
 * timestamps. Running every label through `new Date()` turned the first kind
 * into "Invalid Date" across the whole axis. A label is only reformatted when
 * it actually parses as a date AND looks like one.
 */
function axisLabel(raw) {
  if (raw == null) return "";
  const text = String(raw);
  if (!/^\d{4}-\d{2}-\d{2}/.test(text)) return text;
  const at = new Date(text);
  if (Number.isNaN(at.getTime())) return text;
  return text.length <= 10
    ? at.toLocaleDateString([], { day: "numeric", month: "short" })
    : at.toLocaleString([], { day: "numeric", month: "short", hour: "2-digit" });
}

/** Points may arrive as {t|time|date|label, value|v}. */
function readPoint(point) {
  if (!point) return { label: "", value: null };
  const label = point.t ?? point.time ?? point.date ?? point.label ?? "";
  const raw = point.value ?? point.v ?? null;
  const value = raw === null || raw === undefined || raw === "" ? null : Number(raw);
  return { label, value: Number.isFinite(value) ? value : null };
}

function niceTicks(low, high, count = 4) {
  if (!Number.isFinite(low) || !Number.isFinite(high)) return [0, 1];
  if (low === high) return [low - 1, low, low + 1];
  const raw = (high - low) / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) || magnitude * 10;
  const first = Math.floor(low / step) * step;
  const ticks = [];
  for (let value = first; value <= high + step / 2; value += step) {
    ticks.push(Number(value.toFixed(10)));
  }
  return ticks.length >= 2 ? ticks : [low, high];
}

const fmt = (value, digits = 2) =>
  value === null || value === undefined ? "—" : Number(value).toFixed(digits).replace(/\.?0+$/, "") || "0";

/* ------------------------------------------------------------------ */
/* Card                                                                */
/* ------------------------------------------------------------------ */

export function ChartCard({ title, caption, table, children }) {
  const [showValues, setShowValues] = React.useState(false);
  return (
    <figure className="rounded-xl border border-zinc-200 bg-white p-3 sm:p-4">
      <figcaption className="mb-3 flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="block text-sm font-bold text-zinc-950">{title}</span>
          {caption && <span className="mt-0.5 block text-[11px] leading-snug text-zinc-500">{caption}</span>}
        </span>
        {table && (
          <button
            type="button"
            onClick={() => setShowValues((open) => !open)}
            aria-pressed={showValues}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-zinc-200 px-2 py-1 text-[10px] font-medium text-zinc-600 hover:bg-zinc-50"
          >
            <Table2 className="h-3 w-3" />
            {showValues ? "Chart" : "Values"}
          </button>
        )}
      </figcaption>
      {showValues && table ? table : children}
    </figure>
  );
}

export function ValueTable({ columns = [], rows = [] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs tabular-nums">
        <thead>
          <tr className="border-b border-zinc-200 text-[10px] uppercase tracking-wide text-zinc-500">
            {columns.map((column) => (
              <th key={column} className="px-2 py-2 font-semibold">{column}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-2 py-1.5 text-zinc-800">
                  {cell === null || cell === undefined ? "—" : String(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StatTile({ label, value, hint, tone = "neutral" }) {
  const colour =
    tone === "cool" ? "text-[#2a78d6]" : tone === "warm" ? "text-[#eb6834]" : "text-zinc-950";
  return (
    <div className="rounded-lg border border-zinc-200/80 bg-white p-2.5 sm:p-3">
      <span className="block text-[10px] uppercase tracking-wide text-zinc-400">{label}</span>
      <span className={`mt-1 block text-lg font-bold tabular-nums sm:text-xl ${colour}`}>{value}</span>
      {hint && <span className="mt-1 block text-[10px] leading-snug text-zinc-500">{hint}</span>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Plots                                                               */
/* ------------------------------------------------------------------ */

function Frame({ height, ticks, y, labels, x, children, unit }) {
  const every = Math.max(1, Math.ceil(labels.length / 8));
  return (
    <svg viewBox={`0 0 ${WIDTH} ${height}`} className="h-auto w-full" role="img"
         aria-label={`Series${unit ? ` in ${unit}` : ""}`}>
      {ticks.map((tick) => (
        <g key={tick}>
          <line x1={46} x2={WIDTH - 14} y1={y(tick)} y2={y(tick)} stroke={RULE} strokeWidth="1" />
          <text x={38} y={y(tick) + 4} textAnchor="end" fontSize="11" fill={MUTED}>{fmt(tick)}</text>
        </g>
      ))}
      {children}
      {labels.map((label, index) =>
        index % every === 0 ? (
          <text key={index} x={x(index)} y={height - 8} textAnchor="middle" fontSize="11" fill={MUTED}>
            {axisLabel(label)}
          </text>
        ) : null
      )}
    </svg>
  );
}

function buildPlot(points, height, extra = []) {
  const read = points.map(readPoint);
  const numbers = [...read, ...extra.map(readPoint)]
    .map((point) => point.value)
    .filter((value) => value !== null);
  const pad = { top: 14, right: 14, bottom: 26, left: 46 };
  const ticks = niceTicks(Math.min(...numbers), Math.max(...numbers));
  const low = Math.min(...ticks);
  const high = Math.max(...ticks);
  const span = high - low || 1;
  const plotH = height - pad.top - pad.bottom;
  const y = (value) => pad.top + plotH - ((value - low) / span) * plotH;
  const x = (index) =>
    read.length < 2 ? pad.left : pad.left + (index * (WIDTH - pad.left - pad.right)) / (read.length - 1);
  return { read, ticks, y, x, numbers, zero: y(Math.max(low, Math.min(0, high))) };
}

/**
 * Solid series, with an optional dashed comparison drawn behind it.
 *
 * Built for two very different loads. MarineSciencePanel hands it eight
 * forecast steps; the ERDDAP catalogue hands it a decade of weekly ARGO
 * observations, or an hourly wind field running to several thousand points.
 * The naive version drew a filled circle on every point, which at that density
 * is not a line chart — it is a solid block of colour with a line somewhere
 * inside it. So:
 *
 *   - markers appear only when the series is sparse enough to read them;
 *   - the stroke thins as the series gets denser, so the shape stays visible;
 *   - dragging across the plot zooms into that span, and Reset returns;
 *   - hovering reads out the exact value and its label, because estimating a
 *     number off an axis is not the same as knowing it.
 *
 * Nothing is averaged or thinned away: what is drawn is every point in the
 * selected range. Zoom is the answer to density, not silent downsampling.
 */
export function TimeSeriesChart({ points = [], baseline = null, unit = "", height = 220 }) {
  const [range, setRange] = React.useState(null);
  const [drag, setDrag] = React.useState(null);
  const [hover, setHover] = React.useState(null);
  const svgRef = React.useRef(null);

  const all = React.useMemo(() => points.map(readPoint), [points]);
  const allBase = React.useMemo(() => (baseline || []).map(readPoint), [baseline]);

  /* Reset the zoom when the caller swaps the series in. Adjusting state during
     render rather than in an effect: this project runs react-hooks lint at
     error level, and `set-state-in-effect` would reject the effect form. */
  const [seen, setSeen] = React.useState(points);
  if (seen !== points) {
    setSeen(points);
    setRange(null);
  }

  const from = range ? range.from : 0;
  const to = range ? range.to : all.length - 1;
  const view = all.slice(from, to + 1);
  const viewBase = allBase.length ? allBase.slice(from, to + 1) : [];

  if (view.filter((point) => point.value !== null).length < 2) {
    return <p className="py-10 text-center text-sm text-zinc-500">Not enough points to draw a line.</p>;
  }

  const { read, ticks, y, x } = buildPlot(view, height, viewBase);
  const dense = read.length > 60;
  const stroke = read.length > 600 ? 0.9 : read.length > 200 ? 1.2 : 2;
  const path = (series) =>
    series
      .map((point, index) => (point.value === null ? null : `${x(index)},${y(point.value)}`))
      .filter(Boolean)
      .join(" ");

  /* Pointer x in the 720-wide viewBox, whatever the rendered width. */
  const toIndex = (event) => {
    const box = svgRef.current?.getBoundingClientRect();
    if (!box) return null;
    const vx = ((event.clientX - box.left) / box.width) * WIDTH;
    const step = (WIDTH - 60) / Math.max(1, read.length - 1);
    return Math.max(0, Math.min(read.length - 1, Math.round((vx - 46) / step)));
  };

  const hovered = hover !== null ? read[hover] : null;

  return (
    <div className="relative">
      <div className="mb-1 flex items-center justify-between gap-3 text-[10px] text-zinc-500">
        <span>
          {read.length} of {all.length} points
          {range ? " · zoomed" : dense ? " · drag to zoom" : ""}
        </span>
        <span className="flex items-center gap-2">
          {hovered && (
            <span className="font-medium text-zinc-900 tabular-nums">
              {axisLabel(hovered.label)} · {fmt(hovered.value)} {unit}
            </span>
          )}
          {range && (
            <button
              type="button"
              onClick={() => setRange(null)}
              className="rounded border border-zinc-200 px-1.5 py-0.5 font-medium text-zinc-600 hover:bg-zinc-50"
            >
              Reset
            </button>
          )}
        </span>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${height}`}
        className={`h-auto w-full touch-none ${dense ? "cursor-crosshair" : ""}`}
        role="img"
        aria-label={`Series${unit ? ` in ${unit}` : ""}, ${read.length} points`}
        onPointerDown={(event) => {
          const index = toIndex(event);
          if (index !== null) setDrag({ from: index, to: index });
        }}
        onPointerMove={(event) => {
          const index = toIndex(event);
          if (index === null) return;
          setHover(index);
          if (drag) setDrag((current) => ({ ...current, to: index }));
        }}
        onPointerUp={() => {
          if (drag && Math.abs(drag.to - drag.from) > 1) {
            const low = Math.min(drag.from, drag.to);
            const high = Math.max(drag.from, drag.to);
            setRange({ from: from + low, to: from + high });
          }
          setDrag(null);
        }}
        onPointerLeave={() => {
          setDrag(null);
          setHover(null);
        }}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={46} x2={WIDTH - 14} y1={y(tick)} y2={y(tick)} stroke={RULE} strokeWidth="1" />
            <text x={38} y={y(tick) + 4} textAnchor="end" fontSize="11" fill={MUTED}>{fmt(tick)}</text>
          </g>
        ))}

        {baseline && (
          <polyline points={path(viewBase)} fill="none" stroke={MUTED} strokeWidth="1.5" strokeDasharray="5 4" />
        )}
        <polyline points={path(read)} fill="none" stroke={SERIES[0]} strokeWidth={stroke}
                  strokeLinejoin="round" strokeLinecap="round" />

        {/* Markers only where they can be told apart. */}
        {!dense &&
          read.map((point, index) =>
            point.value === null ? null : (
              <circle key={index} cx={x(index)} cy={y(point.value)} r="2.5" fill={SERIES[0]} />
            )
          )}

        {drag && Math.abs(drag.to - drag.from) > 1 && (
          <rect
            x={Math.min(x(drag.from), x(drag.to))}
            y={10}
            width={Math.abs(x(drag.to) - x(drag.from))}
            height={height - 36}
            fill={INK}
            opacity="0.08"
          />
        )}

        {hovered && hovered.value !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={10} y2={height - 26} stroke={INK} strokeWidth="1" opacity="0.35" />
            <circle cx={x(hover)} cy={y(hovered.value)} r="3.5" fill={INK} />
          </g>
        )}

        {read.map((point, index) => {
          const every = Math.max(1, Math.ceil(read.length / 7));
          return index % every === 0 ? (
            <text key={index} x={x(index)} y={height - 8} textAnchor="middle" fontSize="11" fill={MUTED}>
              {axisLabel(point.label)}
            </text>
          ) : null;
        })}
      </svg>

      {baseline && (
        <p className="mt-1 flex flex-wrap items-center gap-x-4 text-[11px] text-zinc-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4" style={{ backgroundColor: SERIES[0] }} />
            Observed
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 border-t-2 border-dashed" style={{ borderColor: MUTED }} />
            Comparison
          </span>
        </p>
      )}
    </div>
  );
}

/** Bars showing departure from a baseline series — above it and below it. */
export function AnomalyChart({ points = [], baseline = [], unit = "", height = 220 }) {
  const usable = points.map(readPoint).filter((point) => point.value !== null);
  if (usable.length < 2) {
    return <p className="py-10 text-center text-sm text-zinc-500">Not enough points to draw.</p>;
  }
  const { read, ticks, y, x } = buildPlot(points, height, baseline);
  const base = baseline.map(readPoint);
  const width = Math.max(4, (WIDTH - 60) / read.length - 6);

  return (
    <Frame height={height} ticks={ticks} y={y} labels={read.map((p) => p.label)} x={x} unit={unit}>
      {read.map((point, index) => {
        const reference = base[index]?.value ?? base[0]?.value ?? 0;
        if (point.value === null) return null;
        const top = Math.min(y(point.value), y(reference));
        const tall = Math.abs(y(point.value) - y(reference));
        return (
          <rect key={index} x={x(index) - width / 2} y={top} width={width} height={Math.max(1, tall)}
                fill={point.value >= reference ? SERIES[0] : SERIES[1]} opacity="0.85" />
        );
      })}
      {base.length > 0 && (
        <polyline
          points={base.map((point, index) => (point.value === null ? null : `${x(index)},${y(point.value)}`)).filter(Boolean).join(" ")}
          fill="none" stroke={INK} strokeWidth="1.5" strokeDasharray="4 4"
        />
      )}
    </Frame>
  );
}

/** Bars read against zero, so the scale always includes it. */
export function BarChart({ bars = [], unit = "", valueLabel, height = 220 }) {
  if (bars.length === 0) {
    return <p className="py-10 text-center text-sm text-zinc-500">No values.</p>;
  }
  const points = bars.map((bar) => ({ t: bar.label, value: bar.value }));
  const values = points.map((point) => point.value).filter((value) => value !== null);
  const { read, ticks, y, x } = buildPlot(
    points, height, [{ t: "", value: 0 }, { t: "", value: Math.max(0, ...values) }]
  );
  const zeroY = y(0);
  const width = Math.max(6, (WIDTH - 60) / read.length - 8);

  return (
    <Frame height={height} ticks={ticks} y={y} labels={read.map((p) => p.label)} x={x} unit={unit}>
      <line x1={46} x2={WIDTH - 14} y1={zeroY} y2={zeroY} stroke={INK} strokeWidth="1" />
      {read.map((point, index) =>
        point.value === null ? null : (
          <g key={index}>
            <rect
              x={x(index) - width / 2}
              y={Math.min(y(point.value), zeroY)}
              width={width}
              height={Math.max(1, Math.abs(y(point.value) - zeroY))}
              fill={point.value >= 0 ? SERIES[0] : SERIES[1]}
              opacity="0.85"
            />
            {valueLabel && read.length <= 10 && (
              <text x={x(index)} y={Math.min(y(point.value), zeroY) - 5} textAnchor="middle"
                    fontSize="10" fill={MUTED}>
                {valueLabel(point.value)}
              </text>
            )}
          </g>
        )
      )}
    </Frame>
  );
}
