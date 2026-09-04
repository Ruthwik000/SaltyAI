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
  return response.json() as Promise<AgentResponse>;
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
