"use client";

/**
 * Swiss building blocks shared by the researcher, weather and operator
 * screens: numbered section headings, big figures, and a plain forecast line.
 */

import * as React from "react";

export function num(value, digits = 1) {
  return value === null || value === undefined || Number.isNaN(Number(value))
    ? "—"
    : Number(value).toFixed(digits);
}

export function SectionHead({ index, title, aside }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-[#0b0b0c] pb-3">
      <div className="min-w-0">
        <span className="sw-index">{index}</span>
        <h2 className="sw-serif mt-1 text-2xl leading-tight sm:text-3xl">{title}</h2>
      </div>
      {aside && <div className="flex flex-wrap items-center gap-3">{aside}</div>}
    </div>
  );
}

export function Figure({ label, value, unit }) {
  return (
    <div className="flex min-w-0 flex-col justify-between gap-5 bg-white p-4 sm:p-5">
      <span className="sw-label truncate">{label}</span>
      <span className="flex min-w-0 items-baseline gap-1.5">
        <span className="sw-num truncate text-4xl font-semibold leading-none tracking-[-0.04em] sm:text-5xl">
          {value}
        </span>
        {value !== "—" && unit && <span className="text-sm text-[#6d6c70]">{unit}</span>}
      </span>
    </div>
  );
}

/** A plain line over the forecast steps, labelled at each step. */
export function ForecastLine({ hours, metric }) {
  const values = hours.map((hour) => hour[metric.key]);
  const usable = values.filter((value) => value !== null && value !== undefined);
  if (usable.length < 2) {
    return <p className="py-16 text-center text-sm text-[#6d6c70]">No {metric.label.toLowerCase()} forecast.</p>;
  }

  const width = 720;
  const height = 240;
  const pad = { top: 28, right: 20, bottom: 36, left: 20 };
  const min = Math.min(...usable);
  const max = Math.max(...usable);
  const span = max - min || 1;
  const x = (index) => pad.left + (index * (width - pad.left - pad.right)) / (hours.length - 1);
  const y = (value) => pad.top + (1 - (value - min) / span) * (height - pad.top - pad.bottom);
  const points = values
    .map((value, index) => (value === null || value === undefined ? null : [x(index), y(value)]))
    .filter(Boolean);
  const line = points.map(([px, py]) => `${px},${py}`).join(" ");
  const area = `${points[0][0]},${height - pad.bottom} ${line} ${points[points.length - 1][0]},${height - pad.bottom}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label={`${metric.label} forecast`}>
      {[0, 0.5, 1].map((step) => (
        <line
          key={step}
          x1={pad.left}
          x2={width - pad.right}
          y1={pad.top + step * (height - pad.top - pad.bottom)}
          y2={pad.top + step * (height - pad.top - pad.bottom)}
          stroke="#dcd9d1"
          strokeWidth="1"
        />
      ))}
      <polygon points={area} fill="#0b0b0c" opacity="0.05" />
      <polyline points={line} fill="none" stroke="#0b0b0c" strokeWidth="2" />
      {values.map((value, index) =>
        value === null || value === undefined ? null : (
          <g key={index}>
            <rect x={x(index) - 3} y={y(value) - 3} width="6" height="6" fill="#0b0b0c" />
            <text x={x(index)} y={y(value) - 10} textAnchor="middle" fontSize="12" fontWeight="600" fill="#0b0b0c">
              {num(value, metric.digits)}
            </text>
          </g>
        )
      )}
      {hours.map((hour, index) => (
        <text key={hour.time} x={x(index)} y={height - 12} textAnchor="middle" fontSize="11" fill="#6d6c70">
          {String(hour.hour).replace("Now ", "")}
        </text>
      ))}
    </svg>
  );
}

/**
 * A line over a dated series.
 *
 * Deliberately not ForecastLine. That one prints the value above every marker,
 * which reads well over eight forecast steps and becomes an unreadable thicket
 * over thirty daily observations. Here the numbers live on the axis, the ends
 * of the series are labelled, and only the most recent point is marked —
 * because "where is it now, and which way has it been going" is the whole
 * question a trend chart answers.
 *
 * Gaps are real: a cloudy day has no satellite pixel. Missing values break the
 * line rather than being interpolated across, so a week of cloud looks like a
 * week of cloud and not like a measurement.
 */
export function SeriesLine({ points = [], unit, digits = 2, height = 190 }) {
  const usable = points.filter((point) => point.value !== null && point.value !== undefined);
  if (usable.length < 2) {
    return <p className="py-14 text-center text-sm text-[#6d6c70]">Not enough clear days to draw a line.</p>;
  }

  const width = 720;
  const pad = { top: 16, right: 16, bottom: 30, left: 46 };
  const values = usable.map((point) => point.value);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const span = high - low || Math.abs(high) || 1;
  const floor = low - span * 0.1;
  const ceiling = high + span * 0.1;
  const range = ceiling - floor || 1;

  const x = (index) => pad.left + (index * (width - pad.left - pad.right)) / (points.length - 1);
  const y = (value) => pad.top + (1 - (value - floor) / range) * (height - pad.top - pad.bottom);

  // Break the path wherever a day has no value.
  const segments = [];
  let run = [];
  points.forEach((point, index) => {
    if (point.value === null || point.value === undefined) {
      if (run.length > 1) segments.push(run);
      run = [];
      return;
    }
    run.push(`${x(index)},${y(point.value)}`);
  });
  if (run.length > 1) segments.push(run);

  const lastIndex = points.reduce(
    (found, point, index) => (point.value === null || point.value === undefined ? found : index),
    0
  );
  const last = points[lastIndex];
  const ticks = [floor, (floor + ceiling) / 2, ceiling];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img"
         aria-label={`Series in ${unit || "value"}, ${usable.length} observations`}>
      {ticks.map((tick) => (
        <g key={tick}>
          <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} stroke="#dcd9d1" strokeWidth="1" />
          <text x={pad.left - 8} y={y(tick) + 4} textAnchor="end" fontSize="11" fill="#6d6c70">
            {num(tick, digits)}
          </text>
        </g>
      ))}

      {segments.map((segment, index) => (
        <polyline key={index} points={segment.join(" ")} fill="none" stroke="#0b0b0c" strokeWidth="2" />
      ))}

      {last?.value !== null && last?.value !== undefined && (
        <g>
          <circle cx={x(lastIndex)} cy={y(last.value)} r="4" fill="#0b0b0c" />
          <text x={x(lastIndex)} y={y(last.value) - 12} textAnchor="end" fontSize="12" fontWeight="600" fill="#0b0b0c">
            {num(last.value, digits)}
          </text>
        </g>
      )}

      {[0, points.length - 1].map((index) => (
        <text key={index} x={x(index)} y={height - 10}
              textAnchor={index === 0 ? "start" : "end"} fontSize="11" fill="#6d6c70">
          {points[index]?.date?.slice(5) || ""}
        </text>
      ))}
    </svg>
  );
}
