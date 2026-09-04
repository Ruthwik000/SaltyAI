"use client";

import * as React from "react";
import Link from "next/link";
import { useMarine } from "@/lib/marine-context";
import { generateMessageId } from "@/lib/id";
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
} from "lucide-react";

type AgentMode = "normal" | "research";

interface AgentMessage {
  id: string;
  sender: "user" | "agent";
  mode?: AgentMode;
  text: string;
  sources?: string[];
  metrics?: { label: string; value: string }[];
  actionLink?: { label: string; href: string };
  researchSteps?: string[];
  time: string;
}

interface SuggestionItem {
  icon: React.ElementType;
  title: string;
  desc: string;
  query: string;
}

export default function AiAgentPage() {
  const { location } = useMarine();
  const [mode, setMode] = React.useState<AgentMode>("normal");
  const [inputQuery, setInputQuery] = React.useState("");
  const [messages, setMessages] = React.useState<AgentMessage[]>([]);
  const [isTyping, setIsTyping] = React.useState(false);
  const [researchStage, setResearchStage] = React.useState<string>("");
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = React.useState<Record<string, boolean>>({});

  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputQuery(e.target.value);
    adjustTextareaHeight();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSteps = (id: string) => {
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
  const normalSuggestions: SuggestionItem[] = [
    {
      icon: Waves,
      title: "Safe to sail tomorrow?",
      desc: "Evaluates wave height, wind, and departure windows",
      query: `Is it safe to go fishing tomorrow morning off ${location.name}?`,
    },
    {
      icon: Fish,
      title: "Nearest Fishing Zone",
      desc: "Locates highest suitability PFZ bearing and distance",
      query: `Where is the nearest potential fishing zone from ${location.name}?`,
    },
    {
      icon: CloudSun,
      title: "3-Day Marine Forecast",
      desc: "Swell progression, wind gusts, and sea state index",
      query: `Show me the 3-day marine weather forecast for ${location.name}.`,
    },
    {
      icon: ShieldAlert,
      title: "Restricted & Hazard Areas",
      desc: "IMBL caution buffer, naval ranges, and MPAs",
      query: `What maritime areas or boundaries should I avoid near ${location.name}?`,
    },
  ];

  const researchSuggestions: SuggestionItem[] = [
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

  const handleSend = (text?: string) => {
    const query = (text || inputQuery).trim();
    if (!query) return;

    const userMessage: AgentMessage = {
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

    const isResearchMode = mode === "research";

    if (isResearchMode) {
      setResearchStage("Connecting to INCOIS OON moored buoy network...");
      setTimeout(() => {
        setResearchStage("Synthesizing INSAT-3DR radiometer & ERDDAP datasets...");
      }, 500);
      setTimeout(() => {
        setResearchStage("Computing horizontal isotherm divergence (dT/dx)...");
      }, 950);
    }

    const delay = isResearchMode ? 1400 : 600;

    setTimeout(() => {
      let reply: AgentMessage;
      const q = query.toLowerCase();

      if (isResearchMode) {
        // RESEARCH MODE RESPONSES
        if (q.includes("sst") || q.includes("temperature") || q.includes("front")) {
          reply = {
            id: generateMessageId("a"),
            sender: "agent",
            mode: "research",
            text: `### Oceanographic Thermal Front Analysis: ${location.name} Sector\n\nSatellite infrared radiometry (INSAT-3DR 0.04° resolved composite) and in-situ moored buoy telemetry record a baseline Sea Surface Temperature of **${location.sst}°C** across the coastal boundary layer.\n\n- **Thermal Gradient Front:** A pronounced horizontal thermal discontinuity (ΔT = 0.82°C over 2.1 NM) is delineated approximately 18.2 NM bearing 068° ENE.\n- **Climatological Anomaly:** SST stands **+0.42°C (z = +1.18σ)** above the 30-year climatological baseline, indicative of suppressed coastal upwelling.\n- **Isotherm Convergence:** Mixed Layer Depth (MLD) is estimated at **34m**, creating an elevated pelagic aggregation zone along the shelf-break margin.`,
            sources: [
              "INSAT-3DR Multichannel Radiometer (0.04° L3)",
              "INCOIS Moored Buoy BD08 Telemetry",
              "NOAA High-Resolution OI-SST V2.1",
              "CMEMS Global Ocean Physical Analysis",
            ],
            researchSteps: [
              "Queried INCOIS Moored Buoy BD08 real-time thermistor chain (0–50m)",
              "Calibrated INSAT-3DR 10.8µm thermal infrared atmospheric correction",
              "Computed horizontal thermal gradient field: ∇T = 0.39 °C/km",
              "Correlated with 30-year climatological mean (1991–2020 baseline)",
            ],
            metrics: [
              { label: "Coastal SST", value: `${location.sst}°C` },
              { label: "Thermal Front", value: "0.82°C / 2.1 NM" },
              { label: "Climatology Anomaly", value: "+0.42°C (1.18σ)" },
              { label: "Mixed Layer Depth", value: "34 meters" },
            ],
            actionLink: {
              label: "Inspect Thermal Layers in Marine Map",
              href: "/app/map",
            },
            time: "Just now",
          };
        } else if (q.includes("chlorophyll") || q.includes("bloom") || q.includes("color")) {
          reply = {
            id: generateMessageId("a"),
            sender: "agent",
            mode: "research",
            text: `### Bio-Optical & Chlorophyll-a Biomass Synthesis\n\nCross-validation of Sentinel-3 OLCI (Ocean and Land Colour Instrument) and MODIS-Aqua composites reveals distinct trophic regimes:\n\n- **Coastal Plume:** Inner shelf chlorophyll-a reaches **1.38 mg/m³** driven by nutrient-rich estuarine runoff and terrestrial nitrogen transport.\n- **Offshore Baseline:** Open-water chlorophyll drops to **0.42 mg/m³**, forming a sharp bio-optical front at the 50m bathymetric contour.\n- **Photosynthetic Active Radiation (PAR):** High surface irradiance (48.2 Einstein/m²/day) with light attenuation coefficient **k₄₉₀ = 0.082 m⁻¹**.\n- **Pelagic Suitability:** Optimal bio-thermal alignment indicates high concentrations of Yellowfin Tuna and Decapterus along the thermal-optical shear zone.`,
            sources: [
              "Sentinel-3 OLCI Level-3 Ocean Color Composite",
              "MODIS-Aqua 8-Day Chlorophyll-a (4km)",
              "INCOIS Coastal Ocean Color Modeling Array",
              "ERDDAP in-situ fluorometer telemetry",
            ],
            researchSteps: [
              "Acquired Sentinel-3 OLCI top-of-atmosphere radiance (443–865 nm)",
              "Inverted OC4v6 bio-optical algorithm for chlorophyll-a retrieval",
              "Validated atmospheric Rayleigh & aerosol scattering corrections",
              "Generated spatial overlap index with satellite SST fronts",
            ],
            metrics: [
              { label: "Nearshore Chl-a", value: "1.38 mg/m³" },
              { label: "Offshore Chl-a", value: "0.42 mg/m³" },
              { label: "Light Atten. (k490)", value: "0.082 m⁻¹" },
              { label: "Suitability Index", value: "94% (Very High)" },
            ],
            actionLink: {
              label: "Explore Bio-Optical Data in Research Module",
              href: "/app/research",
            },
            time: "Just now",
          };
        } else if (q.includes("drift") || q.includes("lost") || q.includes("sar") || q.includes("kinematic")) {
          reply = {
            id: generateMessageId("a"),
            sender: "agent",
            mode: "research",
            text: `### Kinematic Monte-Carlo Leeway SAR Drift Computation\n\nSimulating 3.5-hour kinematic leeway displacement from initial Last Known Position (${location.lat.toFixed(2)}°N, ${location.lon.toFixed(2)}°E) off ${location.name}:\n\n- **Hydrodynamic Current Vector:** Surface Eulerian currents measure **0.72 kts bearing 048° NE** (INCOIS ADCP coastal array).\n- **Atmospheric Leeway Component:** Wind leeway coefficient **L_w = 0.038 × W₁₀ = 0.53 kts** with a 12° right-of-wind divergence angle.\n- **Cumulative Net Displacement:** **6.42 NM** along resultant bearing **058° ENE**.\n- **Search Datum Coordinates:** Centered at **${(location.lat + 0.05).toFixed(3)}°N, ${(location.lon + 0.09).toFixed(3)}°E** with an expanding **3.8 NM** radius (95% probabilistic containment contour).`,
            sources: [
              "IAMSAR Vol II Kinematic Leeway Model",
              "INCOIS High-Frequency Coastal Radar (Surface Currents)",
              "IMD WRF 3km Atmospheric Boundary Vector",
              "Bathymetric Wave shoaling dissipation grid",
            ],
            researchSteps: [
              "Initialized IAMSAR unballasted fiberglass skiff leeway polar coordinates",
              "Integrated surface current velocity vectors from HF Radar & ADCP",
              "Executed 5,000-particle Monte-Carlo drift simulation with turbulence diffusion",
              "Calculated 95% bivariate Gaussian probability search datum polygon",
            ],
            metrics: [
              { label: "Calculated Datum", value: `${(location.lat + 0.05).toFixed(3)}°N, ${(location.lon + 0.09).toFixed(3)}°E` },
              { label: "Net Displacement", value: "6.42 NM (058°)" },
              { label: "Search Radius", value: "3.8 NM (95% CI)" },
              { label: "Recommended Pattern", value: "Sector Search (VS)" },
            ],
            actionLink: {
              label: "Launch SAR Operations Center",
              href: "/app/lost-fisherman",
            },
            time: "Just now",
          };
        } else {
          reply = {
            id: generateMessageId("a"),
            sender: "agent",
            mode: "research",
            text: `### Oceanographic State Synthesis: ${location.name} (${location.sea})\n\nComprehensive multi-sensor telemetry synthesized for geographic domain ${location.lat.toFixed(2)}°N, ${location.lon.toFixed(2)}°E:\n\n- **Wave Hydrodynamics:** Significant Wave Height (SWH) **${location.waveHeight}m** with dominant spectral peak period **${location.wavePeriod}s**; wave steepness ratio H/L = 0.022 (non-breaking, stable regime).\n- **Boundary Layer Wind:** **${location.windSpeed} kts ${location.windDirection}** (${location.windDegrees}°), barometric pressure **1012.4 hPa**.\n- **Thermal Radiometry:** Baseline SST **${location.sst}°C**; localized surface current velocity **${location.currentSpeed} m/s ${location.currentDirection}**.\n- **Composite Hazard Index:** ${location.riskLevel} classification (${location.riskScore}/100) derived from non-linear wave-wind interaction modeling.`,
            sources: [
              "INCOIS WaveWatch III Numerical Simulation",
              "IMD High-Resolution Coastal WRF Ensemble",
              "Sentinel-3 / Jason-3 Altimetry Cross-Calibration",
              "Salty Marine Hydrodynamic Modeling Invariant",
            ],
            researchSteps: [
              "Parsed directional wave spectra from WaveWatch III numerical model",
              "Cross-validated altimetric SWH with in-situ wave-rider buoy",
              "Computed turbulent kinetic energy dissipation rate in boundary layer",
              "Synthesized multi-parameter composite hazard index",
            ],
            metrics: [
              { label: "Wave SWH", value: `${location.waveHeight} meters` },
              { label: "Peak Period", value: `${location.wavePeriod} seconds` },
              { label: "Wind Vector", value: `${location.windSpeed} kts ${location.windDirection}` },
              { label: "Ocean Temp", value: `${location.sst}°C` },
            ],
            actionLink: {
              label: "Explore Research Telemetry Feeds",
              href: "/app/research",
            },
            time: "Just now",
          };
        }
      } else {
        // NORMAL OPERATIONAL MODE RESPONSES
        if (q.includes("safe") || (q.includes("fishing") && q.includes("tomorrow")) || q.includes("sail")) {
          reply = {
            id: generateMessageId("a"),
            sender: "agent",
            mode: "normal",
            text: `**Yes, tomorrow morning is rated SAFE for voyage operations off ${location.name}.**\n\n- **Safe Departure Window:** **04:30 AM – 01:30 PM IST**.\n- **Sea State:** Significant wave height will remain comfortable under **${location.waveHeight}m** with steady **${location.windSpeed} kts** winds from ${location.windDirection}.\n- **Precaution:** Wind speed is projected to freshen to 18–20 kts after 03:00 PM as local sea breezes intensify. Mechanized craft and motorized skiffs are advised to return before mid-afternoon.`,
            sources: ["INCOIS WaveWatch III Model", "IMD Marine Coastal Bulletin", "Salty Trip Risk Engine"],
            metrics: [
              { label: "Safe Departure Window", value: "04:30 – 13:30 IST" },
              { label: "Wave SWH", value: `${location.waveHeight} m` },
              { label: "Wind Speed", value: `${location.windSpeed} kts ${location.windDirection}` },
              { label: "Risk Index", value: `${location.riskScore}/100 (${location.riskLevel})` },
            ],
            actionLink: {
              label: "Calculate Custom Risk for Your Vessel",
              href: "/app/risk",
            },
            time: "Just now",
          };
        } else if (q.includes("nearest") || q.includes("pfz") || q.includes("zone") || q.includes("hotspot")) {
          reply = {
            id: generateMessageId("a"),
            sender: "agent",
            mode: "normal",
            text: `**Nearest High-Suitability Potential Fishing Zone (PFZ):**\n\n- **Zone Name:** Bheemunipatnam Offshore Front (Sector-A)\n- **Coordinates / Bearing:** **18.2 NM** bearing **068° ENE** from ${location.name} port entrance.\n- **Conditions:** High chlorophyll concentration (**1.15 mg/m³**) matching a sharp **0.8°C** thermal gradient front.\n- **Target Species:** Yellowfin Tuna, Indian Mackerel, and Ribbonfish. Commercial catches report optimal school concentration at 45–60m depth contours.`,
            sources: ["INCOIS Potential Fishing Zone Advisory", "MODIS Ocean Color", "Commercial Catch Reports"],
            metrics: [
              { label: "Distance & Bearing", value: "18.2 NM (068° ENE)" },
              { label: "Suitability", value: "94% (Very High)" },
              { label: "Depth", value: "55 meters" },
              { label: "Target Species", value: "Tuna & Mackerel" },
            ],
            actionLink: {
              label: "Open Fishing Zone Navigation Guide",
              href: "/app/fishing-zones",
            },
            time: "Just now",
          };
        } else if (q.includes("weather") || q.includes("3 days") || q.includes("forecast")) {
          reply = {
            id: generateMessageId("a"),
            sender: "agent",
            mode: "normal",
            text: `**3-Day Marine Forecast for ${location.name} waters:**\n\n• **Today:** Fair to partly cloudy, waves **${location.waveHeight}m**, winds **${location.windSpeed} kts ${location.windDirection}**. Risk level: **${location.riskLevel} (${location.riskScore}/100)**.\n• **Tomorrow:** Optimal sea state. Wave height drops slightly to 1.4m, wind steady at 12 kts NE. Prime conditions for coastal and offshore fishing.\n• **Day 3:** Swell height increasing to 1.9m, wind picking up to 18 kts. Moderate chop developing due to central ${location.sea} depression.`,
            sources: ["IMD Regional Meteorological Centre", "INCOIS Coastal Wave Model"],
            metrics: [
              { label: "Day 1 Risk", value: "Low (28/100)" },
              { label: "Day 2 Risk", value: "Optimal (22/100)" },
              { label: "Day 3 Risk", value: "Moderate (42/100)" },
            ],
            actionLink: {
              label: "View 7-Day Weather & Tides",
              href: "/app/weather",
            },
            time: "Just now",
          };
        } else if (q.includes("avoid") || q.includes("restricted") || q.includes("boundary") || q.includes("imbl")) {
          reply = {
            id: generateMessageId("a"),
            sender: "agent",
            mode: "normal",
            text: `**Important Maritime Boundaries and Warning Zones:**\n\n1. **International Maritime Boundary Line (IMBL):** Maintain at least 5.0 NM standoff buffer in sensitive border areas to prevent naval interdiction.\n2. **Marine Sanctuaries & MPAs:** Active seasonal trawling bans protect Olive Ridley turtle nesting and nursery habitats within 20 km of designated coastlines.\n3. **Naval Firing Ranges:** Check active NOTAM / Navigational Warnings prior to passage across eastern exercise sectors.\n4. **Squall Caution:** IMD strong wind advisories active for offshore pockets with gust potentials exceeding 40 kmph.`,
            sources: ["Indian Coast Guard Directives", "Wildlife Protection Marine Sanctuaries", "IMD Hazard Advisory"],
            metrics: [
              { label: "IMBL Safety Buffer", value: "5.0 Nautical Miles" },
              { label: "Restricted MPAs", value: "2 Active" },
              { label: "Advisory Level", value: "Navigational Warning" },
            ],
            actionLink: {
              label: "Inspect Geofences on Marine Map",
              href: "/app/map",
            },
            time: "Just now",
          };
        } else if (q.includes("sst") || q.includes("temperature")) {
          reply = {
            id: generateMessageId("a"),
            sender: "agent",
            mode: "normal",
            text: `Sea Surface Temperature near ${location.name} is currently **${location.sst}°C**.\n\nA clear thermal gradient front is situated 18 Nautical Miles offshore where water temperatures drop by approximately 0.8°C, generating prime feeding grounds for pelagic fish. Ocean state is calm with wave height around ${location.waveHeight}m.`,
            sources: ["INSAT-3DR Satellite Radiometer", "INCOIS Moored Buoys"],
            metrics: [
              { label: "Water Temperature", value: `${location.sst}°C` },
              { label: "Wave SWH", value: `${location.waveHeight} m` },
              { label: "Wind", value: `${location.windSpeed} kts ${location.windDirection}` },
            ],
            actionLink: {
              label: "View SST Layer on Map",
              href: "/app/map",
            },
            time: "Just now",
          };
        } else {
          reply = {
            id: generateMessageId("a"),
            sender: "agent",
            mode: "normal",
            text: `Here is the current sea state summary for **${location.name} (${location.sea})**:\n\n- **Wave SWH:** **${location.waveHeight}m** (Period ${location.wavePeriod}s)\n- **Wind:** **${location.windSpeed} knots** from **${location.windDirection}**\n- **Surface Temperature:** **${location.sst}°C**\n- **Overall Risk:** **${location.riskLevel} (${location.riskScore}/100)**\n\nHow can I assist your voyage planning, fishing zone selection, or weather safety today?`,
            sources: ["INCOIS Coastal Buoys", "IMD Marine Bulletin"],
            metrics: [
              { label: "Wave SWH", value: `${location.waveHeight} m` },
              { label: "Wind Speed", value: `${location.windSpeed} kts` },
              { label: "SST", value: `${location.sst}°C` },
              { label: "Risk Score", value: `${location.riskScore}/100` },
            ],
            actionLink: {
              label: "Explore Interactive Marine Map",
              href: "/app/map",
            },
            time: "Just now",
          };
        }
      }

      setMessages((prev) => [...prev, reply]);
      setIsTyping(false);
      setResearchStage("");
    }, delay);
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
                <span>Quick</span>
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
              <span>New Chat</span>
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
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-950">
              Where should we navigate today?
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 max-w-lg mx-auto">
              Real-time ocean state, satellite PFZ detection, voyage safety & research grounded in{" "}
              <span className="font-medium text-zinc-800">{location.name}, {location.state}</span>.
            </p>
          </div>

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
                {mode === "research" ? "Oceanographic Research Inquiries" : "Suggested Prompts"}
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
                              <span>Grounding Steps & Datasets Consulted ({m.researchSteps.length})</span>
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

                      {/* Message Body */}
                      <div className="text-xs sm:text-sm text-zinc-900 leading-relaxed font-sans prose-sm prose-zinc">
                        {m.text.split("\n\n").map((para, pIdx) => {
                          if (para.startsWith("### ")) {
                            return (
                              <h3
                                key={pIdx}
                                className="text-sm sm:text-base font-semibold text-zinc-950 mb-2 mt-1"
                              >
                                {para.replace("### ", "")}
                              </h3>
                            );
                          }
                          if (para.startsWith("• ") || para.startsWith("- ")) {
                            return (
                              <ul key={pIdx} className="space-y-1 my-2 list-disc list-inside">
                                {para.split("\n").map((line, lIdx) => (
                                  <li key={lIdx} className="text-zinc-800">
                                    <span
                                      dangerouslySetInnerHTML={{
                                        __html: line
                                          .replace(/^[-•]\s*/, "")
                                          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"),
                                      }}
                                    />
                                  </li>
                                ))}
                              </ul>
                            );
                          }
                          if (para.match(/^\d+\.\s/)) {
                            return (
                              <ol key={pIdx} className="space-y-1 my-2 list-decimal list-inside">
                                {para.split("\n").map((line, lIdx) => (
                                  <li key={lIdx} className="text-zinc-800">
                                    <span
                                      dangerouslySetInnerHTML={{
                                        __html: line
                                          .replace(/^\d+\.\s*/, "")
                                          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"),
                                      }}
                                    />
                                  </li>
                                ))}
                              </ol>
                            );
                          }
                          return (
                            <p
                              key={pIdx}
                              className="mb-2.5"
                              dangerouslySetInnerHTML={{
                                __html: para.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"),
                              }}
                            />
                          );
                        })}
                      </div>

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
                        <span>•</span>
                        <span>{m.time}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

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
