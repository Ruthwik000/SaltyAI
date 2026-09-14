import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

/* A label, not a pill: uppercase, tracked, hairline-bordered. */
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-[2px] border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
  {
    variants: {
      variant: {
        default: "border-[#0b0b0c] bg-[#0b0b0c] text-white",
        secondary: "border-[#dcd9d1] bg-[#efede7] text-[#3a393e]",
        destructive: "border-[#d0182a] bg-transparent text-[#d0182a]",
        outline: "border-[#dcd9d1] bg-transparent text-[#3a393e]",
        minimal: "border-[#dcd9d1] bg-transparent text-[#3a393e]",
        pill: "border-[#dcd9d1] bg-transparent text-[#3a393e]",
      },
    },
    defaultVariants: {
      variant: "outline",
    },
  }
);

function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
