export type BackendStatus = "loading" | "ready" | "offline";

const API_BASE = process.env.NEXT_PUBLIC_SALTY_API_URL || "http://127.0.0.1:8010";

export async function saltyFetch<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { signal, cache: "no-store" });
  if (!response.ok) throw new Error(`SALTY API ${response.status}`);
  return response.json() as Promise<T>;
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
  layers: Record<string, MapLayerRecord[]>;
  sources: { parameter: string; dataset: string; variable: string; unit: string }[];
  unavailable_parameters: string[];
  start: string;
  end: string;
}
