"use client";

import * as React from "react";
import Link from "next/link";
import { useMarine } from "@/lib/marine-context";
import { generateMessageId } from "@/lib/id";
import { askMarineAgent } from "@/lib/api";
import { SpeakButton } from "@/components/fisherman/speak-button";
import {
  clearAgentContext,
  describeAgentContext,
  useAgentContext,
} from "@/lib/research-context";
import { AgentContextChip } from "@/components/research/agent-context-chip";
import {
  Sparkles,
  ArrowUp,
  Database,
  ArrowRight,
  Check,
  Copy,
  Plus,
  Compass,
  Waves,
  Fish,
  ShieldAlert,
  FlaskConical,
  Zap,
  ChevronDown,
  ChevronUp,
  CloudSun,
  Navigation,
  Radio,
  ExternalLink,
} from "lucide-react";
import { LANGUAGES, setLanguage, useT } from "@/lib/i18n";
import { useVoiceReply } from "@/lib/use-voice-reply";
import { VoiceMicButton } from "@/components/voice-mic-button";
import { MarkdownAnswer } from "@/components/research/markdown-answer";

function LanguageControl({ language }) {
  return (
    <label className="inline-flex items-center gap-1.5 text-[10px] text-zinc-500">
      <span className="hidden sm:inline">Reply in</span>
      <select
        value={language.code}
        onChange={(event) => setLanguage(event.target.value)}
        aria-label="Reply language"
        className="h-7 max-w-28 rounded-md border border-zinc-200 bg-white px-1.5 text-[10px] font-medium text-zinc-700 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-900/10"
      >
        {LANGUAGES.map((item) => <option key={item.code} value={item.code}>{item.native}</option>)}
      </select>
    </label>
  );
}

export default function AiAgentPage() {
  const { location, role } = useMarine();
  const { t, language } = useT();
  const isFisherman = role === "fisherman";
  const dataContext = useAgentContext();
  const [mode, setMode] = React.useState("normal");
  const [inputQuery, setInputQuery] = React.useState("");
  const [messages, setMessages] = React.useState([]);
  const [isTyping, setIsTyping] = React.useState(false);
  const [researchStage, setResearchStage] = React.useState("");
  const [copiedId, setCopiedId] = React.useState(null);
  const [expandedSteps, setExpandedSteps] = React.useState({});
  const {
    speak,
    stop: stopSpeaking,
    speaking,
    prime: primeSpeech,
    substituteVoice,
  } = useVoiceReply();

  // Hands-free conversation. While this is on the microphone reopens after
  // every spoken reply, so a fisherman never has to touch the screen. It ends
  // only when the person ends it.
  const [liveVoice, setLiveVoice] = React.useState(false);

  const endLiveVoice = React.useCallback(() => {
    setLiveVoice(false);
    stopSpeaking();
  }, [stopSpeaking]);

  // Chrome and Safari refuse to speak until the page has had a real user
  // gesture, and they refuse silently. Unlocking the synthesiser inside the
  // click that starts a voice turn is what makes the first reply audible.
  const beginLiveVoice = React.useCallback(() => {
    primeSpeech();
    setLiveVoice(true);
  }, [primeSpeech]);

  const handleMicStart = React.useCallback(() => {
    primeSpeech();
    stopSpeaking();
  }, [primeSpeech, stopSpeaking]);
  // Set when a question arrived by microphone, so the answer is spoken back
  // in the same language. A typed question stays silent.
  const speakReplyRef = React.useRef(false);

  // Arriving with a dataset attached means the researcher came here to analyse
  // it. Adjusted during render rather than in an effect, which would queue a
  // second pass before the first paint.
  const [seenContext, setSeenContext] = React.useState(null);
  if (dataContext && dataContext.attachedAt !== seenContext) {
    setSeenContext(dataContext.attachedAt);
    setMode("research");
  }

  const messagesEndRef = React.useRef(null);
  const textareaRef = React.useRef(null);

  // Auto-scroll to bottom as messages arrive
  React.useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, researchStage]);

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        140
      )}px`;
    }
  };

  const handleInputChange = (e) => {
    setInputQuery(e.target.value);
    adjustTextareaHeight();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSteps = (id) => {
    setExpandedSteps((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleResetChat = () => {
    setMessages([]);
    setInputQuery("");
    setIsTyping(false);
    setResearchStage("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  // Mode-specific suggestions under the chatbox
  const normalSuggestions = [
    {
      icon: Waves,
      title: t("agent.suggestSafe"),
      desc: t("agent.suggestSafeDesc"),
      query: `Is it safe to go fishing tomorrow morning off ${location.name}?`,
    },
    {
      icon: Fish,
      title: t("agent.suggestZone"),
      desc: t("agent.suggestZoneDesc"),
      query: `Where is the nearest potential fishing zone from ${location.name}?`,
    },
    {
      icon: CloudSun,
      title: t("agent.suggestForecast"),
      desc: t("agent.suggestForecastDesc"),
      query: `Show me the 3-day marine weather forecast for ${location.name}.`,
    },
    {
      icon: ShieldAlert,
      title: t("agent.suggestHazard"),
      desc: t("agent.suggestHazardDesc"),
      query: `What maritime areas or boundaries should I avoid near ${location.name}?`,
    },
  ];

  const researchSuggestions = [
    {
      icon: FlaskConical,
      title: "Synthesize SST Fronts",
      desc: "Horizontal thermal gradient & pelagic aggregation front",
      query: `Analyze SST thermal gradients and front stability off ${location.name}.`,
    },
    {
      icon: Compass,
      title: "Chlorophyll Biomass",
      desc: "MODIS-Aqua & Sentinel-3 upwelling productivity",
      query: `Compare chlorophyll-a anomalies and phytoplankton bloom near ${location.name}.`,
    },
    {
      icon: Navigation,
      title: "Kinematic Drift Model",
      desc: "IAMSAR leeway displacement & search datum ellipse",
      query: `Run kinematic drift projection for a craft lost 3.5 hrs ago near ${location.name}.`,
    },
    {
      icon: Database,
      title: "Cross-Reference Buoy BD08",
      desc: "In-situ telemetric SST vs INSAT-3DR radiometry",
      query: `What is the sensor delta between INCOIS buoy BD08 and radiometry at ${location.name}?`,
    },
  ];

  const currentSuggestions =
    mode === "research" ? researchSuggestions : normalSuggestions;

  const handleSend = (text, viaVoice = false) => {
    const query = (text || inputQuery).trim();
    if (!query) return;
    speakReplyRef.current = viaVoice;

    const userMessage = {
      id: generateMessageId("u"),
      sender: "user",
      text: query,
      mode,
      time: "Just now",
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!text) {
      setInputQuery("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
    setIsTyping(true);
    if (mode === "research") {
      setResearchStage("Grounding your question with approved marine datasets...");
    }

    const grounded = dataContext
      ? `${describeAgentContext(dataContext)}\n\nQuestion: ${query}`
      : query;

    const history = messages
      .filter((item) => item.text)
      .slice(-8)
      .map((item) => ({
        role: item.sender === "user" ? "user" : "assistant",
        content: item.text,
      }));

    void askMarineAgent(grounded, {
      mode,
      history,
      language: language.native,
      location: {
        name: location.name,
        lat: location.lat,
        lon: location.lon,
        sea: location.sea,
      },
    })
      .then((result) => {
        const trace = result.tool_calls.map(
          (call) =>
            `${call.tool}${Object.keys(call.arguments || {}).length ? " — parameters supplied" : ""}`
        );
        setMessages((prev) => [
          ...prev,
          {
            id: generateMessageId("a"),
            sender: "agent",
            mode,
            text: result.response || "NOT AVAILABLE",
            // Only tools that actually returned something are sources. A call
            // that came back empty was listed here too, which made an
            // unanswered question look like it had consulted a dataset.
            sources: (result.returned_data || [])
              .filter((item) => item.usable)
              .map((item) => item.tool),
            // Openable pages for the data behind the answer. A tool name tells
            // a researcher which function ran; it does not let them check the
            // figures, which is the entire point of citing a source.
            references: result.references || [],
            truncated: Boolean(result.truncated),
            emptyTools: (result.returned_data || [])
              .filter((item) => !item.usable)
              .map((item) => item.tool),
            researchSteps: trace,
            time: "Just now",
          },
        ]);
        if (speakReplyRef.current || liveVoice) {
          speakReplyRef.current = false;
          speak(result.response || "");
        }
      })
      .catch((error) => {
        setMessages((prev) => [
          ...prev,
          {
            id: generateMessageId("a"),
            sender: "agent",
            mode,
            text: `The grounded marine agent is unavailable right now. ${error instanceof Error ? error.message : "Start the SALTY API and Ollama, then try again."}`,
            time: "Just now",
          },
        ]);
      })
      .finally(() => {
        setIsTyping(false);
        setResearchStage("");
      });
  };

  const hasStarted = messages.length > 0;

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 relative">
      {/* Active Conversation Top Bar (only visible once chat has started) */}
      {hasStarted && (
        <header className="shrink-0 flex items-center justify-between pb-3 mb-2 border-b border-zinc-200/80">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-950">
              <Sparkles className="h-4 w-4 text-zinc-900 shrink-0" />
              <span className="hidden xs:inline truncate">Salty Marine Agent</span>
            </div>

            {/* Mode Switcher Pill in Top Bar */}
            <div className="inline-flex items-center rounded-full bg-zinc-100 p-0.5 border border-zinc-200 text-xs">
              <button
                onClick={() => setMode("normal")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                  mode === "normal"
                    ? "bg-white text-zinc-950 shadow-xs"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                <Zap className="h-3 w-3 text-amber-500" />
                <span>{isFisherman ? t("agent.quick") : "Quick"}</span>
              </button>
              <button
                onClick={() => setMode("research")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                  mode === "research"
                    ? "bg-zinc-950 text-white shadow-xs"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                <FlaskConical className="h-3 w-3 text-indigo-400" />
                <span>Research</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetChat}
              className="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-950 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer font-medium"
              title="Start a new chat session"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{isFisherman ? t("agent.newChat") : "New Chat"}</span>
            </button>
          </div>
        </header>
      )}

      {/* Main Area: Centered Hero & Input (Before Prompting) */}
      {!hasStarted && (
        <div className="flex-1 flex flex-col justify-center items-center max-w-3xl mx-auto w-full px-2 sm:px-4 py-8 animate-in fade-in duration-300">
          {/* Minimalist Hero Header */}
          <div className="text-center mb-6 sm:mb-8 space-y-2">
            <div className="inline-flex items-center justify-center p-2.5 rounded-2xl bg-zinc-950 text-white shadow-md mb-2">
              <Sparkles className="h-6 w-6 text-zinc-100" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
              {isFisherman ? t("agent.hero") : "Where should we navigate today?"}
            </h1>
            <p className="mx-auto max-w-lg text-xs text-zinc-500 sm:text-sm">
              {isFisherman ? (
                t("agent.heroSub", { place: `${location.name}, ${location.state}` })
              ) : (
                <>
                  Real-time ocean state, satellite PFZ detection, voyage safety &amp;
                  research grounded in{" "}
                  <span className="font-medium text-zinc-800">
                    {location.name}, {location.state}
                  </span>
                  .
                </>
              )}
            </p>
          </div>

          {/* Attached dataset from Research & Data */}
          {dataContext && (
            <div className="w-full">
              <AgentContextChip context={dataContext} onDetach={clearAgentContext} />
            </div>
          )}

          {/* Centered Chat Input Box */}
          <div className="w-full rounded-3xl border border-zinc-200/90 bg-white shadow-sm hover:shadow-md focus-within:border-zinc-400 focus-within:ring-4 focus-within:ring-zinc-950/5 transition-all p-3 sm:p-4">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputQuery}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={
                mode === "research"
                  ? "Ask deep oceanographic research questions, SST thermal fronts, chlorophyll anomalies..."
                  : isFisherman
                    ? t("agent.placeholderFisher")
                    : "Ask about wave conditions, fishing zones, safe departure, weather..."
              }
              className="w-full text-sm sm:text-base text-zinc-900 placeholder:text-zinc-400 focus:outline-none resize-none bg-transparent min-h-[44px] max-h-[140px] px-1 py-1"
            />

            {/* Input Controls Bar */}
            <div className="flex items-center justify-between pt-2 mt-1 border-t border-zinc-100/90 gap-2">
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Mode Switcher Pill */}
                <div className="inline-flex items-center rounded-full bg-zinc-100 p-0.5 border border-zinc-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setMode("normal")}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                      mode === "normal"
                        ? "bg-white text-zinc-950 shadow-xs"
                        : "text-zinc-500 hover:text-zinc-800"
                    }`}
                  >
                    <Zap className="h-3 w-3 text-amber-500" />
                    <span>Normal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("research")}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                      mode === "research"
                        ? "bg-zinc-950 text-white shadow-xs"
                        : "text-zinc-500 hover:text-zinc-800"
                    }`}
                  >
                    <FlaskConical className="h-3 w-3 text-indigo-400" />
                    <span>Research Mode</span>
                  </button>
                </div>

                {/* Grounding Context Chip */}
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-zinc-500 bg-zinc-50 border border-zinc-200/80 px-2 py-0.5 rounded-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  <span>{location.name}</span>
                </span>
                <VoiceMicButton
                  variant="pill"
                  onInterim={(text) => {
                    setInputQuery(text);
                    requestAnimationFrame(adjustTextareaHeight);
                  }}
                  onTranscript={(text) => {
                    setInputQuery("");
                    handleSend(text, true);
                  }}
                  onStart={handleMicStart}
                  autoListen={liveVoice && !speaking && !isTyping}
                />
                {/* Hands-free conversation. Once on, speak and it answers,
                    then listens again - no tapping between turns. */}
                <button
                  type="button"
                  onClick={() => (liveVoice ? endLiveVoice() : beginLiveVoice())}
                  aria-pressed={liveVoice}
                  title={liveVoice ? t("voice.stopLive") : t("voice.startLive")}
                  className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[10px] font-medium transition-colors ${
                    liveVoice
                      ? "border-rose-300 bg-rose-50 text-rose-700"
                      : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400"
                  }`}
                >
                  {liveVoice ? (
                    <span className="relative inline-flex h-2 w-2">
                      <span className="absolute inset-0 animate-ping rounded-full bg-rose-400/70" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
                    </span>
                  ) : (
                    <Radio className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">
                    {liveVoice ? t("voice.liveOn") : t("voice.startLive")}
                  </span>
                </button>
                <LanguageControl language={language} />
              </div>

              {/* Submit Button */}
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={!inputQuery.trim() || isTyping}
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-zinc-950 text-white flex items-center justify-center hover:bg-zinc-800 disabled:opacity-25 disabled:cursor-not-allowed transition-all shrink-0 cursor-pointer shadow-xs"
                title="Send message"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Suggestions Under the Chatbox */}
          <div className="w-full mt-6 space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                {mode === "research"
                  ? "Oceanographic Research Inquiries"
                  : "Suggested Prompts"}
              </span>
              <span className="text-[11px] text-zinc-400">
                Mode: <span className="font-medium text-zinc-700 capitalize">{mode}</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {currentSuggestions.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(item.query)}
                    className="group flex items-start gap-3 p-3 rounded-2xl border border-zinc-200/80 bg-white hover:border-zinc-300 hover:bg-zinc-50/70 transition-all text-left cursor-pointer shadow-2xs"
                  >
                    <div className="p-2 rounded-xl bg-zinc-100 group-hover:bg-zinc-200/70 text-zinc-700 shrink-0 transition-colors">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-zinc-900 group-hover:text-zinc-950 flex items-center justify-between">
                        <span>{item.title}</span>
                        <ArrowRight className="h-3 w-3 text-zinc-300 group-hover:text-zinc-600 transition-colors shrink-0" />
                      </div>
                      <p className="text-[11px] text-zinc-500 line-clamp-1 mt-0.5 leading-snug">
                        {item.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Conversation Stream (After Prompting) */}
      {hasStarted && (
        <div className="flex-1 overflow-y-auto min-h-0 space-y-6 py-2 px-1 sm:px-2 max-w-3xl mx-auto w-full">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${
                m.sender === "user" ? "items-end" : "items-start"
              }`}
            >
              {m.sender === "user" ? (
                // User Message Bubble
                <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-br-xs px-4 py-3 bg-zinc-900 text-white text-xs sm:text-sm leading-relaxed shadow-xs">
                  <p className="whitespace-pre-wrap">{m.text}</p>
                </div>
              ) : (
                // Agent Response Layout
                <div className="w-full space-y-3">
                  <div className="flex items-start gap-3">
                    {/* Agent Avatar */}
                    <div className="h-7 w-7 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-900 shrink-0 mt-0.5">
                      <Sparkles className="h-3.5 w-3.5 text-zinc-800" />
                    </div>

                    <div className="flex-1 min-w-0 space-y-3">
                      {/* Mode Badge if Research */}
                      {m.mode === "research" && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200/80 text-[11px] font-medium text-indigo-900">
                          <FlaskConical className="h-3 w-3 text-indigo-600" />
                          <span>Oceanographic Research Synthesis</span>
                          <span className="text-indigo-400">•</span>
                          <span className="text-indigo-700">Multi-source Grounded</span>
                        </div>
                      )}

                      {/* Expandable Research Steps Accordion */}
                      {m.researchSteps && m.researchSteps.length > 0 && (
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 overflow-hidden text-xs">
                          <button
                            type="button"
                            onClick={() => toggleSteps(m.id)}
                            className="w-full px-3 py-2 flex items-center justify-between text-[11px] font-medium text-zinc-600 hover:text-zinc-900 cursor-pointer"
                          >
                            <span className="flex items-center gap-1.5">
                              <Database className="h-3.5 w-3.5 text-zinc-500" />
                              <span>
                                Grounding Steps & Datasets Consulted (
                                {m.researchSteps.length})
                              </span>
                            </span>
                            {expandedSteps[m.id] ? (
                              <ChevronUp className="h-3.5 w-3.5 text-zinc-400" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
                            )}
                          </button>
                          {expandedSteps[m.id] && (
                            <div className="px-3 pb-2.5 pt-1 space-y-1.5 border-t border-zinc-200/60 bg-white text-[11px] text-zinc-600">
                              {m.researchSteps.map((step, sIdx) => (
                                <div key={sIdx} className="flex items-start gap-2">
                                  <Check className="h-3 w-3 text-emerald-600 mt-0.5 shrink-0" />
                                  <span>{step}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Message Body. Rendered by a real markdown pass: research answers
                          carry comparison tables, and the hand-rolled renderer that used to
                          live here knew about bullets and bold and nothing about tables, so
                          a table arrived on screen as a row of pipe characters. Charts are
                          offered only in research mode - a fisherman gets two sentences, and
                          there is nothing there to plot. */}
                      <MarkdownAnswer text={m.text} allowCharts={m.mode === "research"} />

                      {/* Metrics Pill Grid */}
                      {m.metrics && m.metrics.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                          {m.metrics.map((met, metIdx) => (
                            <div
                              key={metIdx}
                              className="bg-white border border-zinc-200/90 rounded-xl p-2.5 shadow-2xs"
                            >
                              <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-400 block">
                                {met.label}
                              </span>
                              <span className="font-semibold text-zinc-950 text-xs sm:text-sm mt-0.5 block truncate">
                                {met.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Grounded Sources Pills (Perplexity style) */}
                      {m.sources && m.sources.length > 0 && (
                        <div className="pt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-500">
                          <span className="font-medium text-zinc-600 mr-1 flex items-center gap-1">
                            <Database className="h-3 w-3 text-zinc-400" />
                            Sources:
                          </span>
                          {m.sources.map((src, srcIdx) => (
                            <span
                              key={srcIdx}
                              className="bg-zinc-100/90 hover:bg-zinc-200/70 border border-zinc-200 text-zinc-700 px-2 py-0.5 rounded-md text-[10px] transition-colors"
                            >
                              [{srcIdx + 1}] {src}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* The datasets themselves, as links. A researcher has to be
                          able to open the thing the number came from and check it;
                          that is what separates a cited answer from a confident one. */}
                      {m.references && m.references.length > 0 && (
                        <div className="pt-2">
                          <span className="mb-1.5 flex items-center gap-1 text-[11px] font-medium text-zinc-600">
                            <Database className="h-3 w-3 text-zinc-400" />
                            Open the data
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {m.references.map((reference) => (
                              <a
                                key={reference.url}
                                href={reference.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={reference.url}
                                className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] text-blue-800 transition-colors hover:bg-blue-100"
                              >
                                <ExternalLink className="h-2.5 w-2.5" />
                                {reference.title}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* The agent ran out of tool rounds and answered from what it
                          had. Saying so is the difference between a partial answer
                          and a wrong one. */}
                      {m.truncated && (
                        <p className="pt-1.5 text-[10px] text-amber-800">
                          Answered from the data gathered so far — the agent reached its
                          tool-call limit. Ask a narrower question for the rest.
                        </p>
                      )}

                      {/* Tools that were called but came back with nothing. Naming
                          them is more useful than hiding them: it says the agent
                          did look, and where. */}
                      {m.emptyTools && m.emptyTools.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                          <span className="text-[10px] font-medium text-zinc-400">
                            Returned no data:
                          </span>
                          {m.emptyTools.map((tool, toolIdx) => (
                            <span
                              key={toolIdx}
                              className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] text-amber-800"
                            >
                              {tool}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Action Deep Link Button */}
                      {m.actionLink && (
                        <div className="pt-1">
                          <Link
                            href={m.actionLink.href}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-950 hover:text-zinc-600 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <span>{m.actionLink.label}</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      )}

                      {/* Message Bottom Utility Bar */}
                      <div className="flex items-center gap-3 pt-1 text-[11px] text-zinc-400">
                        <button
                          type="button"
                          onClick={() => handleCopy(m.id, m.text)}
                          className="flex items-center gap-1 hover:text-zinc-700 transition-colors cursor-pointer"
                        >
                          {copiedId === m.id ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-600" />
                              <span className="text-emerald-600">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                        <SpeakButton text={m.text} size="sm" label />
                        <span>•</span>
                        <span>{m.time}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* The device may simply have no voice installed for this language.
              Saying so is better than reading Malayalam with an English voice,
              which produces noise, or staying silent with no explanation. */}
          {substituteVoice && (speaking || liveVoice) && (
            <div className="flex justify-center pb-1">
              <p className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] text-amber-900">
                {t("voice.noVoiceForLanguage")}
              </p>
            </div>
          )}

          {(speaking || liveVoice) && (
            <div className="sticky bottom-0 z-10 flex justify-center pb-1">
              <button
                type="button"
                onClick={endLiveVoice}
                className="inline-flex items-center gap-2 rounded-full border border-rose-300 bg-white px-3.5 py-1.5 text-xs font-medium text-rose-700 shadow-sm hover:bg-rose-50"
              >
                <span className="relative inline-flex h-2.5 w-2.5">
                  <span className="absolute inset-0 animate-ping rounded-full bg-rose-400/60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
                </span>
                {liveVoice ? t("voice.stopLive") : t("voice.stopReading")}
              </button>
            </div>
          )}

          {/* Typing / Researching Progress Indicator */}
          {isTyping && (
            <div className="flex items-start gap-3 w-full">
              <div className="h-7 w-7 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-900 shrink-0">
                <Sparkles className="h-3.5 w-3.5 animate-pulse text-zinc-800" />
              </div>
              <div className="space-y-2 py-1">
                {mode === "research" ? (
                  <div className="flex items-center gap-2 text-xs text-indigo-900 bg-indigo-50/70 border border-indigo-200/80 px-3 py-1.5 rounded-xl">
                    <FlaskConical className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                    <span className="font-medium">
                      {researchStage || "Executing multi-sensor oceanographic fusion..."}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span className="flex gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-zinc-600 animate-pulse" />
                      <span className="h-1.5 w-1.5 rounded-full bg-zinc-600 animate-pulse delay-75" />
                      <span className="h-1.5 w-1.5 rounded-full bg-zinc-600 animate-pulse delay-150" />
                    </span>
                    <span>Synthesizing real-time marine telemetry...</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} className="h-2" />
        </div>
      )}

      {/* Docked Chat Input Box (After Prompting) */}
      {hasStarted && (
        <div className="shrink-0 pt-2 pb-1 bg-gradient-to-t from-white via-white to-transparent max-w-3xl mx-auto w-full">
          {dataContext && (
            <AgentContextChip context={dataContext} onDetach={clearAgentContext} />
          )}
          <div className="rounded-2xl sm:rounded-3xl border border-zinc-200/90 bg-white shadow-sm hover:shadow-md focus-within:border-zinc-400 focus-within:ring-4 focus-within:ring-zinc-950/5 transition-all p-2.5 sm:p-3">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputQuery}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={
                mode === "research"
                  ? "Ask follow-up research question, thermal gradients, drift..."
                  : "Ask follow-up question about sea state, PFZ, or weather..."
              }
              className="w-full text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none resize-none bg-transparent min-h-[38px] max-h-[120px] px-1 py-1"
            />

            {/* Bottom Bar inside Input */}
            <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-zinc-100 gap-2">
              <div className="flex items-center gap-1.5">
                {/* Mode Switcher Pill */}
                <div className="inline-flex items-center rounded-full bg-zinc-100 p-0.5 border border-zinc-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setMode("normal")}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                      mode === "normal"
                        ? "bg-white text-zinc-950 shadow-xs"
                        : "text-zinc-500 hover:text-zinc-800"
                    }`}
                  >
                    <Zap className="h-3 w-3 text-amber-500" />
                    <span>Normal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("research")}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                      mode === "research"
                        ? "bg-zinc-950 text-white shadow-xs"
                        : "text-zinc-500 hover:text-zinc-800"
                    }`}
                  >
                    <FlaskConical className="h-3 w-3 text-indigo-400" />
                    <span>Research</span>
                  </button>
                </div>

                <span className="text-[10px] text-zinc-400 hidden sm:inline">
                  {location.name}
                </span>
                <VoiceMicButton
                  variant="pill"
                  onInterim={(text) => {
                    setInputQuery(text);
                    requestAnimationFrame(adjustTextareaHeight);
                  }}
                  onTranscript={(text) => {
                    setInputQuery("");
                    handleSend(text, true);
                  }}
                  onStart={handleMicStart}
                  autoListen={liveVoice && !speaking && !isTyping}
                />
                {/* Hands-free conversation. Once on, speak and it answers,
                    then listens again - no tapping between turns. */}
                <button
                  type="button"
                  onClick={() => (liveVoice ? endLiveVoice() : beginLiveVoice())}
                  aria-pressed={liveVoice}
                  title={liveVoice ? t("voice.stopLive") : t("voice.startLive")}
                  className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[10px] font-medium transition-colors ${
                    liveVoice
                      ? "border-rose-300 bg-rose-50 text-rose-700"
                      : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400"
                  }`}
                >
                  {liveVoice ? (
                    <span className="relative inline-flex h-2 w-2">
                      <span className="absolute inset-0 animate-ping rounded-full bg-rose-400/70" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
                    </span>
                  ) : (
                    <Radio className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">
                    {liveVoice ? t("voice.liveOn") : t("voice.startLive")}
                  </span>
                </button>
                <LanguageControl language={language} />
              </div>

              {/* Submit Button */}
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={!inputQuery.trim() || isTyping}
                className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-zinc-950 text-white flex items-center justify-center hover:bg-zinc-800 disabled:opacity-25 disabled:cursor-not-allowed transition-all shrink-0 cursor-pointer shadow-xs"
                title="Send message"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <p className="text-center text-[10px] text-zinc-400 mt-1.5 hidden sm:block">
            Salty AI is grounded in INCOIS, IMD, and Earth Observation satellites.
          </p>
        </div>
      )}
    </div>
  );
}
