import * as React from "react";
import { cn } from "@/lib/utils";

/** Extra detail kept out of the way until someone asks for it. */
export function KnowMore({ summary = "Know more", className, children }) {
  return (
    <details className={cn("sw-details", className)}>
      <summary>{summary}</summary>
      <div className="sw-details__text">{children}</div>
    </details>
  );
}
