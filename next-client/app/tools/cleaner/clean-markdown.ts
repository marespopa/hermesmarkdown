import { parseTable } from "@/app/editor/utils/tableParser";
import { serializeTable } from "@/app/editor/utils/tableSerializer";
import { FixCounter, type FixId } from "./cleaner-fixes";
import { ListNesting } from "./list-nesting";
import {
  cleanInlineHtml,
  fixHeading,
  isBlank,
  isFenceClose,
  isRule,
  isTableSeparator,
  parseFenceOpen,
  parseListItem,
  setextLevel,
  splitIndent,
  type Fence,
} from "./markdown-lines";

// The Markdown Cleaner's lint-and-fix pass: one walk over the lines that
// normalizes headings, lists, rules, tables, blank lines and stray HTML
// styling into plain CommonMark/GFM, counting every fix. Front matter,
// fenced and indented code, and inline code spans are left byte for byte.
// Running it on its own output changes nothing.

export interface CleanResult {
  markdown: string;
  fixes: { id: FixId; count: number }[];
}

const INVISIBLE = /[ ​﻿⁠]/g;

// The output lines, with blank lines decided as blocks arrive: a source
// blank line becomes at most one, and some blocks ask for one around them.
class Output {
  lines: string[] = [];
  private pendingBlank = false;
  private blankAfter = false;

  constructor(private fixes: FixCounter) {}

  blank() {
    if (!this.lines.length || this.pendingBlank) this.fixes.add("blank-lines");
    this.pendingBlank = true;
  }

  push(line: string, blankBefore = false) {
    if (this.lines.length && (this.pendingBlank || blankBefore || this.blankAfter)) {
      if (!this.pendingBlank) this.fixes.add("blank-lines");
      this.lines.push("");
    }
    this.lines.push(line);
    this.pendingBlank = false;
    this.blankAfter = false;
  }

  // Code and front matter: kept as written, only preceded by a blank line
  // that was in the source.
  raw(line: string) {
    if (this.lines.length && this.pendingBlank) this.lines.push("");
    this.lines.push(line);
    this.pendingBlank = false;
  }

  endBlock() {
    this.blankAfter = true;
  }

  get last(): string {
    return this.lines[this.lines.length - 1] ?? "";
  }

  replaceLast(line: string) {
    this.lines[this.lines.length - 1] = line;
  }
}

// Moves a code line by `shift` columns (removing only leading spaces).
function shiftLine(line: string, shift: number): string {
  if (shift > 0) return " ".repeat(shift) + line;
  if (shift < 0) return line.replace(new RegExp(`^ {0,${-shift}}`), "");
  return line;
}

// Per-line cleanup outside code: invisible characters, styling HTML and
// trailing whitespace (a hard break before more text keeps two spaces).
function cleanText(rest: string, next: string | undefined, fixes: FixCounter): string {
  let line = rest;
  const html = cleanInlineHtml(line);
  line = html.line;
  fixes.add("inline-html", html.count);
  const trimmed = line.replace(/[ \t]+$/, "");
  if (trimmed !== line) {
    const hardBreak = / {2,}$/.test(line) && next !== undefined && !isBlank(next);
    const fixed = hardBreak ? `${trimmed}  ` : trimmed;
    if (fixed !== line) fixes.add("trailing-space");
    line = fixed;
  }
  return line;
}

export function cleanMarkdown(input: string): CleanResult {
  const fixes = new FixCounter();
  const endings = input.match(/\r\n?/g)?.length ?? 0;
  fixes.add("line-endings", endings);
  const lines = input.replace(/\r\n?/g, "\n").split("\n");
  const out = new Output(fixes);
  const list = new ListNesting();
  let fence: (Fence & { shift: number }) | null = null;
  let indentedCode = false;
  // What the previous source line was, and how many lines the current
  // paragraph has (a setext heading must be a single line to convert).
  let prev: "blank" | "text" | "item" | "block" = "blank";
  let paragraphLines = 0;
  let i = 0;

  // YAML front matter.
  if (lines[0] === "---") {
    const end = lines.findIndex((line, k) => k > 0 && (line === "---" || line === "..."));
    if (end > 0) {
      for (; i <= end; i++) out.raw(lines[i]);
      out.endBlock();
      prev = "block";
    }
  }

  for (; i < lines.length; i++) {
    const source = lines[i];
    if (fence) {
      const closes = isFenceClose(source, fence);
      out.raw(shiftLine(source, fence.shift));
      if (closes) {
        fence = null;
        if (!list.active) out.endBlock();
        prev = "block";
      }
      continue;
    }

    if (isBlank(source)) {
      if (source.length) fixes.add("trailing-space");
      out.blank();
      prev = "blank";
      paragraphLines = 0;
      continue;
    }

    const invisible = source.match(INVISIBLE)?.length ?? 0;
    const visible = source.replace(/^﻿/, "").replace(/ /g, " ").replace(/[​﻿⁠]/g, "");
    const { indent, rest: rawRest } = splitIndent(visible);

    if (indentedCode && indent >= 4) {
      out.raw(source);
      continue;
    }
    indentedCode = false;
    if (indent >= 4 && prev === "blank" && !list.active) {
      indentedCode = true;
      out.raw(source);
      prev = "block";
      continue;
    }

    fixes.add("invisible", invisible);
    const rest = cleanText(rawRest, lines[i + 1], fixes);
    const base = list.baseIndent;
    const insideItem = base !== null && indent > base;
    // A block at the list's own level after a blank line ends the list.
    if (list.active && !insideItem && prev === "blank" && !parseListItem(rest)) list.clear();

    // Fenced code: inside an item it moves with the item.
    const open = parseFenceOpen(rest, indent);
    if (open && (indent <= 3 || insideItem)) {
      let target = 0;
      if (insideItem) {
        target = list.continuation(indent);
        if (target !== indent) fixes.add("list-indent");
        out.push(" ".repeat(target) + rest);
      } else {
        list.clear();
        out.push(rest, true);
      }
      fence = { ...open, shift: target - indent };
      prev = "block";
      paragraphLines = 0;
      continue;
    }

    if (indent <= 3 && !insideItem) {
      // `Title` over `===` / `---`.
      const level = setextLevel(rest);
      if (level && prev === "text" && !list.active) {
        if (paragraphLines === 1 && !/^[>|<]/.test(out.last)) {
          out.replaceLast(`${"#".repeat(level)} ${out.last.trim()}`);
          fixes.add("setext");
        } else {
          out.push(rest);
        }
        out.endBlock();
        prev = "block";
        paragraphLines = 0;
        continue;
      }

      if (isRule(rest)) {
        list.clear();
        if (rest !== "---" || indent) fixes.add("rule");
        out.push("---", true);
        out.endBlock();
        prev = "block";
        continue;
      }

      const heading = rest.startsWith("#") ? fixHeading(rest) : null;
      if (heading !== null) {
        list.clear();
        if (heading !== rest || indent) fixes.add("heading");
        out.push(heading, true);
        out.endBlock();
        prev = "block";
        paragraphLines = 0;
        continue;
      }
    }

    const item = parseListItem(rest);
    // Only `1.` may start a numbered list right after a paragraph line
    // ("2019. A year" stays text), as in CommonMark.
    const lazyNumber =
      !!item && prev === "text" && !list.active && /^\d/.test(item.sourceMarker) && !/^1[.)]$/.test(item.sourceMarker);
    if (item && (indent <= 3 || list.active) && !lazyNumber) {
      const startsList = !list.active;
      const origContent = indent + item.sourceMarker.length + item.gap;
      const target = list.place(indent, origContent, item.marker);
      if (item.marker !== item.sourceMarker) fixes.add("list-marker");
      if (target !== indent || /^\s*\t/.test(source) || (item.content && item.gap !== 1)) fixes.add("list-indent");
      out.push(" ".repeat(target) + item.marker + (item.content ? ` ${item.content}` : ""), startsList && prev === "text");
      prev = "item";
      paragraphLines = 0;
      continue;
    }

    // A GFM table: re-aligned.
    if (indent <= 3 && !insideItem && rest.includes("|") && isTableSeparator(lines[i + 1] ?? "")) {
      let end = i;
      while (end < lines.length && !isBlank(lines[end]) && lines[end].includes("|")) end++;
      const block = [rest, ...lines.slice(i + 1, end).map((line) => cleanText(line.trim(), undefined, fixes))];
      const data = parseTable(block.join("\n"));
      if (data) {
        list.clear();
        const table = serializeTable(data).split("\n");
        if (table.join("\n") !== block.join("\n")) fixes.add("table");
        table.forEach((line, k) => out.push(line, k === 0));
        out.endBlock();
        i = end - 1;
        prev = "block";
        continue;
      }
    }

    // Text: a paragraph, quote or HTML line, or a line inside a list item.
    if (insideItem) {
      const target = list.continuation(indent);
      if (target !== indent) fixes.add("list-indent");
      out.push(" ".repeat(target) + rest);
    } else {
      out.push(rest);
    }
    paragraphLines = prev === "text" ? paragraphLines + 1 : 1;
    prev = "text";
  }

  if (fence) {
    out.raw(" ".repeat(Math.max(0, fence.indent + fence.shift)) + fence.char.repeat(fence.length));
    fixes.add("fence");
  }

  const markdown = out.lines.length ? `${out.lines.join("\n")}\n` : "";
  return { markdown, fixes: fixes.list() };
}
