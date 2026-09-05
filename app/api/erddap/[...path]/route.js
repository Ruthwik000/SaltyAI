import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side proxy for the INCOIS ERDDAP server.
 *
 * ERDDAP sends no Access-Control-Allow-Origin header, so the browser cannot
 * call it directly. Everything the research console reads — the dataset
 * catalogue, per-dataset variable info, and griddap slices — goes through here.
 *
 * Verified endpoint shape (given by the INCOIS dataset listing):
 *   https://erddap.incois.gov.in/erddap/griddap/<datasetID>.json
 */
const ERDDAP = "https://erddap.incois.gov.in/erddap";
const TIMEOUT_MS = 15000;

export async function GET(request, context) {
  const { path } = await context.params;
  const upstream = new URL(`${ERDDAP}/${path.join("/")}`);
  request.nextUrl.searchParams.forEach((value, key) => {
    upstream.searchParams.set(key, value);
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(upstream, {
      cache: "no-store",
      signal: controller.signal,
      headers: { Accept: "application/json, text/csv, */*" },
    });
    const type = response.headers.get("content-type") || "application/json";
    const body = await response.arrayBuffer();
    return new NextResponse(body, {
      status: response.status,
      headers: { "Content-Type": type, "Cache-Control": "no-store" },
    });
  } catch (error) {
    const aborted = error instanceof DOMException && error.name === "AbortError";
    return NextResponse.json(
      {
        error: aborted
          ? "INCOIS ERDDAP did not respond in time"
          : "Unable to reach INCOIS ERDDAP",
        upstream: upstream.toString(),
      },
      { status: 502 }
    );
  } finally {
    clearTimeout(timer);
  }
}
