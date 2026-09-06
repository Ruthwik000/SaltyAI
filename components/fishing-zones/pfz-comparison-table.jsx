import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function PfzComparisonTable({ zones, onClose }) {
  if (zones.length === 0) return null;

  return (
    <Card className="border-zinc-300 bg-zinc-50/50">
      <CardHeader className="pb-3 border-b border-zinc-200 flex flex-row items-center justify-between">
        <div>
          <Badge variant="minimal" className="uppercase tracking-wider text-[10px] mb-1">
            Comparative Matrix
          </Badge>
          <CardTitle className="text-base font-semibold text-zinc-950">
            Zone Efficiency & Catch Potential Comparison
          </CardTitle>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onClose}
          className="text-xs h-7 border-zinc-200"
        >
          Close Comparison
        </Button>
      </CardHeader>
      <CardContent className="pt-4 overflow-x-auto">
        <table className="w-full text-left text-xs font-sans">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500 font-sans text-[11px] uppercase">
              <th className="py-2.5 px-3">Metric</th>
              {zones.map((z) => (
                <th key={z.id} className="py-2.5 px-3 font-semibold text-zinc-900">
                  {z.name.slice(0, 24)}...
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200/70 font-sans text-xs">
            <tr>
              <td className="py-2.5 px-3 text-zinc-500 font-sans">Suitability Score</td>
              {zones.map((z) => (
                <td key={z.id} className="py-2.5 px-3 font-bold text-emerald-700">
                  {z.suitabilityScore}% ({z.suitabilityText})
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-2.5 px-3 text-zinc-500 font-sans">Distance from Port</td>
              {zones.map((z) => (
                <td key={z.id} className="py-2.5 px-3 text-zinc-900">
                  {z.distanceNM} NM ({z.bearing})
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-2.5 px-3 text-zinc-500 font-sans">Est. Transit Time</td>
              {zones.map((z) => (
                <td key={z.id} className="py-2.5 px-3 text-zinc-700">
                  {z.transitHours} Hours
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-2.5 px-3 text-zinc-500 font-sans">Fuel Consumption</td>
              {zones.map((z) => (
                <td key={z.id} className="py-2.5 px-3 text-zinc-700">
                  ~{z.fuelEstimatedLiters} Liters
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-2.5 px-3 text-zinc-500 font-sans">SST Front</td>
              {zones.map((z) => (
                <td key={z.id} className="py-2.5 px-3 text-zinc-700">
                  {z.sstC}°C ({z.sstGradientC})
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-2.5 px-3 text-zinc-500 font-sans">Chlorophyll-a</td>
              {zones.map((z) => (
                <td key={z.id} className="py-2.5 px-3 text-zinc-700">
                  {z.chlorophyllMgM3} mg/m³
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-2.5 px-3 text-zinc-500 font-sans">Primary Species</td>
              {zones.map((z) => (
                <td
                  key={z.id}
                  className="py-2.5 px-3 text-zinc-800 font-sans text-[11px]"
                >
                  {z.primarySpecies.slice(0, 2).join(", ")}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
