import * as React from "react";
import { Badge } from "@/components/ui/badge";

export function PageHeader({ title, description, badge, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
      <div>
        {badge && (
          <Badge variant="minimal" className="text-[10px] uppercase mb-1 font-sans">
            {badge}
          </Badge>
        )}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-xs text-zinc-500 leading-relaxed max-w-2xl">
            {description}
          </p>
        )}
      </div>

      {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
    </div>
  );
}
