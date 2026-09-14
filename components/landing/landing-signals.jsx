const defaultSignals = [
  { name: "SST", value: "28.4", unit: "°C", detail: "thermal front" },
  { name: "CHL-A", value: "0.85", unit: "mg/m³", detail: "ocean colour" },
  { name: "WIND", value: "14", unit: "kts", detail: "ENE / 065°" },
  { name: "WAVE", value: "1.6", unit: "m", detail: "7.8s period" },
];

export function LandingSignals({ signals = defaultSignals }) {
  return <></>;
}
