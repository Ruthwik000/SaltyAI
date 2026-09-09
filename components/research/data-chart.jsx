"use client";

/**
 * A compact chart drawn from a table the agent produced.
 *
 * Research answers arrive as markdown tables. The table is the honest,
 * inspectable form and it stays - this sits UNDERNEATH it, never instead of
 * it. Deliberate on two counts: the numbers must stay readable exactly as the
 * agent stated them, and the aqua series colour sits below 3:1 against a white
 * surface, so the table is the relief that keeps it legible.
 *
 * ONE Y-AXIS, ALWAYS. Chlorophyll at 0.2-1.0 mg/m3 and sea temperature at
 * 28.6-29.4 degC do technically fit on a shared axis: chlorophyll becomes a
 * flat line along the bottom, SST a flat line along the top, and the reader
 * learns only that one number is bigger. The usual escape is a second y-axis,
 * which is worse - it lets any two lines be placed anywhere relative to each
 * other, and invites a crossing that means nothing at all. So when the series
 * are not comparable this draws SMALL MULTIPLES: one panel per series, each
 * with its own scale, sharing the x-axis. Same comparison, no false
 * equivalence.
 *
 * Inline SVG because the project has no charting library and its package.json
 * is held open by the dev server. No hardship at this size.
 *
 * The palette is the first three categorical slots, validated for
 * colour-vision deficiency across all pairs on a light surface (worst pair
 * deltaE 9.2 deutan, 24.0 normal). Three is the cap on purpose: the fourth
 * slot puts yellow beside orange, which fails that floor. A fourth column
 * stays in the table rather than being drawn in a colour nobody can separate.
 */

import * as React from "react";
import { formatValue, niceTicks } from "@/lib/markdown";

/* Categorical slots 1-3, light surface. Fixed order, never cycled. */
const SERIES_COLORS = ["#2a78d6", "#eb6834", "#1baf7a"];

const WIDTH = 720;
const PAD = { top: 12, right: 14, bottom: 26, left: 50 };
const FULL_PLOT_H = 150;
const PANEL_PLOT_H = 74;

function Panel({ chart, series, colors, plotHeight, showLabels, hover, setHover }) {
  const { labels, kind } = chart;
  const numbers = series.flatMap((s) => s.values).filter((v) => v !== null);
  if (!numbers.length) return null;

  const height = plotHeight + PAD.top + (showLabels ? PAD.bottom : 8);
  const plotW = WIDTH - PAD.left - PAD.right;

  // Bars are read against zero, so their scale must include it. A line is read
  // as a shape, so it keeps its own range and stays legible.
  const base = kind === "bar" ? Math.min(0, Math.min(...numbers)) : Math.min(...numbers);
  const ticks = niceTicks(base, Math.max(...numbers));
  const low = Math.min(...ticks);
  const high = Math.max(...ticks);
  const span = high - low || 1;

  const y = (value) => PAD.top + plotHeight - ((value - low) / span) * plotHeight;
  const slot = plotW / labels.length;
  const centre = (index) => PAD.left + slot * (index + 0.5);
  const every = Math.max(1, Math.ceil(labels.length / 8));

  // Gridlines are for reading a value against, and they compete with the data
  // for attention, so a short panel gets fewer. Thinning by a fixed stride
  // keeps the survivors EVENLY spaced and always includes both bounds -
  // picking "first, middle, last" out of four ticks leaves an axis whose gaps
  // are different sizes, which reads as a mistake.
  const maxGrid = plotHeight >= 120 ? 4 : 2;
  const stride = Math.max(1, Math.ceil((ticks.length - 1) / (maxGrid - 1)));
  const shown =
    ticks.length <= maxGrid
      ? ticks
      : ticks.filter((_, i) => i % stride === 0 || i === ticks.length - 1);

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${height}`}
      className="w-full"
      style={{ height }}
      role="img"
      aria-label={series.map((s) => s.name).join(", ")}
      onMouseLeave={() => setHover(null)}
    >
      {shown.map((tick) => (
        <g key={tick}>
          <line
            x1={PAD.left} x2={WIDTH - PAD.right}
            y1={y(tick)} y2={y(tick)}
            stroke="#e4e4e7" strokeWidth="1"
          />
          <text
            x={PAD.left - 8} y={y(tick) + 3.5}
            textAnchor="end" fontSize="10" fill="#71717a"
          >
            {formatValue(tick)}
          </text>
        </g>
      ))}

      {kind === "bar"
        ? series.map((s, seriesIndex) => {
            const barWidth = Math.max(3, (slot * 0.68) / series.length - 2);
            const groupWidth = barWidth * series.length + 2 * (series.length - 1);
            return s.values.map((value, index) => {
              if (value === null) return null;
              const zero = y(Math.max(low, 0));
              const top = y(value);
              return (
                <rect
                  key={`${seriesIndex}-${index}`}
                  x={centre(index) - groupWidth / 2 + seriesIndex * (barWidth + 2)}
                  y={Math.min(zero, top)}
                  width={barWidth}
                  height={Math.max(1, Math.abs(zero - top))}
                  rx="3"
                  fill={colors[seriesIndex]}
                  opacity={hover === null || hover === index ? 1 : 0.35}
                />
              );
            });
          })
        : series.map((s, seriesIndex) => {
            const points = s.values
              .map((value, index) => (value === null ? null : `${centre(index)},${y(value)}`))
              .filter(Boolean);
            if (!points.length) return null;
            return (
              <g key={seriesIndex}>
                <polyline
                  points={points.join(" ")}
                  fill="none"
                  stroke={colors[seriesIndex]}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {hover !== null && s.values[hover] !== null && (
                  <circle
                    cx={centre(hover)} cy={y(s.values[hover])} r="4.5"
                    fill={colors[seriesIndex]} stroke="#ffffff" strokeWidth="2"
                  />
                )}
              </g>
            );
          })}

      {hover !== null && kind === "line" && (
        <line
          x1={centre(hover)} x2={centre(hover)}
          y1={PAD.top} y2={PAD.top + plotHeight}
          stroke="#a1a1aa" strokeWidth="1" strokeDasharray="3 3"
        />
      )}

      {showLabels &&
        labels.map((label, index) =>
          index % every === 0 ? (
            <text
              key={index}
              x={centre(index)} y={height - 8}
              textAnchor="middle" fontSize="10" fill="#71717a"
            >
              {label.length > 11 ? `${label.slice(0, 10)}…` : label}
            </text>
          ) : null
        )}

      {/* Hit targets: a full-height band per slot, so the pointer never has to
          find a two-pixel line. */}
      {labels.map((label, index) => (
        <rect
          key={`hit-${index}`}
          x={PAD.left + slot * index} y={PAD.top}
          width={slot} height={plotHeight}
          fill="transparent"
          onMouseEnter={() => setHover(index)}
        />
      ))}
    </svg>
  );
}

export function DataChart({ chart, caption }) {
  const [hover, setHover] = React.useState(null);
  const { labels, series, omitted, shareScale } = chart;

  if (!series.length || !labels.length) return null;
  const multiples = !shareScale && series.length > 1;

  return (
    <figure className="my-3 rounded-xl border border-zinc-200 bg-white p-3">
      {/* A legend is present whenever there are two or more series. On small
          multiples each panel is direct-labelled instead, which is stronger:
          identity is never carried by colour alone. */}
      {series.length > 1 && !multiples && (
        <figcaption className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          {series.map((s, i) => (
            <span key={s.name} className="inline-flex items-center gap-1.5 text-[11px] text-zinc-600">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: SERIES_COLORS[i] }}
              />
              {s.name}
            </span>
          ))}
        </figcaption>
      )}

      {multiples ? (
        <div className="space-y-1">
          {series.map((s, index) => (
            <div key={s.name}>
              <p className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-700">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: SERIES_COLORS[index] }}
                />
                {s.name}
                {hover !== null && (
                  <span className="font-normal text-zinc-500">
                    {" · "}
                    {s.values[hover] === null ? "—" : formatValue(s.values[hover])}
                  </span>
                )}
              </p>
              <Panel
                chart={chart}
                series={[s]}
                colors={[SERIES_COLORS[index]]}
                plotHeight={PANEL_PLOT_H}
                showLabels={index === series.length - 1}
                hover={hover}
                setHover={setHover}
              />
            </div>
          ))}
          <p className="pt-0.5 text-[10px] text-zinc-500">
            Each panel has its own scale — these measures are not on a comparable
            range, and one axis would flatten both to straight lines.
          </p>
        </div>
      ) : (
        <Panel
          chart={chart}
          series={series}
          colors={SERIES_COLORS}
          plotHeight={FULL_PLOT_H}
          showLabels
          hover={hover}
          setHover={setHover}
        />
      )}

      {hover !== null && !multiples && (
        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-zinc-600">
          <span className="font-medium text-zinc-900">{labels[hover]}</span>
          {series.map((s, i) => (
            <span key={s.name} className="inline-flex items-center gap-1">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: SERIES_COLORS[i] }}
              />
              {s.name}:{" "}
              <span className="font-medium text-zinc-900">
                {s.values[hover] === null ? "—" : formatValue(s.values[hover])}
              </span>
            </span>
          ))}
        </p>
      )}

      {hover !== null && multiples && (
        <p className="mt-1 text-[11px] font-medium text-zinc-900">{labels[hover]}</p>
      )}

      {omitted > 0 && (
        <p className="mt-1 text-[10px] text-zinc-500">
          {omitted} further column{omitted > 1 ? "s" : ""} left in the table above:
          past three series the colours stop being separable for colour-blind readers.
        </p>
      )}

      {caption && <span className="sr-only">{caption}</span>}
    </figure>
  );
}
