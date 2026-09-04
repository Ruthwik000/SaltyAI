export type BackendStatus = "loading" | "ready" | "offline";

const API_BASE = process.env.NEXT_PUBLIC_SALTY_API_URL || "http://127.0.0.1:8010";

export async function saltyFetch<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { signal, cache: "no-store" });
  if (!response.ok) throw new Error(`SALTY API ${response.status}`);
  return response.json() as Promise<T>;
}

export interface AgentResponse {
  user_query: string;
  response: string;
  tool_calls: { tool: string; arguments: Record<string, unknown> }[];
  returned_data: { tool: string; data: unknown }[];
  synthetic?: boolean;
}

const MOCK_MARINE_CONTEXT = {
  status: "DEMO DATA",
  location: "Visakhapatnam",
  forecast_window: "next 72 hours (development demo)",
  wind: { speed_knots: 14, speed_mps: 7.2, direction: "ENE", direction_degrees: 67.5 },
  significant_wave: { height_m: 1.6, period_seconds: 8 },
  swell: { height_m: 0.9, period_seconds: 11 },
  surface_current: { speed_mps: 0.45, direction: "NE" },
  sea_surface_temperature_c: 28.4,
  rainfall_mm: 2,
  marine_risk: { level: "low to moderate", score: 28 },
  fishing_window: { status: "favorable", local_time: "06:00-11:00" },
};

function isUnsupportedAgentRefusal(response: string): boolean {
  return /\btools?\b.*\b(?:do not|don't|not|no)\b.*\b(?:functions?|weather|sail(?:ing)?|safety)\b|\b(?:cannot|can't|unable)\b.*\b(?:determine|answer)\b.*\b(?:fishing|sail(?:ing)?|weather|safety)\b/i.test(response);
}

function mockAgentResponse(query: string): string {
  const safetyQuestion = /\b(?:safe|safety|sail|sailing|boat|fishing|fish|departure|hazard|danger|risk)\b/i.test(query);
  if (safetyQuestion) {
    return "Based on the development demo forecast for Visakhapatnam, conditions look generally suitable for normal fishing or sailing: wind is 14 kt from ENE, significant waves are 1.6 m, swell is 0.9 m, and marine risk is low to moderate (28/100). A favorable demo fishing window is 06:00-11:00 local time. This is mock data, not a live safety clearance; check current INCOIS forecasts and local warnings before departure.";
  }
  return "The Visakhapatnam development demo forecast shows 14 kt ENE wind, 1.6 m significant waves, 0.9 m swell, 0.45 m/s NE surface current, and 28.4°C sea-surface temperature. This is mock data for testing, not a live marine forecast.";
}

export async function askMarineAgent(
  query: string,
  options: { mode?: "normal" | "research"; signal?: AbortSignal } = {}
): Promise<AgentResponse> {
  const response = await fetch(`${API_BASE}/api/llm/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, mode: options.mode || "normal" }),
    signal: options.signal,
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail.error || `SALTY LLM ${response.status}`);
  }
  const result = (await response.json()) as AgentResponse;
  // Keep the visible chat useful even if an older API/model process returns
  // the former unsupported-weather refusal.
  if (isUnsupportedAgentRefusal(result.response || "")) {
    return {
      ...result,
      response: mockAgentResponse(query),
      synthetic: true,
      returned_data: [
        ...(result.returned_data || []),
        { tool: "mock_marine_forecast", data: MOCK_MARINE_CONTEXT },
      ],
    };
  }
  return result;
}

export interface MapLayerRecord {
  latitude: number;
  longitude: number;
  value: number;
  unit: string;
  timestamp: string;
  dataset: string;
  variable: string;
}

export interface MapLayersResponse {
  region?: { min_lat: number; max_lat: number; min_lon: number; max_lon: number };
  layers: Record<string, MapLayerRecord[]>;
  sources: { parameter: string; dataset: string; variable: string; unit: string }[];
  unavailable_parameters: string[];
  start: string;
  end: string;
}
