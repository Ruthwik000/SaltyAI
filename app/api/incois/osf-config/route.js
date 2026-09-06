import { NextResponse } from "next/server";

const OSF_PAGE = "https://www.incois.gov.in/oceanservices/osfforecast.jsp";
const PFZ_PAGE = "https://www.incois.gov.in/DataInfo/MFASPFZ/index.html";

function extract(source, name) {
  const match = source.match(
    new RegExp("var\\s+" + name + "\\s*=\\s*[\\\"']([^\\\"']+)", "i")
  );
  return match?.[1] || null;
}

export async function GET() {
  try {
    const response = await fetch(OSF_PAGE, { cache: "no-store" });
    if (!response.ok)
      return NextResponse.json(
        { error: `INCOIS returned HTTP ${response.status}` },
        { status: 502 }
      );
    const html = await response.text();
    const files = {
      sst: extract(html, "sstnio"),
      currents: extract(html, "currentsFile2"),
      waves: extract(html, "rsmc_combined_ww3"),
      mld: extract(html, "mldnio"),
    };
    if (Object.values(files).some((file) => !file)) {
      return NextResponse.json(
        { error: "INCOIS page did not expose the expected live dataset configuration" },
        { status: 502 }
      );
    }
    return NextResponse.json(
      {
        source: OSF_PAGE,
        files,
        pfz: {
          source: PFZ_PAGE,
          iframe: "https://www.incois.gov.in/DataInfo/MFASPFZ/index.html",
        },
        discoveredAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to reach the INCOIS OSF page" },
      { status: 502 }
    );
  }
}
