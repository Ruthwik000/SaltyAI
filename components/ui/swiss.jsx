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
