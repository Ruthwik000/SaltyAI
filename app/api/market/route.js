import { NextResponse } from "next/server";

/**
 * Today's landings and auction prices at an Indian fishing harbour, from
 * CMFRI Fish Watch.
 *
 * Why this source. India publishes no machine-readable daily fish price feed.
 * NFDB's Fish Market Price Information System (fmpisnfdb.in) ships weekly PDFs
 * and a dashboard, with no API. CMFRI's Fish Watch
 * (https://www.cmfri.org.in/fishwatch) is the one public page carrying, per
 * harbour, the quantity of each resource landed in kg together with the
 * minimum and maximum auction price in rupees per kg. It is HTML with no API,
 * so this route reads it server-side, the same way /api/incois/osf-config
 * reads dataset names out of the official OSF page. The browser could not
 * fetch it in any case: cmfri.org.in sends no Access-Control-Allow-Origin.
 *
 * The page's shape, read from it rather than assumed:
 *
 *   one <table> per harbour, six of them, and the station and date live
 *   INSIDE that table as their own rows, not as headings above it:
 *
 *     Station : Visakhapatnam FH, Andhra Pradesh
 *     Date : 18 August 2026
 *     Sl No | Resource | Landings | Price(Rs/kg)      <- Price spans two
 *                                 | Max. | Min.       <- sub-header
 *     1     | Scads    | 16,430   | 80   | 70
 *     ...
 *     Total | 159,455
 *
 * Because "Price(Rs/kg)" carries a colspan, its header index is the index of
 * the FIRST of its two data columns, which is what makes Max/Min resolvable.
 * The sub-header is read for the order rather than assumed, since Max before
 * Min is the opposite of how most price tables are written.
 *
 * What CMFRI does NOT publish, and therefore stays out: any previous-day
 * price, so no day-over-day change; a single average, so the price is a range
 * and is reported as one; local or vernacular species names; and any harbour
 * beyond the handful it covers. A coast it does not cover returns
 * covered:false with the stations it does publish, rather than another
 * harbour's prices wearing the wrong port's name.
 *
 * ?debug=1 returns every station, date, row count and how each table was read.
 * That is the first thing to look at if CMFRI changes the page.
 */

const PAGE = "https://www.cmfri.org.in/fishwatch";
const TIMEOUT_MS = 20000;

/** CMFRI's station names are not always the port name the console uses. */
const ALIASES = {
  kochi: ["cochin"],
  cochin: ["kochi"],
  mangaluru: ["mangalore"],
  mangalore: ["mangaluru"],
  vizag: ["visakhapatnam"],
  visakhapatnam: ["vizag"],
};

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

function stripNoise(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ");
}

function textOf(fragment) {
  return fragment
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/** "16,430" -> 16430. Anything that is not a number stays null. */
function toNumber(cell) {
  if (cell == null) return null;
  const cleaned = String(cell).replace(/[,\s₹]/g, "").replace(/[^\d.\-]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

function tableBlocks(html) {
  const blocks = [];
  const re = /<table\b[^>]*>([\s\S]*?)<\/table>/gi;
  let match;
  while ((match = re.exec(html))) blocks.push({ at: match.index, inner: match[1] });
  return blocks;
}

function rowsOf(inner) {
  const rows = [];
  const rowRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let row;
  while ((row = rowRe.exec(inner))) {
    const cells = [];
    const cellRe = /<t([hd])\b[^>]*>([\s\S]*?)<\/t\1>/gi;
    let cell;
    while ((cell = cellRe.exec(row[1]))) cells.push(textOf(cell[2]));
    if (cells.length) rows.push(cells);
  }
  return rows;
}

function findLabelled(rows, label, before) {
  // CMFRI puts "Station : ... " and "Date : ..." in the SAME cell, so a capture
  // that only stops at a cell boundary swallows the date into the station name.
  // Stop at the next label as well as at the cell edge.
  const pattern = new RegExp(
    `${label}\\s*[:\\-]\\s*(.+?)\\s*(?=\\b(?:date|station|sl\\s*no|resource|landings?|price)\\b\\s*[:\\-]|\\||$)`,
    "i"
  );
  for (const cells of rows) {
    const hit = cells.join(" | ").match(pattern);
    if (hit) return hit[1].trim();
  }
  // Some pages put the station above the table instead of inside it.
  const hit = (before || "").match(pattern);
  return hit ? hit[1].trim() : null;
}

/** "18 August 2026" or "18-08-2026" -> ISO. */
function toIsoDate(raw) {
  if (!raw) return null;
  const named = raw.match(/(\d{1,2})\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})/);
  if (named) {
    const month = MONTHS.findIndex((name) => name.startsWith(named[2].toLowerCase()));
    if (month >= 0) {
      return `${named[3]}-${String(month + 1).padStart(2, "0")}-${String(Number(named[1])).padStart(2, "0")}`;
    }
  }
  const numeric = raw.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (numeric) {
    return `${numeric[3]}-${numeric[2].padStart(2, "0")}-${numeric[1].padStart(2, "0")}`;
  }
  return null;
}

/**
 * Locate the columns from the header pair. Returns indices into the DATA rows,
 * which is why the price index is used as the first of its spanned pair.
 */
function locateColumns(rows) {
  for (let index = 0; index < rows.length - 1; index += 1) {
    const cells = rows[index];
    const nameAt = cells.findIndex((cell) => /resource|species/i.test(cell));
    const landingsAt = cells.findIndex((cell) => /landing|quantity|qty|catch/i.test(cell));
    if (nameAt < 0 || landingsAt < 0) continue;

    const priceAt = cells.findIndex((cell) => /price/i.test(cell));
    let maxAt = -1;
    let minAt = -1;
    let firstData = index + 1;

    const sub = rows[index + 1] || [];
    const subMax = sub.findIndex((cell) => /max/i.test(cell));
    const subMin = sub.findIndex((cell) => /min/i.test(cell));
    if (priceAt >= 0 && subMax >= 0 && subMin >= 0) {
      // The sub-header row holds only the spanned columns, so its own indices
      // are offsets from where the price header starts.
      maxAt = priceAt + subMax;
      minAt = priceAt + subMin;
      firstData = index + 2;
    } else if (priceAt >= 0) {
      // One price column and no Max/Min split: report it as a single figure
      // rather than inventing which end of a range it is.
      maxAt = priceAt;
      minAt = -1;
    }
    return { nameAt, landingsAt, maxAt, minAt, firstData, parsedBy: "header" };
  }
  return null;
}

/** Last resort: the observed five-column shape, proven by the row itself. */
function locateByShape(rows) {
  const at = rows.findIndex(
    (cells) =>
      cells.length >= 5 &&
      toNumber(cells[1]) == null &&
      cells[1] !== "" &&
      toNumber(cells[2]) != null &&
      toNumber(cells[3]) != null
  );
  if (at < 0) return null;
  return { nameAt: 1, landingsAt: 2, maxAt: 3, minAt: 4, firstData: at, parsedBy: "shape" };
}

function tokens(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\bfh\b|fisheries?|fishing|harbou?r|landing|centre|center|station/g, " ")
    .replace(/[^a-z ]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3);
}

function placeMatches(station, place) {
  const wanted = tokens(place);
  const expanded = new Set(wanted);
  for (const word of wanted) for (const alias of ALIASES[word] || []) expanded.add(alias);
  const found = tokens(station);
  return [...expanded].some((word) =>
    found.some((other) => other.startsWith(word) || word.startsWith(other))
  );
}

export async function GET(request) {
  const params = request.nextUrl.searchParams;
  const place = (params.get("place") || "").trim();
  const debug = params.get("debug") === "1";

  if (!place) {
    return NextResponse.json({ error: "place is required" }, { status: 400 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let html;
  try {
    const response = await fetch(PAGE, {
      signal: controller.signal,
      // Read it fresh on every request: the console should show what CMFRI is
      // publishing right now, not what it published when the server booted.
      cache: "no-store",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "Mozilla/5.0 (compatible; SALTY marine console)",
      },
    });
    if (!response.ok) {
      return NextResponse.json(
        { error: "CMFRI Fish Watch did not return the page", status: response.status },
        { status: 502 }
      );
    }
    html = await response.text();
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error?.name === "AbortError"
            ? "CMFRI Fish Watch did not answer in time"
            : "Unable to reach CMFRI Fish Watch",
      },
      { status: 502 }
    );
  } finally {
    clearTimeout(timer);
  }

  const clean = stripNoise(html);
  const blocks = tableBlocks(clean);
  const stations = [];

  for (const block of blocks) {
    const rows = rowsOf(block.inner);
    if (rows.length < 3) continue;
    const before = textOf(clean.slice(Math.max(0, block.at - 900), block.at));

    const columns = locateColumns(rows) || locateByShape(rows);
    if (!columns) continue;

    const stationName = findLabelled(rows, "station", before);
    const observedOn = toIsoDate(findLabelled(rows, "date", before));

    let totalLandingsKg = null;
    const items = [];
    for (const cells of rows.slice(columns.firstData)) {
      const resource = (cells[columns.nameAt] || "").trim();
      const landingsKg = toNumber(cells[columns.landingsAt]);
      if (/^total\b/i.test(resource) || /^total\b/i.test(cells[0] || "")) {
        totalLandingsKg = landingsKg ?? toNumber(cells[columns.nameAt + 1]);
        continue;
      }
      if (!resource || toNumber(resource) != null) continue;
      const priceMax = columns.maxAt >= 0 ? toNumber(cells[columns.maxAt]) : null;
      const priceMin = columns.minAt >= 0 ? toNumber(cells[columns.minAt]) : null;
      if (landingsKg == null && priceMin == null && priceMax == null) continue;
      items.push({
        resource,
        landingsKg,
        landingsTonnes: landingsKg == null ? null : Number((landingsKg / 1000).toFixed(1)),
        priceMin,
        priceMax,
      });
    }
    if (items.length === 0) continue;

    if (totalLandingsKg == null) {
      const summed = items.reduce((sum, item) => sum + (item.landingsKg || 0), 0);
      totalLandingsKg = summed > 0 ? summed : null;
    }

    stations.push({
      station: stationName,
      observedOn,
      parsedBy: columns.parsedBy,
      items,
      totalLandingsKg,
    });
  }

  const summary = stations.map((s) => ({
    station: s.station,
    observedOn: s.observedOn,
    rows: s.items.length,
    parsedBy: s.parsedBy,
  }));

  if (stations.length === 0) {
    return NextResponse.json(
      {
        error:
          "CMFRI Fish Watch was read but no landings table could be parsed — the page structure has probably changed",
        tablesSeen: blocks.length,
        ...(debug ? { debug: { bytes: html.length, firstTableRows: rowsOf(blocks[0]?.inner || "").slice(0, 6) } } : {}),
      },
      { status: 502 }
    );
  }

  const match = stations.find((s) => placeMatches(s.station, place));

  if (!match) {
    return NextResponse.json(
      {
        covered: false,
        place,
        stationsPublished: stations.map((s) => s.station).filter(Boolean),
        source: "CMFRI Fish Watch",
        sourceUrl: PAGE,
        ...(debug ? { debug: summary } : {}),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  // The resource that actually landed most is what the harbour is trading.
  const top = match.items.reduce(
    (best, item) => ((item.landingsKg ?? -1) > (best?.landingsKg ?? -1) ? item : best),
    null
  );

  return NextResponse.json(
    {
      covered: true,
      harbourName: match.station,
      observedOn: match.observedOn,
      totalLandingsKg: match.totalLandingsKg,
      totalLandingsTonnes:
        match.totalLandingsKg == null ? null : Number((match.totalLandingsKg / 1000).toFixed(1)),
      top,
      items: match.items,
      parsedBy: match.parsedBy,
      source: "CMFRI Fish Watch — landings and auction price at major harbours",
      sourceUrl: PAGE,
      ...(debug ? { debug: summary } : {}),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
