import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MarineAlert } from "@/lib/marine-data";

interface HazardAlertsCardProps {
  alerts: MarineAlert[];
  totalAlertsCount: number;
}

export function HazardAlertsCard({ alerts, totalAlertsCount }: HazardAlertsCardProps) {
  return (
    <Card className="border-zinc-200">
      <CardHeader className="pb-3 border-b border-zinc-100 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <CardTitle className="text-sm font-semibold text-zinc-950">
            Active Hazard Alerts
          </CardTitle>
        </div>
        <Link href="/app/alerts">
          <Badge variant="minimal" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
            {totalAlertsCount} Total
          </Badge>
        </Link>
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        {alerts.length > 0 ? (
          alerts.slice(0, 3).map((a) => (
            <div
              key={a.id}
              className="p-3 rounded-lg border border-zinc-200 bg-zinc-50/70 space-y-1 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-sans text-[10px] font-semibold text-zinc-500 uppercase">
                  {a.source}
                </span>
                <span className="text-[10px] font-sans text-rose-600 font-medium">
                  {a.severity}
                </span>
              </div>
              <div className="font-medium text-zinc-900">{a.title}</div>
              <p className="text-[11px] text-zinc-500 leading-snug line-clamp-2">
                {a.operationalAction}
              </p>
            </div>
          ))
        ) : (
          <div className="p-4 text-center text-xs text-zinc-500">
            No critical hazard warnings currently active for this sector.
          </div>
        )}

        <Link href="/app/alerts" className="block pt-2">
          <Button variant="outline" size="sm" className="w-full text-xs h-8 border-zinc-200">
            Open Alerts & Disasters Hub →
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
