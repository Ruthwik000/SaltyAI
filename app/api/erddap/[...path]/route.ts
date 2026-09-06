import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";

/**
 * Server-side proxy for the NOAA CoastWatch ERDDAP server.
 *
 * ERDDAP sends no Access-Control-Allow-Origin header, so the browser cannot
 * call it directly. Everything the research console reads — the dataset
 * catalogue, per-dataset variable info, and griddap slices — goes through here.
 *
 * Verified endpoint shape from the NOAA CoastWatch ERDDAP listing:
 *   https://coastwatch.pfeg.noaa.gov/erddap/griddap/<datasetID>.json
 */
const ERDDAP = "https://coastwatch.pfeg.noaa.gov/erddap";
const TIMEOUT_MS = 15000;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const upstream = new URL(`${ERDDAP}/${path.join("/")}`);
  // ERDDAP uses the query key itself for tabledap column lists and griddap
  // constraint expressions. Rebuilding searchParams encodes commas/brackets
  // into a different request and makes ERDDAP return 400/404.
  upstream.search = request.nextUrl.search;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(upstream, {
      cache: "no-store",
      signal: controller.signal,
      headers: { Accept: "application/json, text/csv, */*" },
    });
    const body = await response.arrayBuffer();
    return new NextResponse(body, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("content-type") || "application/json", "Cache-Control": "no-store" },
    });
  } catch (error) {
    const aborted = error instanceof DOMException && error.name === "AbortError";
    return NextResponse.json(
      {
        error: aborted
          ? "NOAA ERDDAP did not respond in time"
          : "Unable to reach NOAA ERDDAP",
        upstream: upstream.toString(),
      },
      { status: 502 }
    );
  }
}
