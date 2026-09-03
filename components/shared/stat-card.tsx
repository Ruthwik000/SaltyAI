import * as React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  trendText?: string;
  trendType?: "positive" | "negative" | "neutral" | "warning";
  footerLeft?: string;
  footerRight?: string;
  icon?: React.ElementType;
  className?: string;
}

export function StatCard({
  label,
  value,
  unit,
  subtitle,
  trendText,
  trendType = "neutral",
  footerLeft,
  footerRight,
  icon: Icon,
  className,
}: StatCardProps) {
  const trendColors = {
    positive: "text-emerald-600",
    negative: "text-rose-600",
    warning: "text-amber-600",
    neutral: "text-zinc-500",
  };

  return (
    <Card className={cn("p-4 flex flex-col justify-between", className)}>
      <div className="flex items-center justify-between text-xs font-sans text-zinc-500">
        <span className="uppercase tracking-wider text-[11px]">{label}</span>
        {Icon && <Icon className="h-4 w-4 text-zinc-600 shrink-0" />}
      </div>

      <div className="my-2">
        <div className="text-2xl sm:text-3xl font-bold font-sans tracking-tight text-zinc-950">
          {value}
          {unit && (
            <span className="ml-1 text-sm font-sans font-normal text-zinc-500">
              {unit}
            </span>
          )}
        </div>

        {(trendText || subtitle) && (
          <div className="flex items-center gap-1.5 text-[11px] mt-1 font-sans">
            {trendText && (
              <span className={cn("font-medium", trendColors[trendType])}>
                {trendText}
              </span>
            )}
            {subtitle && <span className="text-zinc-500">{subtitle}</span>}
          </div>
        )}
      </div>

      {(footerLeft || footerRight) && (
        <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-[10px] font-sans text-zinc-400">
          <span>{footerLeft}</span>
          <span className="font-medium text-zinc-700">{footerRight}</span>
        </div>
      )}
    </Card>
  );
}
