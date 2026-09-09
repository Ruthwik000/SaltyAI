/**
 * Console tests. Run from the SaltyAI directory:
 *
 *     node tests/run.mjs
 *
 * Three suites, no test framework and no new dependency, because package.json
 * is held open by the dev server:
 *
 *   parser    lib/markdown.js against real research-mode output
 *   render    the components rendered with react-dom/server
 *   geometry  the chart's coordinates, checked for clipping and collisions
 *
 * The geometry suite exists because the palette validator checks colour and
 * nothing checks layout. It is what caught the axis whose top tick sat BELOW
 * the largest value, so the peak of a series was drawn outside the plot.
 *
 * JSX is stripped in memory with the TypeScript compiler already in
 * node_modules; nothing is written to the project.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Inside node_modules/.cache so that `import "react"` still resolves from the
// project - a scratch copy in the OS temp directory cannot see the project's
// dependencies. Files are overwritten rather than cleared: some mounts refuse
// deletes, and a stale file here would be rewritten on the next run anyway.
const BUILD = path.join(ROOT, "node_modules", ".cache", "salty-tests");
fs.mkdirSync(BUILD, { recursive: true });

const ts = (await import(pathToFileURL(path.join(ROOT, "node_modules/typescript/lib/typescript.js")))).default;

/* ------------------------------------------------------------------ */
/* Transpile the modules under test                                    */
/* ------------------------------------------------------------------ */

const SOURCES = {
  "markdown.mjs": "lib/markdown.js",
  "data-chart.mjs": "components/research/data-chart.jsx",
  "markdown-answer.mjs": "components/research/markdown-answer.jsx",
};

for (const [out, rel] of Object.entries(SOURCES)) {
  const source = fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/^"use client";\s*/m, "");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.React,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  });
  let code = outputText
    .replace(/from "@\/lib\/markdown"/g, 'from "./markdown.mjs"')
    .replace(/from "@\/components\/research\/data-chart"/g, 'from "./data-chart.mjs"');
  if (!/^import \* as React/m.test(code) && /React\.createElement/.test(code)) {
    code = 'import * as React from "react";\n' + code;
  }
  fs.writeFileSync(path.join(BUILD, out), code);
}

const md = await import(pathToFileURL(path.join(BUILD, "markdown.mjs")));
const { MarkdownAnswer } = await import(pathToFileURL(path.join(BUILD, "markdown-answer.mjs")));
const React = await import("react");
const { renderToStaticMarkup } = await import("react-dom/server");

/* ------------------------------------------------------------------ */
/* Harness                                                             */
/* ------------------------------------------------------------------ */

let pass = 0;
const failures = [];
const ok = (name, condition, detail = "") => {
  if (condition) { pass += 1; console.log(`  PASS  ${name}`); }
  else { failures.push(name); console.log(`  FAIL  ${name}${detail ? `  ${detail}` : ""}`); }
};
const eq = (name, got, want) =>
  ok(name, JSON.stringify(got) === JSON.stringify(want),
     `got ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
const render = (text, allowCharts = true) =>
  renderToStaticMarkup(React.createElement(MarkdownAnswer, { text, allowCharts }));
const count = (html, pattern) => (html.match(pattern) || []).length;

/* ------------------------------------------------------------------ */
/* Fixtures                                                            */
/* ------------------------------------------------------------------ */

const TREND = `## Chlorophyll and SST trend, Visakhapatnam shelf

Surface chlorophyll has **risen** then eased over 60 days while SST held steady.

| Date | Chlorophyll (mg/m3) | SST (degC) |
| --- | ---: | ---: |
| 2026-07-10 | 0.205 | 28.62 |
| 2026-07-24 | 1.033 | 28.80 |
| 2026-08-07 | 0.812 | 29.01 |
| 2026-08-21 | 0.705 | 29.11 |
| 2026-09-05 | 0.415 | 29.39 |

Derived as \`anomaly = SST - 1985-2012 baseline\`.

### Limits
- Satellite chlorophyll is food in the water, not a count of fish.

See [the dataset](https://coastwatch.noaa.gov/erddap/info/noaacwNPPN20VIIRSDINEOFDaily/index.html).`;

const LANDINGS = `| Port | Landings (t) | Boats | Trips |
| --- | ---: | ---: | ---: |
| Kakinada | 1240 | 310 | 880 |
| Vizag | 2100 | 520 | 1400 |
| Nellore | 640 | 180 | 500 |
| Ongole | 410 | 120 | 330 |`;

const LISTING = `| Parameter | Value | Unit |
| --- | ---: | --- |
| Wave height | 1.6 | m |
| Swell | 1.2 | m |
| Wind | 8.1 | m/s |`;

/* ------------------------------------------------------------------ */
/* 1. Parser                                                           */
/* ------------------------------------------------------------------ */

console.log("\nPARSER");
const blocks = md.parseBlocks(TREND);
eq("block sequence", blocks.map((b) => b.type), ["heading", "p", "table", "p", "heading", "ul", "p"]);
const table = blocks.find((b) => b.type === "table");
eq("header cells", table.header, ["Date", "Chlorophyll (mg/m3)", "SST (degC)"]);
eq("data rows", table.rows.length, 5);
ok("the rule row is not data", table.rows.every((row) => row[0] !== "---"));

eq("unit-less numbers", md.toNumber("29.4"), 29.4);
eq("numbers with a unit", md.toNumber("29.4 degC"), 29.4);
eq("thousands separators", md.toNumber("1,240"), 1240);
eq("scientific notation", md.toNumber("4.86e3"), 4860);
eq("an id is not a measurement", md.toNumber("advisory number 048"), null);
eq("an em dash is not zero", md.toNumber("—"), null);

eq("dates read as a sequence", md.looksSequential(["2026-09-01", "2026-09-02", "2026-09-03"]), true);
eq("port names do not", md.looksSequential(["Kakinada", "Vizag", "Nellore"]), false);

ok("a listing of different measures is not a chart",
   md.chartFromTable(["Parameter", "Value", "Unit"],
     [["Wave height", "1.6", "m"], ["Swell", "1.2", "m"], ["Wind", "8.1", "m/s"]]) === null);
ok("mixed units are not a chart",
   md.chartFromTable(["Zone", "Value", "Unit"],
     [["A", "1.6", "m"], ["B", "8.1", "m/s"], ["C", "29", "degC"]]) === null);
ok("one shared unit is fine",
   md.chartFromTable(["Zone", "Distance", "Unit"],
     [["048", "13.8", "km"], ["047", "24.1", "km"], ["049", "42.3", "km"]]) !== null);
ok("two rows are not a series",
   md.chartFromTable(["Date", "SST"], [["2026-09-01", "29.1"], ["2026-09-02", "29.3"]]) === null);

eq("chlorophyll and SST cannot share an axis",
   md.chartFromTable(table.header, table.rows).shareScale, false);
eq("comparable counts can",
   md.chartFromTable(["Port", "A", "B", "C"],
     [["a", "1240", "310", "880"], ["b", "2100", "520", "1400"],
      ["c", "640", "180", "500"], ["d", "410", "120", "330"]]).shareScale, true);

{
  const ticks = md.niceTicks(0.205, 1.033);
  ok("the axis covers the largest value",
     Math.max(...ticks) >= 1.033 && Math.min(...ticks) <= 0.205, JSON.stringify(ticks));
  ok("no floating-point noise on the axis",
     ticks.every((v) => String(v).length <= 6), JSON.stringify(ticks));
}
eq("a flat series still gets an axis", md.niceTicks(5, 5).length, 3);

let threw = 0;
for (const bad of ["", null, undefined, "|||", "| a |", "```\nunclosed",
                   "| a | b |\n| --- |", "#", "- ", "> ", "|---|---|"]) {
  try { md.parseBlocks(bad); } catch { threw += 1; }
}
eq("malformed input never throws", threw, 0);

/* ------------------------------------------------------------------ */
/* 2. Render                                                           */
/* ------------------------------------------------------------------ */

console.log("\nRENDER");
const trendHtml = render(TREND);
ok("a real table element", trendHtml.includes("<table"));
eq("one row per observation", count(trendHtml, /<tr class="border-b/g), 5);
ok("numeric columns are right-aligned", trendHtml.includes("text-right tabular-nums"));
ok("bold renders", trendHtml.includes("<strong"));
ok("inline code renders", trendHtml.includes("<code"));
ok("links carry rel=noopener", trendHtml.includes('rel="noopener noreferrer"'));
eq("incomparable series get one panel each", count(trendHtml, /<svg/g), 2);
eq("one line per panel", count(trendHtml, /<polyline/g), 2);
ok("the reason for separate scales is stated", trendHtml.includes("own scale"));
ok("each panel is labelled, not just coloured",
   trendHtml.includes("Chlorophyll (mg/m3)") && trendHtml.includes("SST (degC)"));

const barsHtml = render(LANDINGS);
eq("comparable series share one panel", count(barsHtml, /<svg/g), 1);
eq("twelve bars", count(barsHtml, /rx="3"/g), 12);
ok("a legend is present for three series", barsHtml.includes("gap-x-4"));
ok("bars, not lines", !barsHtml.includes("<polyline"));

ok("normal mode renders the table", render(LANDINGS, false).includes("<table"));
ok("normal mode draws no chart", !render(LANDINGS, false).includes("<svg"));
ok("a listing renders as a table", render(LISTING).includes("<table"));
ok("a listing is not plotted", !render(LISTING).includes("<svg"));

const evil = render(`Answer <img src=x onerror="alert(1)"> here.

| Zone | Note |
| --- | --- |
| 048 | <script>steal()</script> |
| 047 | fine |
| 049 | fine |`);
ok("no live script tag", !/<script>/.test(evil));
ok("no live img tag", !/<img /.test(evil));
ok("model output is shown as text", evil.includes("&lt;script&gt;"));

for (const [name, text] of [
  ["empty answer", ""],
  ["a bare table rule", "| --- | --- |"],
  ["an unclosed code fence", "```\nnothing closes this"],
  ["a ragged table", "| a | b |\n| --- | --- |\n| 1 |\n| 1 | 2 | 3 |"],
  ["gaps in a series", "| Date | V |\n| --- | ---: |\n| 2026-01-01 | 1 |\n| 2026-01-02 | — |\n| 2026-01-03 | 3 |"],
  ["a flat series", "| Date | V |\n| --- | ---: |\n| 2026-01-01 | 5 |\n| 2026-01-02 | 5 |\n| 2026-01-03 | 5 |"],
  ["values crossing zero", "| Date | Anomaly |\n| --- | ---: |\n| 2026-01-01 | -0.26 |\n| 2026-01-02 | -0.21 |\n| 2026-01-03 | 0.04 |"],
]) {
  try { render(text); ok(name, true); } catch (error) { ok(name, false, error.message); }
}

/* ------------------------------------------------------------------ */
/* 3. Geometry                                                         */
/* ------------------------------------------------------------------ */

console.log("\nGEOMETRY");
const PAD = { top: 12, right: 14, left: 50 };
const WIDTH = 720;

const svgsIn = (html) =>
  html.split("<svg").slice(1).map((chunk) => `<svg${chunk.split("</svg>")[0]}`);
const attrsOf = (svg, tag) =>
  [...svg.matchAll(new RegExp(`<${tag}\\b([^>]*)>`, "g"))].map((match) => {
    const out = {};
    for (const attribute of match[1].matchAll(/([\w-]+)="([^"]*)"/g)) out[attribute[1]] = attribute[2];
    return out;
  });

function auditChart(label, markdown) {
  svgsIn(render(markdown)).forEach((svg, index) => {
    const tag = `${label} panel ${index + 1}`;
    const height = Number(svg.match(/viewBox="0 0 \d+ ([\d.]+)"/)[1]);

    const points = [];
    for (const line of attrsOf(svg, "polyline")) {
      for (const pair of line.points.trim().split(/\s+/)) {
        const [x, y] = pair.split(",").map(Number);
        points.push({ x, y });
      }
    }
    const bars = attrsOf(svg, "rect").filter((rect) => rect.rx === "3");
    for (const bar of bars) {
      points.push({ x: Number(bar.x), y: Number(bar.y) });
      points.push({ x: Number(bar.x) + Number(bar.width), y: Number(bar.y) + Number(bar.height) });
    }

    ok(`${tag}: nothing drawn outside the frame`,
       points.every((p) => p.x >= PAD.left - 0.5 && p.x <= WIDTH - PAD.right + 0.5
                        && p.y >= PAD.top - 0.5 && p.y <= height + 0.5));

    const grid = attrsOf(svg, "line").filter((l) => l.stroke === "#e4e4e7").map((l) => Number(l.y1));
    if (grid.length && points.length) {
      const top = Math.min(...grid);
      const base = Math.max(...grid);
      ok(`${tag}: every value sits inside the axis range`,
         points.every((p) => p.y >= top - 0.5 && p.y <= base + 0.5),
         `data ${Math.min(...points.map((p) => p.y)).toFixed(1)}-${Math.max(...points.map((p) => p.y)).toFixed(1)} vs axis ${top}-${base}`);
    }
    // A 150px panel carries four gridlines; a 74px small-multiple panel gets two.
    const maxGrid = height > 120 ? 4 : 2;
    ok(`${tag}: gridline count suits the panel`, grid.length <= maxGrid, String(grid.length));
    if (grid.length > 2) {
      const sorted = grid.slice().sort((a, b) => a - b);
      const gaps = sorted.slice(1).map((value, i) => value - sorted[i]);
      ok(`${tag}: gridlines evenly spaced`, Math.max(...gaps) - Math.min(...gaps) < 1.5);
    }

    if (bars.length > 1) {
      const sorted = [...bars].sort((a, b) => Number(a.x) - Number(b.x));
      ok(`${tag}: bars never overlap`,
         sorted.every((bar, i) => i === 0
           || Number(bar.x) >= Number(sorted[i - 1].x) + Number(sorted[i - 1].width) - 0.01));
      ok(`${tag}: bars stay at least 3px wide`, bars.every((bar) => Number(bar.width) >= 3));
    }

    const xLabels = attrsOf(svg, "text").filter((t) => t["text-anchor"] === "middle")
      .map((t) => Number(t.x)).sort((a, b) => a - b);
    if (xLabels.length > 1) {
      const gaps = xLabels.slice(1).map((x, i) => x - xLabels[i]);
      // ~5.5px per character at font-size 10, labels capped at 11 characters.
      ok(`${tag}: x labels do not collide`, Math.min(...gaps) >= 60,
         `${Math.min(...gaps).toFixed(0)}px`);
    }
    ok(`${tag}: y labels fit the gutter`,
       attrsOf(svg, "text").filter((t) => t["text-anchor"] === "end")
         .every((t) => Number(t.x) <= PAD.left - 4));

    const hits = attrsOf(svg, "rect").filter((rect) => rect.fill === "transparent")
      .map((rect) => ({ x: Number(rect.x), width: Number(rect.width) }))
      .sort((a, b) => a.x - b.x);
    if (hits.length > 1) {
      ok(`${tag}: hover targets tile without gaps`,
         hits.every((hit, i) => i === 0 || Math.abs(hit.x - (hits[i - 1].x + hits[i - 1].width)) < 0.01));
      // 20px, not the 44px touch guideline: a desktop console, a crosshair that
      // snaps to the nearest point, and the table above as the primary surface.
      ok(`${tag}: hover targets at least 20px`, hits.every((hit) => hit.width >= 20),
         `${Math.min(...hits.map((h) => h.width)).toFixed(1)}px`);
    }
  });
}

auditChart("small multiples", TREND);
auditChart("grouped bars", LANDINGS);
auditChart("dense series", "| Date | Wave height (m) |\n| --- | ---: |\n" +
  Array.from({ length: 30 }, (_, i) =>
    `| 2026-08-${String(i + 1).padStart(2, "0")} | ${(1 + Math.sin(i / 3) * 0.8).toFixed(2)} |`).join("\n"));
auditChart("peak at the top", "| Date | V |\n| --- | ---: |\n| 2026-01-01 | 0.205 |\n| 2026-01-02 | 1.033 |\n| 2026-01-03 | 0.900 |");
auditChart("crossing zero", "| Date | Anomaly |\n| --- | ---: |\n| 2026-09-01 | -0.26 |\n| 2026-09-02 | -0.21 |\n| 2026-09-03 | 0.04 |\n| 2026-09-04 | 0.31 |");

console.log(`\n${pass} passed, ${failures.length} failed`);
for (const name of failures) console.log(`  failed: ${name}`);
process.exit(failures.length ? 1 : 0);
