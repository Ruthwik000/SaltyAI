"use client";

import {
  Droplets,
  Eye,
  Navigation,
  Thermometer,
  Waves,
  Wind,
} from "lucide-react";
import type { PointConditions } from "@/lib/fisherman-api";

interface Cell {
  label: string;
  value: string;
  hint?: string;
  icon: React.ElementType;
}

function show(
  value: number | null | undefined,
  unit: string,
  digits = 1
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${Number(value).toFixed(digits)}${unit}`;
}

/**
 * The conditions a skipper acts on at one coordinate.
 *
 * Deliberately excludes the research readings the backend also returns —
 * chlorophyll, barometric pressure — which belong on the researcher console,
 * not on a phone at sea.
 */
export function ConditionsGrid({
  conditions,
  columns = 2,
}: {
  conditions: PointConditions;
  columns?: 2 | 3 | 4;
}) {
  const cells: Cell[] = [
    {
      label: "Sea temp",
      value: show(conditions.sst, "°C"),
      icon: Thermometer,
    },
    {
      label: "Waves",
      value: show(conditions.waveHeight, " m"),
      hint:
        conditions.wavePeriod != null
          ? `Period ${conditions.wavePeriod}s`
          : undefined,
      icon: Waves,
    },
    {
      label: "Wind",
      value:
        conditions.windSpeed != null
          ? `${Math.round(conditions.windSpeed)} kts`
          : "—",
      hint: conditions.windDirection || undefined,
      icon: Wind,
    },
    {
      label: "Swell",
      value: show(conditions.swellHeight, " m"),
      icon: Navigation,
    },
    {
      label: "Current",
      value: show(conditions.currentSpeed, " m/s", 2),
      hint: conditions.currentDirection || undefined,
      icon: Droplets,
    },
    {
      label: "Visibility",
      value: show(conditions.visibility, " km", 0),
      icon: Eye,
    },
  ];

  const cols =
    columns === 4
      ? "grid-cols-2 sm:grid-cols-4"
      : columns === 3
      ? "grid-cols-2 sm:grid-cols-3"
      : "grid-cols-2";

  return (
    <div className={`grid ${cols} gap-2`}>
      {cells.map((cell) => {
        const Icon = cell.icon;
        return (
          <div
            key={cell.label}
            className="rounded-lg border border-zinc-200 bg-white p-2.5"
          >
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-zinc-400">
              <Icon className="h-3 w-3" />
              <span>{cell.label}</span>
            </div>
            <div className="mt-1 text-sm font-semibold text-zinc-950">
              {cell.value}
            </div>
            {cell.hint && (
              <div className="text-[10px] text-zinc-500">{cell.hint}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
