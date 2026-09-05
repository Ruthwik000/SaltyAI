import { NextRequest, NextResponse } from "next/server";

const INCOIS = "https://www.incois.gov.in";

export async function GET(request, context) {
  const { path } = await context.params;
  const upstreamUrl = new URL(INCOIS + "/" + path.join("/"));
  request.nextUrl.searchParams.forEach((value, key) =>
    upstreamUrl.searchParams.set(key, value)
  );

  try {
    const upstream = await fetch(upstreamUrl, { cache: "no-store" });
    const type = upstream.headers.get("content-type") || "application/octet-stream";
    if (
      type.includes("text/html") ||
      type.includes("javascript") ||
      type.includes("css")
    ) {
      let body = await upstream.text();
      if (type.includes("text/html"))
        body = body.replace(
          /<head>/i,
          '<head><base href="/api/incois/frame/oceanservices/osfforecast.jsp">'
        );
      // The official page contains a few root-relative WMS/geoserver URLs.
      // Keep them inside this same-origin proxy so the iframe can use them.
      body = body.replace(
        /(["'(])\/(thredds|geoserver|json|site|portal|assets)\//g,
        "$1/api/incois/frame/$2/"
      );
      return new NextResponse(body, {
        status: upstream.status,
        headers: { "Content-Type": type, "Cache-Control": "no-store" },
      });
    }
    return new NextResponse(await upstream.arrayBuffer(), {
      status: upstream.status,
      headers: { "Content-Type": type, "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Unable to reach INCOIS" }, { status: 502 });
  }
}
