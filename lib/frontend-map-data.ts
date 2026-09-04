import type { MapLayerRecord, MapLayersResponse } from "./api";

// Deterministic browser-side fields used by the map renderer. Keeping the grid
// local means the map remains interactive when the data API is stopped.
const fields: Record<string, { unit: string; base: number; spread: number }> = {
  SST: { unit: "°C", base: 28.4, spread: 1.8 },
  chlorophyll: { unit: "mg/m³", base: 0.9, spread: 0.65 },
  wind: { unit: "m/s", base: 8.5, spread: 4.2 },
  wave: { unit: "m", base: 1.6, spread: 0.75 },
  swell: { unit: "m", base: 0.9, spread: 0.5 },
  current: { unit: "m/s", base: 0.55, spread: 0.3 },
};

function fieldRecords(parameter: string): MapLayerRecord[] {
  const field = fields[parameter];
  const records: MapLayerRecord[] = [];
  for (let latIndex = 0; latIndex < 7; latIndex += 1) {
    for (let lonIndex = 0; lonIndex < 9; lonIndex += 1) {
      const latitude = 17.05 + latIndex * 0.23;
      const longitude = 82.55 + lonIndex * 0.24;
      const wave = Math.sin((latIndex + 1) * 1.4) * 0.45 + Math.cos((lonIndex + 2) * 0.8) * 0.35;
      records.push({
        latitude,
        longitude,
        value: Number((field.base + field.spread * wave).toFixed(3)),
        unit: field.unit,
        timestamp: "frontend-live",
        dataset: "SALTY frontend marine field",
        variable: parameter,
      });
    }
  }
  return records;
}

export const frontendMapLayers: MapLayersResponse = {
  region: { min_lat: 17, max_lat: 18.5, min_lon: 82.5, max_lon: 84.5 },
  start: "frontend",
  end: "frontend",
  layers: Object.fromEntries(Object.keys(fields).map((parameter) => [parameter, fieldRecords(parameter)])),
  sources: Object.keys(fields).map((parameter) => ({
    parameter,
    dataset: "SALTY frontend marine field",
    variable: parameter,
    unit: fields[parameter].unit,
  })),
  unavailable_parameters: [],
};
