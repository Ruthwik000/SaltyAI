import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const variantStyles = {
  safe: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  danger: "bg-rose-50 text-rose-700 border-rose-200",
  neutral: "bg-zinc-100 text-zinc-700 border-zinc-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
};

export function StatusPill({ status, variant, className }) {
  let computedVariant = variant;
  if (!computedVariant) {
    const s = status.toLowerCase();
    if (
      s.includes("safe") ||
      s.includes("low") ||
      s.includes("optimal") ||
      s.includes("ok")
    ) {
      computedVariant = "safe";
    } else if (s.includes("warn") || s.includes("moderate") || s.includes("caution")) {
      computedVariant = "warning";
    } else if (
      s.includes("danger") ||
      s.includes("high") ||
      s.includes("critical") ||
      s.includes("breach")
    ) {
      computedVariant = "danger";
    } else {
      computedVariant = "neutral";
    }
  }

  return (
    <Badge
      variant="minimal"
      className={cn(
        "text-[10px] font-sans font-medium px-2 py-0.5",
        variantStyles[computedVariant],
        className
      )}
    >
      {status}
    </Badge>
  );
}
