/**
 * Parsing for agent answers: markdown structure, and whether a table is a chart.
 *
 * Pure functions, no JSX, no React. They live here rather than inside the
 * component so they can be run and checked directly - a markdown parser is
 * exactly the kind of code that looks right and quietly mangles the one input
 * that matters, and the input here is model output that changes shape between
 * questions.
 */

/* ------------------------------------------------------------------ */
/* Inline                                                              */
/* ------------------------------------------------------------------ */

/**
 * Ordered so code wins over emphasis: `**not bold**` inside backticks stays
 * literal, which matters the moment an answer quotes a variable name.
 */
export const INLINE_RULES = [
  { kind: "code", pattern: /`([^`]+)`/ },
  { kind: "link", pattern: /\[([^\]]+)\]\(([^)\s]+)\)/ },
  { kind: "bold", pattern: /\*\*([^*]+)\*\*/ },
  { kind: "italic", pattern: /(?<![*\w])\*([^*\n]+)\*(?!\*)/ },
];

/** The first inline construct in `text`, or null. */
export function firstInline(text) {
  let earliest = null;
  for (const rule of INLINE_RULES) {
    const match = rule.pattern.exec(text);
    if (match && (earliest === null || match.index < earliest.match.index)) {
      earliest = { rule, match };
    }
  }
  return earliest;
}

/* ------------------------------------------------------------------ */
/* Blocks                                                              */
/* ------------------------------------------------------------------ */

const TABLE_ROW = /^\s*\|(.+)\|\s*$/;
const TABLE_RULE = /^\s*\|?[\s:|-]+\|[\s:|-]*$/;

function splitRow(line) {
  return line
    .replace(/^\s*\|/, "")
    .replace(/\|\s*$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

/**
 * Split an answer into blocks: heading, table, code, quote, ul, ol, rule, p.
 *
 * Anything unrecognised falls through as a paragraph, which is the safe
 * direction to fail in - text renders as text rather than disappearing.
 */
export function parseBlocks(markdown) {
  const lines = String(markdown ?? "").replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (/^\s*```/.test(line)) {
      const body = [];
      index += 1;
      while (index < lines.length && !/^\s*```/.test(lines[index])) {
        body.push(lines[index]);
        index += 1;
      }
      index += 1;
      blocks.push({ type: "code", body: body.join("\n") });
      continue;
    }

    // A table is a pipe row followed by a rule row. Requiring the rule row is
    // what stops a sentence containing a pipe from being eaten as a table.
    if (TABLE_ROW.test(line) && index + 1 < lines.length && TABLE_RULE.test(lines[index + 1])) {
      const header = splitRow(line);
      index += 2;
      const rows = [];
      while (index < lines.length && TABLE_ROW.test(lines[index])) {
        rows.push(splitRow(lines[index]));
        index += 1;
      }
      blocks.push({ type: "table", header, rows });
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2] });
      index += 1;
      continue;
    }

    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
      blocks.push({ type: "rule" });
      index += 1;
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const body = [];
      while (index < lines.length && /^\s*>\s?/.test(lines[index])) {
        body.push(lines[index].replace(/^\s*>\s?/, ""));
        index += 1;
      }
      blocks.push({ type: "quote", text: body.join(" ") });
      continue;
    }

    if (/^\s*[-*•]\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^\s*[-*•]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*[-*•]\s+/, ""));
        index += 1;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^\s*\d+[.)]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*\d+[.)]\s+/, ""));
        index += 1;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    const paragraph = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !TABLE_ROW.test(lines[index]) &&
      !/^\s*(#{1,6}\s|```|>|[-*•]\s|\d+[.)]\s)/.test(lines[index])
    ) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    if (paragraph.length) blocks.push({ type: "p", text: paragraph.join(" ") });
    else index += 1;
  }

  return blocks;
}

/** Right-align a column of numbers so the digits line up on the decimal. */
export function isNumericColumn(rows, index) {
  const cells = rows.map((row) => (row[index] ?? "").trim()).filter(Boolean);
  if (!cells.length) return false;
  const numeric = cells.filter((cell) => /^[-+]?[\d,]*\.?\d+/.test(cell));
  return numeric.length >= cells.length * 0.7;
}

/* ------------------------------------------------------------------ */
/* Is this table a chart?                                              */
/* ------------------------------------------------------------------ */

/** "1.31", "-0.07", "29.4 °C", "1,240" -> number, or null if it is not one. */
export function toNumber(cell) {
  if (cell == null) return null;
  const text = String(cell).replace(/,/g, "").trim();
  const match = text.match(/-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?/);
  if (!match) return null;
  // Reject a cell that is mostly words with a number in it ("advisory 048"),
  // which would otherwise plot a zone id as if it were a measurement.
  const stripped = text.replace(match[0], "").replace(/[^\w]/g, "");
  if (stripped.length > 6) return null;
  const value = Number(match[0]);
  return Number.isFinite(value) ? value : null;
}

/** Do these labels read as a sequence - dates, times, months? Then it is a line. */
export function looksSequential(labels) {
  if (labels.length < 3) return false;
  const dateLike = labels.filter((label) =>
    /\d{4}-\d{2}(-\d{2})?|\d{1,2}:\d{2}|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(
      String(label)
    )
  );
  return dateLike.length >= labels.length * 0.7;
}

export const MAX_SERIES = 3;

/**
 * Read a parsed table into something plottable, or null.
 *
 * Null is the common case and the right answer. Most research tables are
 * parameter/value/unit listings, not series, and drawing one as a chart says
 * something false about the data.
 */
export function chartFromTable(header, rows) {
  if (!header || header.length < 2 || !rows || rows.length < 3) return null;

  const headers = header.map((cell) => String(cell ?? "").trim());

  // "| Parameter | Value | Unit |" is a listing of different measures, not a
  // series. Plotting wave height, swell and wind speed against one axis says
  // they are comparable magnitudes, and they are not - they do not even share
  // a unit. Two signals, either of which settles it:
  //
  //   a units column holding more than one distinct unit, and
  //   a first column whose header names it as a list of parameters.
  const unitColumn = headers.findIndex((cell) => /^units?$/i.test(cell));
  if (unitColumn > 0) {
    const units = new Set(
      rows.map((row) => String(row[unitColumn] ?? "").trim()).filter(Boolean)
    );
    if (units.size > 1) return null;
  }
  if (/^(parameter|parameters|metric|variable|field|property|item|measure)$/i.test(headers[0])) {
    return null;
  }

  const labels = rows.map((row) => String(row[0] ?? "").trim());
  if (labels.some((label) => !label)) return null;

  const series = [];
  for (let column = 1; column < header.length; column += 1) {
    const values = rows.map((row) => toNumber(row[column]));
    const known = values.filter((value) => value !== null);
    if (known.length < rows.length * 0.7) continue;
    series.push({ name: String(header[column] ?? `Series ${column}`).trim(), values });
  }
  if (!series.length) return null;

  const shown = series.slice(0, MAX_SERIES);
  return {
    labels,
    series: shown,
    omitted: Math.max(0, series.length - MAX_SERIES),
    kind: looksSequential(labels) ? "line" : "bar",
    shareScale: sharesOneScale(shown),
  };
}

/**
 * A comparison table, read as a chart.
 *
 * chartFromTable deliberately refuses a "| Parameter | ... |" table: down that
 * column are different measures that do not share a unit, and drawing them
 * against one axis claims they are comparable magnitudes. That guard is right
 * and stays.
 *
 * But it also means a table that compares ONE parameter ACROSS SOURCES — the
 * shape the agent returns whenever it is asked to compare a satellite reading
 * with a buoy, or one port with another — never got a chart at all, when it is
 * the most chartable answer the agent produces.
 *
 * So this reads that shape instead, transposed: the source columns become the
 * x categories and each parameter row becomes its own series. With more than
 * one parameter the scales are kept apart, so DataChart draws one panel per
 * parameter — comparison within a row, never across rows.
 *
 * A row is only charted when at least TWO of its sources actually carry a
 * number. One value and a "no data available" is not a comparison, and a lone
 * bar beside an empty slot would imply the gap was measured as zero.
 */
export function comparisonFromTable(header, rows) {
  if (!header || header.length < 3 || !rows || rows.length === 0) return null;
  const headers = header.map((cell) => String(cell ?? "").trim());
  if (!/^(parameter|parameters|metric|variable|field|property|item|measure)$/i.test(headers[0])) {
    return null;
  }

  // A delta column is derived from the others, and a note column is prose.
  // Neither is a source being compared.
  const sources = [];
  for (let column = 1; column < headers.length; column += 1) {
    // No \b after the alternation: Δ is not a word character, so a boundary
    // never forms after it and the delta column was being charted as if it
    // were a third source.
    if (/^(Δ|delta|diff|difference|change|notes?|comments?|source|status)([^a-z]|$)/i.test(headers[column])) {
      continue;
    }
    sources.push(column);
  }
  if (sources.length < 2) return null;

  const series = [];
  for (const row of rows) {
    const name = String(row[0] ?? "").trim();
    if (!name) continue;
    const values = sources.map((column) => toNumber(row[column]));
    if (values.filter((value) => value !== null).length < 2) continue;
    series.push({ name, values });
  }
  if (!series.length) return null;

  const shown = series.slice(0, MAX_SERIES);
  return {
    labels: sources.map((column) => headers[column]),
    series: shown,
    omitted: Math.max(0, series.length - MAX_SERIES),
    kind: "bar",
    // One parameter is one panel, so a shared scale is honest. Several
    // parameters of different magnitudes must not share an axis.
    shareScale: shown.length === 1,
  };
}

/** Fraction of the shared plot height a series would occupy. */
const SQUASH_FLOOR = 0.15;

/**
 * Can these series share one y-axis honestly?
 *
 * Chlorophyll at 0.2 to 1.0 and sea temperature at 28.6 to 29.4 technically
 * fit on one axis: chlorophyll becomes a flat line along the bottom and SST a
 * flat line along the top, and the reader learns nothing except that one
 * number is bigger than the other. The usual fix is a second y-axis, which is
 * worse - it lets the author put any two lines anywhere relative to each other
 * and invites a crossing that means nothing.
 *
 * So: if any series would be squashed into less than a sixth of the plot, the
 * caller draws small multiples instead - one panel per series, each with its
 * own scale, sharing the x-axis. Same comparison, no false equivalence.
 */
export function sharesOneScale(series) {
  if (series.length < 2) return true;
  const all = series.flatMap((s) => s.values).filter((v) => v !== null);
  if (!all.length) return true;
  const globalSpan = Math.max(...all) - Math.min(...all);
  if (globalSpan === 0) return true;
  return series.every((s) => {
    const values = s.values.filter((v) => v !== null);
    if (!values.length) return true;
    const span = Math.max(...values) - Math.min(...values);
    return span / globalSpan >= SQUASH_FLOOR;
  });
}

/* ------------------------------------------------------------------ */
/* Scale                                                               */
/* ------------------------------------------------------------------ */

/** Round tick values covering [min, max]. */
export function niceTicks(min, max) {
  if (min === max) {
    const pad = Math.abs(min) * 0.1 || 1;
    return [min - pad, min, min + pad];
  }
  const span = max - min;
  const raw = span / 3;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) || raw;
  if (!Number.isFinite(step) || step <= 0) return [min, max];

  // Run until the last tick is at or above the maximum. The old condition
  // stopped half a step early, so a series peaking at 1.033 got an axis
  // topping out at 1.0 and its highest point was drawn outside the plot.
  const start = Math.floor(min / step) * step;
  const out = [];
  for (let value = start; out.length < 24; value += step) {
    // Floating point leaves 28.999999999999996 where 29 belongs, and that
    // renders on an axis exactly as badly as it reads.
    out.push(Number(value.toPrecision(12)));
    if (value >= max) break;
  }
  return out;
}

export function formatValue(value) {
  const magnitude = Math.abs(value);
  if (magnitude >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (magnitude >= 10) return value.toFixed(1);
  if (magnitude >= 1) return value.toFixed(2);
  return value.toFixed(3);
}
