import Link from "next/link";
import { AlertTriangle, ArrowRight, ShieldCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { SpeakButton } from "@/components/fisherman/speak-button";
import type { MarineAlert } from "@/lib/marine-data";

interface HazardAlertsCardProps {
  alerts: MarineAlert[];
  totalAlertsCount: number;
}

export function HazardAlertsCard({ alerts, totalAlertsCount }: HazardAlertsCardProps) {
  const { t } = useT();

  /* A warning is the one thing on this screen that must reach someone who
     cannot read it — so it can be heard, title and action together. */
  const spoken = alerts.length
    ? alerts
        .slice(0, 3)
        .map((alert) => `${alert.title}. ${alert.operationalAction}`)
        .join(" ")
    : t("a.normal");

  return (
    <Card className="border-zinc-200 bg-white">
      <CardHeader className="pb-3 border-b border-zinc-100 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-amber-50 border border-amber-200/80 text-amber-600">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold text-zinc-950">
              {t("a.title")}
            </CardTitle>
            <span className="text-[10px] text-zinc-500 font-sans">
              {t("a.activeInSector", { count: alerts.length })}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <SpeakButton size="sm" text={spoken} />
          <Link href="/app/alerts">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7.5 px-2.5 border-zinc-200 hover:bg-zinc-100 text-zinc-800 font-medium gap-1 cursor-pointer"
          >
            <span>{t("dash.knowMore")}</span>
              <ArrowRight className="h-3 w-3 text-zinc-500" />
            </Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-3">
        {alerts.length > 0 ? (
          alerts.slice(0, 3).map((a) => (
            <div
              key={a.id}
              className="p-3 rounded-xl border border-zinc-200 bg-zinc-50/70 space-y-1.5 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-sans text-[10px] font-semibold text-zinc-500 uppercase">
                  {a.source}
                </span>
                <span
                  className={`text-[10px] font-sans px-1.5 py-0.5 rounded font-medium ${
                    a.severity === "Critical" || a.severity === "Severe"
                      ? "bg-rose-50 text-rose-700 border border-rose-200"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}
                >
                  {a.severity}
                </span>
              </div>
              <div className="font-semibold text-zinc-950 text-xs">{a.title}</div>
              <p className="text-[11px] text-zinc-600 leading-snug line-clamp-2">
                {a.operationalAction}
              </p>
            </div>
          ))
        ) : (
          <div className="p-4 rounded-xl border border-zinc-200 bg-emerald-50/50 text-center space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-emerald-800 font-semibold text-xs">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>{t("dash.noWarnings")}</span>
            </div>
            <p className="text-[11px] text-emerald-700">
              {t("a.normal")}
            </p>
          </div>
        )}

        {/* Know More footer button */}
        <Link href="/app/alerts" className="block pt-1">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs h-8 border-zinc-200 hover:bg-zinc-100 text-zinc-800 font-medium flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Know More — All Emergency Advisories ({totalAlertsCount})</span>
            <ArrowRight className="h-3.5 w-3.5 text-zinc-500" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
