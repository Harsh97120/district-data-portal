"use client";

import React, { useMemo } from "react";
import { marked, type Tokens } from "marked";

export interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Preprocesses markdown text to ensure pseudo-tables with pipe separators
 * (e.g., INDICATOR | AHMEDABAD | GURUGRAM) that may lack explicit delimiter rows
 * are properly parsed as standard GFM tables.
 */
function normalizeMarkdown(raw: string): string {
  if (!raw) return "";

  const lines = raw.split("\n");
  const normalized: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    normalized.push(line);

    // Detect if this line looks like a table header (contains pipes, no --- separator)
    const trimmed = line.trim();
    if (trimmed.includes("|") && !trimmed.includes("---")) {
      const nextLine = lines[i + 1]?.trim();
      // If next line exists, has pipes, but is NOT already a separator row
      if (nextLine && nextLine.includes("|") && !nextLine.includes("---")) {
        // Calculate number of columns
        const parts = trimmed.split("|").filter((seg, idx, arr) => {
          if ((idx === 0 || idx === arr.length - 1) && !seg.trim()) return false;
          return true;
        });
        if (parts.length >= 2) {
          // Insert a markdown separator line
          const separator = "| " + parts.map(() => "---").join(" | ") + " |";
          normalized.push(separator);
        }
      }
    }
  }

  return normalized.join("\n");
}

/**
 * Recursively renders inline markdown tokens into styled React elements
 */
function renderInlineToken(token: Tokens.Generic | Tokens.Text | Tokens.Strong | Tokens.Em | Tokens.Codespan | Tokens.Link | Tokens.Del | Tokens.Br, key: string | number): React.ReactNode {
  switch (token.type) {
    case "strong":
      return (
        <strong key={key} className="font-bold text-white tracking-wide">
          {token.tokens ? token.tokens.map((sub: Tokens.Generic, i: number) => renderInlineToken(sub, `${key}-${i}`)) : token.text}
        </strong>
      );

    case "em":
      return (
        <em key={key} className="italic text-gray-200">
          {token.tokens ? token.tokens.map((sub: Tokens.Generic, i: number) => renderInlineToken(sub, `${key}-${i}`)) : token.text}
        </em>
      );

    case "codespan":
      return (
        <code
          key={key}
          className="px-1.5 py-0.5 rounded bg-[#0F1117] border border-[#2D3148] font-mono text-[11px] text-orange-300 font-semibold inline-block"
        >
          {token.text}
        </code>
      );

    case "link":
      return (
        <a
          key={key}
          href={token.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-orange-400 hover:text-orange-300 underline underline-offset-2 transition-colors font-medium"
        >
          {token.tokens ? token.tokens.map((sub: Tokens.Generic, i: number) => renderInlineToken(sub, `${key}-${i}`)) : token.text}
        </a>
      );

    case "del":
      return (
        <del key={key} className="line-through text-gray-400">
          {token.tokens ? token.tokens.map((sub: Tokens.Generic, i: number) => renderInlineToken(sub, `${key}-${i}`)) : token.text}
        </del>
      );

    case "br":
      return <br key={key} />;

    case "text":
    default: {
      const anyTok = token as Tokens.Generic;
      if (anyTok.tokens && anyTok.tokens.length > 0) {
        return (
          <React.Fragment key={key}>
            {anyTok.tokens.map((sub: Tokens.Generic, i: number) => renderInlineToken(sub, `${key}-${i}`))}
          </React.Fragment>
        );
      }
      return <React.Fragment key={key}>{anyTok.text || ""}</React.Fragment>;
    }
  }
}

/**
 * Renders block-level markdown tokens (tables, lists, headings, paragraphs, code blocks)
 */
function renderBlockToken(token: Tokens.Generic, key: string | number): React.ReactNode {
  switch (token.type) {
    case "heading": {
      const headingContent = token.tokens
        ? token.tokens.map((sub: Tokens.Generic, i: number) => renderInlineToken(sub, `${key}-${i}`))
        : token.text;

      switch (token.depth) {
        case 1:
          return (
            <h1 key={key} className="text-base font-extrabold text-white mt-3.5 mb-2 border-b border-[#2D3148] pb-1.5">
              {headingContent}
            </h1>
          );
        case 2:
          return (
            <h2 key={key} className="text-sm font-bold text-orange-400 mt-3 mb-1.5 flex items-center gap-1.5">
              <span className="text-orange-400 text-xs font-black">✦</span>
              <span>{headingContent}</span>
            </h2>
          );
        case 3:
          return (
            <h3 key={key} className="text-xs font-bold text-white uppercase tracking-wider mt-2.5 mb-1 text-gray-200">
              {headingContent}
            </h3>
          );
        default:
          return (
            <h4 key={key} className="text-xs font-semibold text-gray-300 mt-2 mb-1">
              {headingContent}
            </h4>
          );
      }
    }

    case "paragraph":
      return (
        <p key={key} className="text-gray-200 leading-relaxed my-1.5 text-xs">
          {token.tokens ? token.tokens.map((sub: Tokens.Generic, i: number) => renderInlineToken(sub, `${key}-${i}`)) : token.text}
        </p>
      );

    case "list": {
      const ListTag = token.ordered ? "ol" : "ul";
      const listClass = token.ordered
        ? "list-decimal list-outside pl-4 space-y-1.5 my-2 text-xs text-gray-200"
        : "list-disc list-outside pl-4 space-y-1.5 my-2 text-xs text-gray-200";

      return (
        <ListTag key={key} className={listClass}>
          {token.items?.map((item: Tokens.ListItem, i: number) => (
            <li key={`${key}-${i}`} className="leading-relaxed">
              {item.tokens
                ? item.tokens.map((sub: Tokens.Generic, j: number) => {
                    if (sub.type === "text") {
                      return sub.tokens
                        ? sub.tokens.map((nested: Tokens.Generic, k: number) =>
                            renderInlineToken(nested, `${key}-${i}-${j}-${k}`)
                          )
                        : sub.text;
                    }
                    return renderBlockToken(sub, `${key}-${i}-${j}`);
                  })
                : item.text}
            </li>
          ))}
        </ListTag>
      );
    }

    case "table": {
      const tableToken = token as Tokens.Table;
      return (
        <div
          key={key}
          className="overflow-x-auto rounded-xl border border-[#2D3148] my-2.5 max-w-full shadow-md bg-[#0F1117]/80"
        >
          <table className="w-full text-left text-[11px] divide-y divide-[#2D3148]">
            <thead className="bg-[#141722] text-gray-300 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                {tableToken.header?.map((col, cIdx) => (
                  <th
                    key={cIdx}
                    className="p-2.5 whitespace-nowrap text-gray-200 font-semibold"
                    style={{ textAlign: tableToken.align[cIdx] || "left" }}
                  >
                    {col.tokens
                      ? col.tokens.map((sub, i) => renderInlineToken(sub, `${key}-h-${cIdx}-${i}`))
                      : col.text}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2D3148]/60 bg-[#0F1117]/40">
              {tableToken.rows?.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-[#242838]/40 transition-colors">
                  {row.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      className="p-2.5 text-gray-200 tabular-nums"
                      style={{ textAlign: tableToken.align[cIdx] || "left" }}
                    >
                      {cell.tokens
                        ? cell.tokens.map((sub, i) => renderInlineToken(sub, `${key}-r-${rIdx}-${cIdx}-${i}`))
                        : cell.text}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case "blockquote":
      return (
        <blockquote
          key={key}
          className="border-l-2 border-orange-500/80 pl-3 py-1.5 my-2 text-gray-300 italic text-xs bg-orange-500/5 rounded-r-lg"
        >
          {token.tokens
            ? token.tokens.map((sub: Tokens.Generic, i: number) => renderBlockToken(sub, `${key}-${i}`))
            : token.text}
        </blockquote>
      );

    case "code":
      return (
        <div key={key} className="my-2 rounded-xl overflow-hidden border border-[#2D3148] bg-[#0F1117]">
          {token.lang && (
            <div className="px-3 py-1 bg-[#141722] border-b border-[#2D3148] text-[9.5px] font-mono text-gray-400 uppercase tracking-widest">
              {token.lang}
            </div>
          )}
          <pre className="overflow-x-auto p-3 font-mono text-[11px] text-orange-200/90 leading-relaxed">
            <code>{token.text}</code>
          </pre>
        </div>
      );

    case "hr":
      return <hr key={key} className="my-3 border-[#2D3148]" />;

    case "space":
      return null;

    default:
      if (token.tokens && token.tokens.length > 0) {
        return (
          <div key={key} className="my-1">
            {token.tokens.map((sub: Tokens.Generic, i: number) => renderBlockToken(sub, `${key}-${i}`))}
          </div>
        );
      }
      return token.text ? (
        <p key={key} className="text-gray-200 leading-relaxed my-1 text-xs">
          {token.text}
        </p>
      ) : null;
  }
}

/**
 * Production-ready MarkdownRenderer component:
 * Parses Markdown using marked lexer and outputs styled, responsive, accessible React elements.
 */
export default function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  const tokens = useMemo(() => {
    if (!content) return [];
    try {
      const normalized = normalizeMarkdown(content);
      return marked.lexer(normalized, { gfm: true, breaks: true });
    } catch (e) {
      console.error("Markdown parsing error:", e);
      return [];
    }
  }, [content]);

  if (!content) return null;

  if (tokens.length === 0) {
    return <p className={`text-gray-200 leading-relaxed text-xs ${className}`}>{content}</p>;
  }

  return (
    <div className={`markdown-content space-y-1 ${className}`}>
      {tokens.map((token, idx) => renderBlockToken(token as Tokens.Generic, idx))}
    </div>
  );
}
