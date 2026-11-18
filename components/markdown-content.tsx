"use client";

import React, { type ReactNode } from "react";

import { cn } from "@/lib/utils";

function isSafeLinkUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl.trim());
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

const INLINE_TOKEN_REGEX =
  /(\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*)/g;

export function renderInlineMarkdown(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let tokenIndex = 0;

  for (const match of text.matchAll(INLINE_TOKEN_REGEX)) {
    const matchStart = match.index ?? 0;
    if (matchStart > lastIndex) {
      nodes.push(text.slice(lastIndex, matchStart));
    }

    const fullMatch = match[0];
    const linkLabel = match[2];
    const linkUrl = match[3];
    const boldText = match[4];
    const codeText = match[5];
    const italicText = match[6];
    const key = `${keyPrefix}-tok-${tokenIndex++}`;

    if (linkLabel !== undefined && linkUrl !== undefined) {
      if (isSafeLinkUrl(linkUrl)) {
        nodes.push(
          <a
            key={key}
            href={linkUrl.trim()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 underline decoration-emerald-500/40 underline-offset-2 hover:text-emerald-300 transition-colors"
          >
            {linkLabel}
          </a>
        );
      } else {
        nodes.push(linkLabel);
      }
    } else if (boldText !== undefined) {
      nodes.push(
        <strong key={key} className="font-semibold text-zinc-50">
          {boldText}
        </strong>
      );
    } else if (codeText !== undefined) {
      nodes.push(
        <code
          key={key}
          className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.88em] text-emerald-300"
        >
          {codeText}
        </code>
      );
    } else if (italicText !== undefined) {
      nodes.push(
        <em key={key} className="italic text-zinc-100">
          {italicText}
        </em>
      );
    } else {
      nodes.push(fullMatch);
    }

    lastIndex = matchStart + fullMatch.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

type MarkdownBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "hr" }
  | { type: "blockquote"; lines: string[] }
  | { type: "ol"; items: string[][] }
  | { type: "ul"; items: string[][] }
  | { type: "paragraph"; lines: string[] };

const HEADING_REGEX = /^(#{1,4})\s+(.+)$/;
const HR_REGEX = /^(?:---+|\*\*\*+|___+)\s*$/;
const ORDERED_ITEM_REGEX = /^\s*\d+\.\s+(.*)$/;
const UNORDERED_ITEM_REGEX = /^\s*[-*•]\s+(.*)$/;
const BLOCKQUOTE_REGEX = /^>\s?(.*)$/;

function parseMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    const headingMatch = trimmed.match(HEADING_REGEX);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      });
      i++;
      continue;
    }

    if (HR_REGEX.test(trimmed)) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    if (BLOCKQUOTE_REGEX.test(trimmed)) {
      const quoteLines: string[] = [];
      while (i < lines.length) {
        const match = lines[i].trim().match(BLOCKQUOTE_REGEX);
        if (!match) break;
        quoteLines.push(match[1]);
        i++;
      }
      blocks.push({ type: "blockquote", lines: quoteLines });
      continue;
    }

    if (ORDERED_ITEM_REGEX.test(line)) {
      const items: string[][] = [];
      while (i < lines.length) {
        const curLine = lines[i];
        const itemMatch = curLine.match(ORDERED_ITEM_REGEX);
        if (itemMatch) {
          items.push([itemMatch[1].trim()]);
          i++;
          continue;
        }
        if (
          items.length > 0 &&
          curLine.trim().length > 0 &&
          /^\s{2,}/.test(curLine) &&
          !HEADING_REGEX.test(curLine.trim()) &&
          !UNORDERED_ITEM_REGEX.test(curLine)
        ) {
          items[items.length - 1].push(curLine.trim());
          i++;
          continue;
        }
        // Allow single blank line between numbered list items when next line continues the list
        if (
          curLine.trim().length === 0 &&
          i + 1 < lines.length &&
          ORDERED_ITEM_REGEX.test(lines[i + 1])
        ) {
          i++;
          continue;
        }
        break;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    if (UNORDERED_ITEM_REGEX.test(line)) {
      const items: string[][] = [];
      while (i < lines.length) {
        const curLine = lines[i];
        const itemMatch = curLine.match(UNORDERED_ITEM_REGEX);
        if (itemMatch) {
          items.push([itemMatch[1].trim()]);
          i++;
          continue;
        }
        if (
          items.length > 0 &&
          curLine.trim().length > 0 &&
          /^\s{2,}/.test(curLine) &&
          !HEADING_REGEX.test(curLine.trim()) &&
          !ORDERED_ITEM_REGEX.test(curLine)
        ) {
          items[items.length - 1].push(curLine.trim());
          i++;
          continue;
        }
        if (
          curLine.trim().length === 0 &&
          i + 1 < lines.length &&
          UNORDERED_ITEM_REGEX.test(lines[i + 1])
        ) {
          i++;
          continue;
        }
        break;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    const paragraphLines: string[] = [];
    while (i < lines.length) {
      const curLine = lines[i];
      const curTrimmed = curLine.trim();
      if (
        !curTrimmed ||
        HEADING_REGEX.test(curTrimmed) ||
        HR_REGEX.test(curTrimmed) ||
        BLOCKQUOTE_REGEX.test(curTrimmed) ||
        ORDERED_ITEM_REGEX.test(curLine) ||
        UNORDERED_ITEM_REGEX.test(curLine)
      ) {
        break;
      }
      paragraphLines.push(curTrimmed);
      i++;
    }
    if (paragraphLines.length > 0) {
      blocks.push({ type: "paragraph", lines: paragraphLines });
    }
  }

  return blocks;
}

export interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  const blocks = parseMarkdownBlocks(content);

  return (
    <div className={cn("space-y-3 text-xs sm:text-sm text-zinc-200 leading-relaxed", className)}>
      {blocks.map((block, blockIndex) => {
        const key = `md-block-${blockIndex}`;

        if (block.type === "heading") {
          const headingClasses =
            block.level === 1
              ? "text-base sm:text-lg font-bold text-white tracking-tight pt-1"
              : block.level === 2
              ? "text-sm sm:text-base font-semibold text-white tracking-tight pt-1"
              : "text-xs sm:text-sm font-semibold text-emerald-300 tracking-tight pt-1";

          if (block.level === 1) {
            return (
              <h1 key={key} className={headingClasses}>
                {renderInlineMarkdown(block.text, key)}
              </h1>
            );
          }
          if (block.level === 2) {
            return (
              <h2 key={key} className={headingClasses}>
                {renderInlineMarkdown(block.text, key)}
              </h2>
            );
          }
          if (block.level === 3) {
            return (
              <h3 key={key} className={headingClasses}>
                {renderInlineMarkdown(block.text, key)}
              </h3>
            );
          }
          return (
            <h4 key={key} className={headingClasses}>
              {renderInlineMarkdown(block.text, key)}
            </h4>
          );
        }

        if (block.type === "hr") {
          return <hr key={key} className="border-white/10 my-2" />;
        }

        if (block.type === "blockquote") {
          return (
            <blockquote
              key={key}
              className="border-l-2 border-emerald-500/40 bg-emerald-500/5 pl-3 py-1.5 rounded-r-lg text-zinc-300"
            >
              {block.lines.map((line, lineIdx) => (
                <p key={`${key}-q-${lineIdx}`}>
                  {renderInlineMarkdown(line, `${key}-q-${lineIdx}`)}
                </p>
              ))}
            </blockquote>
          );
        }

        if (block.type === "ol") {
          return (
            <ol key={key} className="list-decimal pl-5 space-y-2.5 marker:text-emerald-400 marker:font-semibold">
              {block.items.map((itemLines, itemIdx) => (
                <li key={`${key}-li-${itemIdx}`} className="pl-1 space-y-1">
                  {itemLines.map((line, lineIdx) => (
                    <p key={`${key}-li-${itemIdx}-p-${lineIdx}`}>
                      {renderInlineMarkdown(line, `${key}-li-${itemIdx}-p-${lineIdx}`)}
                    </p>
                  ))}
                </li>
              ))}
            </ol>
          );
        }

        if (block.type === "ul") {
          return (
            <ul key={key} className="list-disc pl-5 space-y-1.5 marker:text-emerald-400">
              {block.items.map((itemLines, itemIdx) => (
                <li key={`${key}-li-${itemIdx}`} className="pl-1 space-y-1">
                  {itemLines.map((line, lineIdx) => (
                    <p key={`${key}-li-${itemIdx}-p-${lineIdx}`}>
                      {renderInlineMarkdown(line, `${key}-li-${itemIdx}-p-${lineIdx}`)}
                    </p>
                  ))}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={key}>
            {block.lines.map((line, lineIdx) => (
              <React.Fragment key={`${key}-l-${lineIdx}`}>
                {lineIdx > 0 && <br />}
                {renderInlineMarkdown(line, `${key}-l-${lineIdx}`)}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
