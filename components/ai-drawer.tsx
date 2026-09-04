"use client";

import * as React from "react";
import Link from "next/link";
import { useMarine } from "@/lib/marine-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateMessageId } from "@/lib/id";
import { askMarineAgent } from "@/lib/api";
import {
  X,
  Send,
  ArrowRight,
  Database,
} from "lucide-react";

interface ChatMessage {
  id: string;
  sender: "user" | "agent";
  text: string;
  sources?: string[];
  metrics?: { label: string; value: string }[];
  actionLink?: { label: string; href: string };
  time: string;
}

export function AiDrawer() {
  const { isAiDrawerOpen, setIsAiDrawerOpen, location } = useMarine();
  const [inputQuery, setInputQuery] = React.useState("");
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      id: "m-welcome",
      sender: "agent",
      text: `Welcome to Salty AI Marine Assistant. I'm actively monitoring oceanographic feeds for ${location.name} (${location.sea}). How can I assist your operations today?`,
      sources: ["INCOIS Moored Buoy Array", "INSAT-3DR Satellite SST", "IMD Coastal Radar"],
      metrics: [
        { label: "SST", value: `${location.sst}°C` },
        { label: "Wave SWH", value: `${location.waveHeight}m` },
        { label: "Wind", value: `${location.windSpeed} kts ${location.windDirection}` },
        { label: "Risk Index", value: `${location.riskScore}/100 (${location.riskLevel})` },
      ],
      time: "Just now",
    },
  ]);
  const [isTyping, setIsTyping] = React.useState(false);

  const samplePrompts = [
    `Is it safe to sail tomorrow off ${location.name}?`,
    `Where is the highest probability PFZ nearby?`,
    `What are the current SST and chlorophyll readings?`,
    `Are there any active cyclone or swell warnings?`,
  ];

  const handleSend = (textToSend?: string) => {
    const query = textToSend || inputQuery;
    if (!query.trim()) return;

    const userMsg: ChatMessage = {
      id: generateMessageId("u"),
      sender: "user",
      text: query,
      time: "Just now",
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputQuery("");
    setIsTyping(true);

    void askMarineAgent(query)
      .then((result) => {
        setMessages((prev) => [
          ...prev,
          {
            id: generateMessageId("a"),
            sender: "agent",
            text: result.response || "NOT AVAILABLE",
            sources: result.tool_calls.map((call) => call.tool),
            time: "Just now",
          },
        ]);
      })
      .catch((error: unknown) => {
        setMessages((prev) => [
          ...prev,
          {
            id: generateMessageId("a"),
            sender: "agent",
            text: `The marine agent is unavailable right now. ${error instanceof Error ? error.message : "Start the SALTY API and Ollama, then try again."}`,
            time: "Just now",
          },
        ]);
      })
      .finally(() => setIsTyping(false));

  };

  if (!isAiDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-xs transition-opacity"
        onClick={() => setIsAiDrawerOpen(false)}
      />

      {/* Drawer Box */}
      <div className="relative z-50 w-full max-w-lg bg-white border-l border-zinc-200 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 bg-zinc-50/80">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-zinc-900 text-white font-sans text-xs font-bold">
              S*
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-950">
                  Salty Marine AI Agent
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsAiDrawerOpen(false)}
            className="rounded p-1 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-sans">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${
                m.sender === "user" ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-lg p-3 ${
                  m.sender === "user"
                    ? "bg-zinc-900 text-white"
                    : "border border-zinc-200 bg-white text-zinc-800 shadow-xs"
                }`}
              >
                <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>

                {/* Metrics Pill Grid */}
                {m.metrics && (
                  <div className="mt-3 grid grid-cols-2 gap-1.5 pt-2 border-t border-zinc-100 font-sans text-[10px]">
                    {m.metrics.map((met, i) => (
                      <div key={i} className="bg-zinc-50 p-1.5 rounded border border-zinc-200/60">
                        <span className="text-zinc-400 block">{met.label}</span>
                        <span className="font-semibold text-zinc-900">{met.value}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Evidence / Source Tag */}
                {m.sources && (
                  <div className="mt-2.5 pt-2 border-t border-zinc-100 flex flex-wrap items-center gap-1.5 text-[10px] font-sans text-zinc-400">
                    <Database className="h-3 w-3 text-zinc-500 shrink-0" />
                    <span>Evidence:</span>
                    {m.sources.map((s, idx) => (
                      <span key={idx} className="bg-zinc-100 px-1 py-0.2 rounded text-zinc-600">
                        {s}
                      </span>
                    ))}
                  </div>
                )}

                {/* Deep Link Action */}
                {m.actionLink && (
                  <div className="mt-3 pt-2 border-t border-zinc-100">
                    <Link
                      href={m.actionLink.href}
                      onClick={() => setIsAiDrawerOpen(false)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-900 hover:text-zinc-600 underline underline-offset-4"
                    >
                      <span>{m.actionLink.label}</span>
                      <ArrowRight className="h-3 w-3" />
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
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-sans p-2">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-pulse" />
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-pulse delay-75" />
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-pulse delay-150" />
              <span>Synthesizing marine telemetry...</span>
            </div>
          )}
        </div>

        {/* Quick Suggestions */}
        <div className="px-4 py-2 border-t border-zinc-100 bg-zinc-50/50 flex flex-wrap gap-1.5">
          {samplePrompts.slice(0, 2).map((sp, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(sp)}
              className="text-[11px] text-zinc-600 hover:text-zinc-950 bg-white hover:bg-zinc-100 border border-zinc-200 px-2 py-1 rounded transition-colors text-left truncate max-w-full"
            >
              {sp}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-zinc-200 bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <Input
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder={`Ask anything about ${location.name} ocean conditions...`}
              className="h-9 text-xs"
            />
            <Button
              type="submit"
              size="sm"
              className="h-9 px-3 bg-zinc-950 hover:bg-zinc-800 text-white shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </form>
          <div className="mt-2 flex items-center justify-between text-[10px] font-sans text-zinc-400">
            <span>Powered by SALTY Marine Grounding</span>
            <Link
              href="/app/ai-agent"
              onClick={() => setIsAiDrawerOpen(false)}
              className="text-zinc-600 hover:text-zinc-900 underline underline-offset-2"
            >
              Open Fullscreen Agent →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
