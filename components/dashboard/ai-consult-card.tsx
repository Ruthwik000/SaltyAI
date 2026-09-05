"use client";

import { Sparkles, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { useMarine } from "@/lib/marine-context";

interface AiConsultCardProps {
  locationName: string;
  nearbyPfzName: string;
  onOpenAiDrawer: () => void;
}

export function AiConsultCard({
  locationName,
  nearbyPfzName,
  onOpenAiDrawer,
}: AiConsultCardProps) {
  const { t } = useT();
  const { role } = useMarine();

  // A skipper gets the three questions they actually ask, in their language;
  // the other consoles keep the technical prompts.
  const suggestedQueries =
    role === "fisherman"
      ? [t("agent.q1"), t("agent.q2"), t("agent.q3")]
      : [
          `Is it safe to sail tomorrow off ${locationName}?`,
          `What is the SST gradient at ${nearbyPfzName.slice(0, 18)}?`,
          `Calculate drift for a disabled craft lost 3 hours ago.`,
        ];

  return (
    <Card className="border-zinc-200 bg-gradient-to-b from-zinc-50/50 to-white">
      <CardHeader className="pb-3 border-b border-zinc-100">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-zinc-800" />
          <CardTitle className="text-sm font-semibold text-zinc-950">
            {t("ag.askSalty")}
          </CardTitle>
        </div>
        <p className="text-[11px] text-zinc-500 mt-1">
          {t("ag.grounded")}
        </p>
      </CardHeader>
      <CardContent className="pt-4 space-y-2">
        {suggestedQueries.map((query, idx) => (
          <button
            key={idx}
            onClick={onOpenAiDrawer}
            className="w-full text-left p-2.5 rounded-lg border border-zinc-200/80 bg-white hover:bg-zinc-100 text-xs text-zinc-700 transition-colors flex items-center justify-between group cursor-pointer"
          >
            <span className="truncate pr-2">{query}</span>
            <ArrowRight className="h-3 w-3 text-zinc-400 group-hover:text-zinc-900 shrink-0" />
          </button>
        ))}

        <Button
          onClick={onOpenAiDrawer}
          className="w-full text-xs h-8 mt-2 bg-zinc-950 hover:bg-zinc-800 text-white gap-1.5"
        >
          <span>{t("dash.launchQuery")}</span>
          <Sparkles className="h-3 w-3 text-zinc-300" />
        </Button>
      </CardContent>
    </Card>
  );
}
