"use client";

/**
 * Renders an agent answer as structured content.
 *
 * The console used to render answers with a hand-rolled pass that knew about
 * paragraphs, bullets and bold, and NOTHING about tables - so a research answer
 * containing a comparison table arrived on screen as a wall of pipe characters.
 * That is what "research mode gives raw markdown" was.
 *
 * It also fed model output through dangerouslySetInnerHTML after a single
 * regex. Everything here is built as React elements instead: text is text, and
 * a stray angle bracket in an answer is a stray angle bracket, not markup.
 *
 * The subset is what the agent actually emits under the research voice:
 * headings, tables, ordered and unordered lists, fenced code, block quotes,
 * horizontal rules, and inline bold, italic, code and links. Anything else
 * falls through as plain text, which is the safe direction to fail in.
 */

import * as React from "react";
import {
  chartFromTable,
  firstInline,
  isNumericColumn,
  parseBlocks,
} from "@/lib/markdown";
import { DataChart } from "@/components/research/data-chart";

/* ------------------------------------------------------------------ */
/* Inline                                                              */
/* ------------------------------------------------------------------ */

function renderInline(text, keyPrefix = "i") {
  const source = String(text ?? "");
  if (!source) return null;

  const earliest = firstInline(source);
  if (!earliest) return source;

  const { rule, match } = earliest;
  const before = source.slice(0, match.index);
  const after = source.slice(match.index + match[0].length);
  const key = `${keyPrefix}-${match.index}`;

  let element;
  if (rule.kind === "code") {
    element = (
      <code key={key} className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[0.85em] text-zinc-800">
        {match[1]}
      </code>
    );
  } else if (rule.kind === "link") {
    element = (
      <a
        key={key}
        href={match[2]}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-700 underline underline-offset-2 hover:text-blue-900"
      >
        {match[1]}
      </a>
    );
  } else if (rule.kind === "bold") {
    element = <strong key={key} className="font-semibold text-zinc-950">{match[1]}</strong>;
  } else {
    element = <em key={key}>{match[1]}</em>;
  }

  return (
    <>
      {before}
      {element}
      {renderInline(after, `${key}-r`)}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Blocks                                                              */
/* ------------------------------------------------------------------ */

const HEADING_CLASS = {
  1: "text-base font-semibold text-zinc-950 mt-4 mb-1.5",
  2: "text-sm font-semibold text-zinc-950 mt-4 mb-1.5",
  3: "text-sm font-semibold text-zinc-800 mt-3 mb-1",
  4: "text-xs font-semibold uppercase tracking-wide text-zinc-500 mt-3 mb-1",
};

export function MarkdownAnswer({ text, allowCharts = false }) {
  const blocks = React.useMemo(() => parseBlocks(text), [text]);

  return (
    <div className="text-xs sm:text-sm leading-relaxed text-zinc-800">
      {blocks.map((block, index) => {
        const key = `b-${index}`;

        if (block.type === "heading") {
          const Tag = `h${Math.min(block.level + 2, 6)}`;
          return (
            <Tag key={key} className={HEADING_CLASS[block.level] || HEADING_CLASS[4]}>
              {renderInline(block.text, key)}
            </Tag>
          );
        }

        if (block.type === "table") {
          const numeric = block.header.map((_, column) =>
            isNumericColumn(block.rows, column)
          );
          const chart = allowCharts ? chartFromTable(block.header, block.rows) : null;
          return (
            <div key={key} className="my-3">
              {/* Wide tables scroll inside their own box; the message column
                  must never scroll sideways. */}
              <div className="overflow-x-auto rounded-xl border border-zinc-200">
                <table className="w-full border-collapse text-[11px] sm:text-xs">
                  <thead>
                    <tr className="bg-zinc-50">
                      {block.header.map((cell, column) => (
                        <th
                          key={column}
                          scope="col"
                          className={`whitespace-nowrap border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-700 ${
                            numeric[column] ? "text-right" : "text-left"
                          }`}
                        >
                          {renderInline(cell, `${key}-h${column}`)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-b border-zinc-100 last:border-0">
                        {block.header.map((_, column) => (
                          <td
                            key={column}
                            className={`px-3 py-1.5 align-top text-zinc-800 ${
                              numeric[column] ? "text-right tabular-nums" : "text-left"
                            }`}
                          >
                            {renderInline(row[column] ?? "", `${key}-${rowIndex}-${column}`)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {chart && <DataChart chart={chart} caption={block.header.join(", ")} />}
            </div>
          );
        }

        if (block.type === "ul") {
          return (
            <ul key={key} className="my-2 list-disc space-y-1 pl-5">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInline(item, `${key}-${itemIndex}`)}</li>
              ))}
            </ul>
          );
        }

        if (block.type === "ol") {
          return (
            <ol key={key} className="my-2 list-decimal space-y-1 pl-5">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInline(item, `${key}-${itemIndex}`)}</li>
              ))}
            </ol>
          );
        }

        if (block.type === "code") {
          return (
            <pre
              key={key}
              className="my-2 overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-50 p-3 font-mono text-[11px] text-zinc-800"
            >
              <code>{block.body}</code>
            </pre>
          );
        }

        if (block.type === "quote") {
          return (
            <blockquote
              key={key}
              className="my-2 border-l-2 border-zinc-300 pl-3 text-zinc-600"
            >
              {renderInline(block.text, key)}
            </blockquote>
          );
        }

        if (block.type === "rule") {
          return <hr key={key} className="my-3 border-zinc-200" />;
        }

        return (
          <p key={key} className="mb-2.5">
            {renderInline(block.text, key)}
          </p>
        );
      })}
    </div>
  );
}
