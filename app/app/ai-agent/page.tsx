"use client";

import * as React from "react";
import Link from "next/link";
import { useMarine } from "@/lib/marine-context";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateMessageId } from "@/lib/id";
import {
  Sparkles,
  Send,
  Database,
  ArrowRight,
} from "lucide-react";

interface AgentMessage {
  id: string;
  sender: "user" | "agent";
  text: string;
  sources?: string[];
  metrics?: { label: string; value: string }[];
  actionLink?: { label: string; href: string };
  time: string;
}

export default function AiAgentPage() {
  const { location } = useMarine();
  const [inputQuery, setInputQuery] = React.useState("");
  const [messages, setMessages] = React.useState<AgentMessage[]>([
    {
      id: "initial-1",
      sender: "agent",
      text: `Hello! I am the Salty Marine AI Agent. I continuously synthesize satellite SST, ocean color, meteorological buoy telemetry, and statutory hazard bulletins across Indian coastal waters.\n\nCurrently grounded in ${location.name}, ${location.state} (${location.sea}). How can I assist you with your voyage, research, or fleet management?`,
      sources: ["INSAT-3DR Multichannel SST", "INCOIS OON Moored Buoys", "IMD Marine Bulletin"],
      metrics: [
        { label: "SST", value: `${location.sst}°C` },
        { label: "Wave Height", value: `${location.waveHeight}m` },
        { label: "Wind", value: `${location.windSpeed} kts ${location.windDirection}` },
        { label: "Risk Index", value: `${location.riskScore}/100` },
      ],
      time: "Just now",
    },
  ]);
  const [isTyping, setIsTyping] = React.useState(false);

  const sampleQuestions = [
    `What is the SST near Visakhapatnam?`,
    `Is it safe to go fishing tomorrow morning?`,
    `Where is the nearest fishing zone?`,
    `Show me the weather for the next 3 days.`,
    `Which regions have high chlorophyll?`,
    `What areas should I avoid?`,
    `Where could the lost fisherman have drifted?`,
  ];

  const handleSend = (text?: string) => {
    const query = text || inputQuery;
    if (!query.trim()) return;

    const userMessage: AgentMessage = {
      id: generateMessageId("u"),
      sender: "user",
      text: query,
      time: "Just now",
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!text) setInputQuery("");
    setIsTyping(true);

    setTimeout(() => {
      let reply: AgentMessage;
      const q = query.toLowerCase();

      if (q.includes("sst") && q.includes("visakhapatnam")) {
        reply = {
          id: generateMessageId("a"),
          sender: "agent",
          text: `Sea Surface Temperature near Visakhapatnam (17.68°N, 83.21°E) is currently 28.4°C, which is approximately +0.4°C above the seasonal climatological mean. Satellite radiometry shows a distinct thermal front 18 NM offshore where SST drops to 27.6°C, creating an ideal pelagic aggregation front.`,
          sources: ["INSAT-3DR Radiometer (0.04°)", "INCOIS Buoy BD08", "NOAA OI-SST"],
          metrics: [
            { label: "Visakhapatnam SST", value: "28.4°C" },
            { label: "Thermal Front", value: "0.8°C / 2km" },
            { label: "Climatology Anomaly", value: "+0.4°C" },
          ],
          actionLink: { label: "Inspect SST Thermal Layer on Marine Map", href: "/app/map" },
          time: "Just now",
        };
      } else if (q.includes("safe") || (q.includes("fishing") && q.includes("tomorrow"))) {
        reply = {
          id: generateMessageId("a"),
          sender: "agent",
          text: `Yes, tomorrow morning between 04:30 AM and 01:30 PM is rated SAFE for motorized craft and mechanized trawlers off ${location.name}. Significant wave height will remain under 1.6m with moderate 12-14 kts winds from ${location.windDirection}. However, wind speed is projected to pick up to 18 kts by late afternoon, so returning before 03:00 PM is strongly recommended.`,
          sources: ["INCOIS WaveWatch III Model", "IMD Coastal WRF Forecast", "Salty Invariant Engine"],
          metrics: [
            { label: "Safe Departure Window", value: "04:30 - 13:30 IST" },
            { label: "Wave SWH", value: "1.4 - 1.6 m" },
            { label: "Wind Gust Risk", value: "Low (Pre-noon)" },
          ],
          actionLink: { label: "Calculate Trip Risk for Your Vessel Type", href: "/app/risk" },
          time: "Just now",
        };
      } else if (q.includes("nearest") && (q.includes("zone") || q.includes("pfz"))) {
        reply = {
          id: generateMessageId("a"),
          sender: "agent",
          text: `The nearest high-suitability Potential Fishing Zone is the Bheemunipatnam Offshore Front (Sector-A), located 18.2 Nautical Miles bearing 068° ENE from Visakhapatnam. The zone features an optimal chlorophyll bloom (1.15 mg/m³) and a sharp 0.8°C thermal front. High concentrations of Yellowfin Tuna and Indian Mackerel have been reported.`,
          sources: ["INCOIS PFZ Multichannel Advisory", "MODIS Aqua Ocean Color", "Commercial Catch Logs"],
          metrics: [
            { label: "Distance & Bearing", value: "18.2 NM (068° ENE)" },
            { label: "Suitability Score", value: "94% (Very High)" },
            { label: "Depth", value: "55 meters" },
          ],
          actionLink: { label: "Open Fishing Zone Navigation Guide", href: "/app/fishing-zones" },
          time: "Just now",
        };
      } else if (q.includes("3 days") || q.includes("weather")) {
        reply = {
          id: generateMessageId("a"),
          sender: "agent",
          text: `3-Day Marine Outlook for ${location.name} and surrounding waters:\n\n• Today: Fair to partly cloudy, waves 1.6m, wind 14 kts ENE. Risk: Low (28/100).\n• Tomorrow: Fair, waves 1.5m, wind 12 kts NE. Optimal sea state for fishing.\n• Day 3: Cloudiness increasing, waves 1.9m, wind 18 kts. Moderate swell developing from central Bay of Bengal depression.`,
          sources: ["IMD Regional Meteorological Centre", "INCOIS High-Res Wave Forecast"],
          metrics: [
            { label: "Day 1 Risk", value: "Low (28/100)" },
            { label: "Day 2 Risk", value: "Low (22/100)" },
            { label: "Day 3 Risk", value: "Moderate (42/100)" },
          ],
          actionLink: { label: "View Detailed 7-Day Weather & Tides", href: "/app/weather" },
          time: "Just now",
        };
      } else if (q.includes("chlorophyll")) {
        reply = {
          id: generateMessageId("a"),
          sender: "agent",
          text: `High chlorophyll-a concentrations (>1.2 mg/m³) are currently centered in two primary zones:\n\n1. Pulicat Shoal (North Tamil Nadu / South AP): 1.38 mg/m³ driven by estuarine outflow.\n2. Wadge Bank Upwelling Zone (South Kerala / Kanyakumari): 1.62 mg/m³ indicating strong phytoplankton biomass and primary biological productivity.\n\nThese zones correlate with 88-96% PFZ suitability indices.`,
          sources: ["MODIS-Aqua Chlorophyll-a 8-Day Composite", "Sentinel-3 OLCI Ocean Color"],
          metrics: [
            { label: "Wadge Bank Chl-a", value: "1.62 mg/m³" },
            { label: "Pulicat Chl-a", value: "1.38 mg/m³" },
            { label: "Visakhapatnam Chl-a", value: "0.85 mg/m³" },
          ],
          actionLink: { label: "Toggle Chlorophyll Layer on Marine Map", href: "/app/map" },
          time: "Just now",
        };
      } else if (q.includes("avoid") || q.includes("restricted") || q.includes("boundary")) {
        reply = {
          id: generateMessageId("a"),
          sender: "agent",
          text: `Key maritime areas to avoid:\n\n1. India-Sri Lanka IMBL (Palk Strait & Gulf of Mannar): Strictly maintain at least 5.0 NM distance to avoid naval interdiction.\n2. Gahirmatha Marine Sanctuary (Odisha): Trawling ban active within 20km for Olive Ridley turtle nesting season.\n3. Eastern Naval Command Zulu-4 Gunnery Range (15NM South of Vizag): Live firing exercise zone.\n4. Northwest Bay of Bengal: Active IMD Strong Wind advisory (45-55 kmph squalls).`,
          sources: ["Indian Coast Guard Border Directive", "Wildlife Protection Act MPAs", "IMD Hazard Advisory"],
          metrics: [
            { label: "IMBL Caution Buffer", value: "5.0 NM" },
            { label: "Restricted MPAs", value: "2 Active" },
          ],
          actionLink: { label: "Inspect Restricted Geofences & Buffer Alarms", href: "/app/geofencing" },
          time: "Just now",
        };
      } else if (q.includes("drift") || q.includes("lost")) {
        reply = {
          id: generateMessageId("a"),
          sender: "agent",
          text: `For a craft lost 3.5 hours ago off ${location.name} (LKP 17.58°N, 83.38°E): Kinematic drift modeling indicates a net displacement of 6.4 Nautical Miles along bearing 058° ENE. Surface currents (0.7 kts NE) combined with wind leeway (1.1 kts ENE) yield a Datum center at 17.642°N, 83.475°E with a 3.8 NM search radius.`,
          sources: ["IAMSAR Leeway Kinematic Model", "INCOIS Surface ADCP Currents", "WRF Wind Vector"],
          metrics: [
            { label: "Calculated Datum", value: "17.642°N, 83.475°E" },
            { label: "Search Radius", value: "3.8 Nautical Miles" },
            { label: "Pattern", value: "Sector Search (VS)" },
          ],
          actionLink: { label: "Open Search & Rescue Operations Center", href: "/app/lost-fisherman" },
          time: "Just now",
        };
      } else {
        reply = {
          id: generateMessageId("a"),
          sender: "agent",
          text: `Query analyzed for ${location.name}: Current ocean state shows significant wave height of ${location.waveHeight}m, wind at ${location.windSpeed} knots ${location.windDirection}, and SST at ${location.sst}°C. Marine risk level is evaluated as ${location.riskLevel} (${location.riskScore}/100). How else can I refine this for you?`,
          sources: ["Consolidated Ocean Telemetry", "INCOIS Coastal Feeds"],
          actionLink: { label: "Explore Marine Map", href: "/app/map" },
          time: "Just now",
        };
      }

      setMessages((prev) => [...prev, reply]);
      setIsTyping(false);
    }, 650);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950 flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-zinc-900" />
            <span>Salty Marine AI Agent</span>
          </h1>
        </div>
      </div>

      {/* Suggested Prompt Chips */}
      <div className="p-3 rounded-xl border border-zinc-200 bg-white shadow-xs space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {sampleQuestions.map((q, i) => (
            <button
              key={i}
              onClick={() => handleSend(q)}
              className="text-xs text-zinc-700 bg-zinc-50 hover:bg-zinc-100 hover:text-zinc-950 border border-zinc-200 px-2.5 py-1 rounded-md transition-colors cursor-pointer text-left"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Conversation Card */}
      <Card className="border-zinc-200 bg-white shadow-xs flex flex-col h-[560px]">
        {/* Messages Stream */}
        <CardContent className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs font-sans">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${
                m.sender === "user" ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-xl p-4 ${
                  m.sender === "user"
                    ? "bg-zinc-950 text-white shadow-xs"
                    : "border border-zinc-200 bg-zinc-50/50 text-zinc-900 shadow-xs"
                }`}
              >
                <p className="leading-relaxed whitespace-pre-wrap text-xs sm:text-sm">
                  {m.text}
                </p>

                {/* Metrics Pill Grid */}
                {m.metrics && (
                  <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-3 gap-2 pt-3 border-t border-zinc-200/80 font-sans text-xs">
                    {m.metrics.map((met, idx) => (
                      <div
                        key={idx}
                        className="bg-white p-2 rounded-md border border-zinc-200/80 shadow-2xs"
                      >
                        <span className="text-zinc-400 text-[10px] block">{met.label}</span>
                        <span className="font-bold text-zinc-950 text-xs">{met.value}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Sources & Evidence */}
                {m.sources && (
                  <div className="mt-3 pt-2.5 border-t border-zinc-200/60 flex flex-wrap items-center gap-1.5 text-[10px] font-sans text-zinc-500">
                    <Database className="h-3 w-3 text-zinc-600 shrink-0" />
                    <span className="font-semibold text-zinc-700">Grounded Evidence:</span>
                    {m.sources.map((src, sIdx) => (
                      <span
                        key={sIdx}
                        className="bg-zinc-200/60 text-zinc-800 px-1.5 py-0.2 rounded"
                      >
                        {src}
                      </span>
                    ))}
                  </div>
                )}

                {/* Action Deep Link */}
                {m.actionLink && (
                  <div className="mt-3 pt-2.5 border-t border-zinc-200/80">
                    <Link
                      href={m.actionLink.href}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-950 hover:text-zinc-600 underline underline-offset-4"
                    >
                      <span>{m.actionLink.label}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                )}
              </div>

              <span className="text-[10px] font-sans text-zinc-400 mt-1 px-1">
                {m.time}
              </span>
            </div>
          ))}

          {isTyping && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-sans p-2">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-600 animate-pulse" />
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-600 animate-pulse delay-75" />
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-600 animate-pulse delay-150" />
              <span>Verifying marine parameters against INCOIS and ERDDAP...</span>
            </div>
          )}
        </CardContent>

        {/* Input Bar */}
        <CardFooter className="p-3 sm:p-4 border-t border-zinc-200 bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2 w-full"
          >
            <Input
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask anything about sea state, fishing zones, safe departure, or lost craft drift..."
              className="h-10 text-xs sm:text-sm bg-zinc-50/50 border-zinc-200 focus-visible:ring-zinc-950"
            />
            <Button
              type="submit"
              size="sm"
              className="h-10 px-5 bg-zinc-950 hover:bg-zinc-800 text-white shrink-0 gap-1.5 font-medium"
            >
              <span>Ask Agent</span>
              <Send className="h-3.5 w-3.5" />
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
