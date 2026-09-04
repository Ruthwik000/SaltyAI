"use client";

import * as React from "react";
import Link from "next/link";
import { useMarine } from "@/lib/marine-context";
import { researchDatasets, ResearchDataset } from "@/lib/marine-data";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Database,
  Download,
  Search,
  Filter,
  TrendingUp,
  Sparkles,
  Calendar,
  Layers,
  Code2,
  Check,
  Copy,
  ExternalLink,
  SlidersHorizontal,
} from "lucide-react";

export default function ResearchPage() {
  const { role, setIsAiDrawerOpen } = useMarine();
  const [selectedDataset, setSelectedDataset] = React.useState<ResearchDataset>(researchDatasets[0]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedParameter, setSelectedParameter] = React.useState("sea_surface_temperature");
  const [dateRange, setDateRange] = React.useState("2024-01-01 to 2024-12-31");
  const [copiedUrl, setCopiedUrl] = React.useState(false);

  if (role === "fisherman") {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center max-w-xl mx-auto my-12 space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-600">
            <Database className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-zinc-950">Research & Data Module</h2>
          <p className="text-xs text-zinc-600 leading-relaxed">
            Raw ERDDAP data exploration and NetCDF/CSV telemetry exports are configured for Researcher and Operator roles. As a Fisherman, your operational focus is on Potential Fishing Zones, live weather, and the Marine Map.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/app/fishing-zones">
              <Button size="sm" className="bg-zinc-950 text-white hover:bg-zinc-800 text-xs">
                Go to Fishing Zones
              </Button>
            </Link>
            <Link href="/app/map">
              <Button size="sm" variant="outline" className="text-xs">
                Open Marine Map
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const filteredDatasets = researchDatasets.filter(
    (ds) =>
      ds.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ds.parameters.some((p) => p.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const erddapSampleUrl = `https://incois.gov.in/erddap/griddap/insat_sst_hourly.csv?sea_surface_temperature[(2024-01-01T00:00:00Z):1:(2024-12-31T23:00:00Z)][(12.0):1:(22.0)][(78.0):1:(90.0)]`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(erddapSampleUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-sans text-xs text-zinc-400">•</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950">
            Marine Datasets & Time-Series Exploration
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setIsAiDrawerOpen(true)}
            className="text-xs h-8 bg-zinc-950 hover:bg-zinc-800 text-white gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5 text-zinc-300" />
            <span>Dataset Synthesizer</span>
          </Button>
        </div>
      </div>

      {/* ERDDAP Connection Banner */}
      <div className="p-3.5 rounded-xl border border-zinc-200 bg-white shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-purple-100 text-purple-800">
            <Database className="h-4 w-4" />
          </div>
          <div>
            <span className="font-semibold text-zinc-950">
              Federated ERDDAP Gateway: Active
            </span>
            <p className="text-[11px] text-zinc-500">
              Synchronized with INCOIS (Hyderabad), NOAA CoastWatch (USA), and Coriolis (France).
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 font-sans text-[11px] text-zinc-500 shrink-0">
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
          <Input
            placeholder="Search datasets by variable (e.g. sst, chlorophyll, salinity, wave_height)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <Input
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            placeholder="Temporal range (YYYY-MM-DD)"
            className="h-9 text-xs font-sans w-56"
          />
        </div>
      </div>

      {/* Main Grid: Datasets Catalog (Left) + Exploration & Export (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 1 Col: Dataset List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-sans text-zinc-500">
            <span>Catalog Datasets ({filteredDatasets.length})</span>
            <span>OPeNDAP Enabled</span>
          </div>

          {filteredDatasets.map((ds) => {
            const isSelected = selectedDataset.id === ds.id;
            return (
              <Card
                key={ds.id}
                onClick={() => setSelectedDataset(ds)}
                className={`transition-all cursor-pointer ${
                  isSelected
                    ? "border-zinc-950 ring-1 ring-zinc-950 shadow-sm"
                    : "border-zinc-200 hover:border-zinc-300"
                }`}
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-sans text-[10px] text-zinc-400 uppercase">
                      {ds.instrument}
                    </span>
                    <Badge variant="minimal" className="text-[10px] px-1.5 py-0">
                      {ds.resolution}
                    </Badge>
                  </div>
                  <CardTitle className="text-sm font-bold text-zinc-950">
                    {ds.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-1 space-y-2 text-xs">
                  <p className="text-zinc-500 text-[11px] line-clamp-2">
                    {ds.description}
                  </p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {ds.parameters.map((p, idx) => (
                      <span
                        key={idx}
                        className="bg-zinc-100 text-zinc-700 font-sans text-[10px] px-1.5 py-0.2 rounded"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Right 2 Cols: Interactive Time Series & Export Tools */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dataset Details & Variables */}
          <Card className="border-zinc-200">
            <CardHeader className="pb-3 border-b border-zinc-100 flex flex-row items-center justify-between">
              <div>
                <Badge variant="minimal" className="uppercase tracking-widest text-[10px] mb-1">
                  Active Dataset
                </Badge>
                <CardTitle className="text-base font-bold text-zinc-950">
                  {selectedDataset.name}
                </CardTitle>
                <span className="font-sans text-xs text-zinc-400">
                  Server: {selectedDataset.sourceServer}
                </span>
              </div>

              <Badge className="bg-zinc-900 text-white font-sans text-xs">
                {selectedDataset.recordsCount}
              </Badge>
            </CardHeader>

            <CardContent className="pt-4 space-y-6 text-xs font-sans">
              {/* Parameters Selector Chips */}
              <div>
                <span className="font-sans text-[10px] uppercase tracking-wider text-zinc-400 font-semibold block mb-2">
                  Select Variable for Time Series:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedDataset.parameters.map((param) => (
                    <button
                      key={param}
                      onClick={() => setSelectedParameter(param)}
                      className={`px-3 py-1 rounded-md font-sans text-xs transition-colors cursor-pointer ${
                        selectedParameter === param
                          ? "bg-zinc-900 text-white font-semibold shadow-xs"
                          : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                      }`}
                    >
                      {param}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Series Graph Mockup */}
              <div className="space-y-2">
                <div className="flex items-center justify-between font-sans text-xs text-zinc-500">
                  <span>12-Month Climatological Trend & Anomaly ({selectedParameter})</span>
                  <span>Spatial Filter: 12.0°N to 22.0°N (Bay of Bengal)</span>
                </div>

                <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/70 space-y-4">
                  {/* Visual Chart Bars */}
                  <div className="h-44 flex items-end justify-between gap-1.5 pt-4">
                    {[
                      { month: "Jan", val: 26.2, anomaly: "+0.2" },
                      { month: "Feb", val: 26.8, anomaly: "+0.3" },
                      { month: "Mar", val: 27.9, anomaly: "+0.5" },
                      { month: "Apr", val: 29.4, anomaly: "+0.8" },
                      { month: "May", val: 30.1, anomaly: "+1.1" },
                      { month: "Jun", val: 29.2, anomaly: "+0.4" },
                      { month: "Jul", val: 28.6, anomaly: "-0.1" },
                      { month: "Aug", val: 28.4, anomaly: "-0.2" },
                      { month: "Sep", val: 28.7, anomaly: "+0.1" },
                      { month: "Oct", val: 28.9, anomaly: "+0.3" },
                      { month: "Nov", val: 28.1, anomaly: "+0.4" },
                      { month: "Dec", val: 27.1, anomaly: "+0.2" },
                    ].map((m, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group">
                        <div
                          className="w-full max-w-[28px] rounded-t-sm bg-zinc-900 group-hover:bg-zinc-700 transition-all relative"
                          style={{ height: `${(m.val - 24) * 22}px` }}
                        >
                          {/* Tooltip on hover */}
                          <div className="hidden group-hover:block absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-900 text-white font-sans text-[9px] px-1.5 py-0.5 rounded shadow whitespace-nowrap z-20">
                            {m.val}°C ({m.anomaly})
                          </div>
                        </div>
                        <span className="font-sans text-[10px] text-zinc-500 mt-2">
                          {m.month}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-sans text-zinc-500 pt-2 border-t border-zinc-200">
                    <span>Baseline: 1991-2020 NOAA Optimum Interpolation</span>
                    <span className="text-emerald-700 font-semibold">Mean SST: 28.28°C (+0.32°C Anomaly)</span>
                  </div>
                </div>
              </div>

              {/* ERDDAP Export & Query Generator */}
              <div className="space-y-3 pt-2">
                <span className="font-sans text-[10px] uppercase tracking-wider text-zinc-400 font-semibold block">
                  Export & API Query:
                </span>

                <div className="p-3 bg-zinc-950 text-zinc-300 rounded-lg font-sans text-xs flex items-center justify-between gap-3 overflow-x-auto">
                  <code className="text-zinc-300 truncate text-[11px]">{erddapSampleUrl}</code>
                  <button
                    onClick={handleCopyUrl}
                    className="shrink-0 text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800 transition-colors"
                    title="Copy ERDDAP query"
                  >
                    {copiedUrl ? (
                      <Check className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {selectedDataset.format.map((fmt) => (
                    <Button
                      key={fmt}
                      variant="outline"
                      size="sm"
                      onClick={() => alert(`Initiating mock download of ${selectedDataset.name} as ${fmt}...`)}
                      className="text-xs h-8 gap-1.5 border-zinc-200"
                    >
                      <Download className="h-3.5 w-3.5 text-zinc-600" />
                      <span>Download {fmt}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
