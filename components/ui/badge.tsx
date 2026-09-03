import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-zinc-900 text-zinc-50 shadow-xs hover:bg-zinc-900/80",
        secondary:
          "border-transparent bg-zinc-100 text-zinc-900 hover:bg-zinc-200/80",
        destructive:
          "border-transparent bg-red-500 text-zinc-50 shadow-xs hover:bg-red-500/80",
        outline: "border-zinc-200 text-zinc-950 bg-white",
        minimal:
          "border-zinc-200/80 bg-zinc-50/80 text-zinc-700 font-sans text-[11px] tracking-tight font-normal",
        pill: "border-zinc-200/90 bg-white/90 text-zinc-800 shadow-xs backdrop-blur-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
