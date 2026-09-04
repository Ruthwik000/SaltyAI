import { NextRequest, NextResponse } from "next/server";

const INCOIS_WMS = "https://www.incois.gov.in/thredds/wms/osf";

export async function GET(request: NextRequest) {
  const dataset = request.nextUrl.searchParams.get("dataset") || "";
  if (!/^(ww3|currents|winds)\/[A-Za-z0-9_.-]+\.nc$/.test(dataset)) {
    return NextResponse.json({ error: "Invalid INCOIS dataset" }, { status: 400 });
  }

  const upstream = new URL(INCOIS_WMS + "/" + dataset);
  request.nextUrl.searchParams.forEach((value, key) => {
    if (key !== "dataset") upstream.searchParams.set(key, value);
  });

  try {
    const response = await fetch(upstream, { cache: "no-store" });
    const body = await response.arrayBuffer();
    return new NextResponse(body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") || "image/png",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Unable to reach INCOIS WMS" }, { status: 502 });
  }
}
