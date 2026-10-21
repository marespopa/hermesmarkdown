// A note's Markdown as print-ready HTML, for Export as PDF. Parsed with the
// same Lezer Markdown (GFM) parser the editor uses, so what prints matches
// what the editor recognises. Pure and synchronous: Mermaid diagrams and
// display math come back as placeholders (`<div data-render="N">`) with
// their sources in `blocks`, for the caller to render and swap in.
//
// Everything is HTML-escaped; the only markup is what this file emits. Raw
// HTML in the note is dropped (comments, such as the rollup markers, too),
// frontmatter is left out, wikilinks print as their text, folded callouts
// print expanded, and links only keep web and mail URLs. The one raw HTML
// that prints is `<details><summary>` sections: they come out as `<details>`
// (open as the note has them, all open with `openDetails`). A top-level line
// that is exactly the page-break marker becomes `<div class="page-break">`.

import { markdownLanguage } from "@codemirror/lang-markdown";
import type { SyntaxNode } from "@lezer/common";
import { FM_REGEX } from "../frontmatter-utils";
import { findDetailsBlocks, outermostDetailsBlocks } from "../details-blocks";

export type PrintBlockKind = "mermaid" | "math";

export interface PrintBlock {
  kind: PrintBlockKind;
  source: string;
}

export interface NoteHtml {
  html: string;
  // The first H1's text, or null when there is none.
  title: string | null;
  blocks: PrintBlock[];
}

export interface NoteHtmlOptions {
  // An image's `src` as written in the note → a URL to print it from, or
  // null to print its alt text instead. Defaults to keeping web URLs only.
  imageSrc?: (src: string) => string | null;
  // A line that starts a new page (`<!-- pagebreak -->`, `---`, …); none by default.
  pageBreak?: string;
  // Print every `<details>` section open, whatever the note says.
  openDetails?: boolean;
}

export const PAGE_BREAK_HTML = '<div class="page-break"></div>';

// Wikilinks become `WIKI_OPEN label WIKI_CLOSE` before parsing (private-use
// characters, so the parser sees plain text) and a span after escaping.
const WIKI_OPEN = "";
const WIKI_CLOSE = "";
const REGEX_WIKILINK = /!?\[\[([^\]|\n]+)(?:\|([^\]\n]+))?\]\]/g;
const REGEX_WIKI_MARKS = new RegExp(`${WIKI_OPEN}([^${WIKI_CLOSE}]*)${WIKI_CLOSE}`, "g");
const REGEX_CALLOUT = /^\[!([\w-]+)\][+-]?[ \t]*(.*)$/;
const MERMAID_INFO = new Set(["mermaid"]);
const MATH_INFO = new Set(["math", "latex", "tex", "katex"]);

export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const webUrl = (url: string) => (/^(https?:|mailto:)/i.test(url) ? url : null);

interface Context {
  src: string;
  imageSrc: (src: string) => string | null;
  blocks: PrintBlock[];
  pageBreak?: string;
  openDetails?: boolean;
}

const text = (ctx: Context, from: number, to: number) => ctx.src.slice(from, to);

// Escaped text, with wikilink marks turned into spans.
function plain(value: string): string {
  return escapeHtml(value).replace(REGEX_WIKI_MARKS, '<span class="wikilink">$1</span>');
}

const children = (node: SyntaxNode): SyntaxNode[] => {
  const out: SyntaxNode[] = [];
  for (let child = node.firstChild; child; child = child.nextSibling) out.push(child);
  return out;
};

// The inline content of `node` between `from` and `to`: text runs between
// child nodes are plain text, children are formatted.
function inline(ctx: Context, node: SyntaxNode, from = node.from, to = node.to): string {
  let out = "";
  let pos = from;
  for (const child of children(node)) {
    if (child.to <= from || child.from >= to) continue;
    if (child.from > pos) out += plain(text(ctx, pos, child.from));
    out += inlineNode(ctx, child);
    pos = child.to;
    // A blockquote line's `>` is followed by one optional space.
    if (child.name === "QuoteMark" && ctx.src[pos] === " ") pos++;
  }
  if (pos < to) out += plain(text(ctx, pos, to));
  return out;
}

// The content between a node's opening and closing marks (`*`, `**`, `~~`).
function between(ctx: Context, node: SyntaxNode, mark: string): string {
  const marks = children(node).filter((child) => child.name === mark);
  if (marks.length < 2) return plain(text(ctx, node.from, node.to));
  return inline(ctx, node, marks[0].to, marks[marks.length - 1].from);
}

function inlineNode(ctx: Context, node: SyntaxNode): string {
  switch (node.name) {
    case "Emphasis":
      return `<em>${between(ctx, node, "EmphasisMark")}</em>`;
    case "StrongEmphasis":
      return `<strong>${between(ctx, node, "EmphasisMark")}</strong>`;
    case "Strikethrough":
      return `<del>${between(ctx, node, "StrikethroughMark")}</del>`;
    case "InlineCode": {
      const marks = children(node).filter((child) => child.name === "CodeMark");
      const body = marks.length >= 2 ? text(ctx, marks[0].to, marks[marks.length - 1].from) : text(ctx, node.from, node.to);
      return `<code>${plain(body.trim() ? body.replace(/^ (.*) $/, "$1") : body)}</code>`;
    }
    case "Link":
    case "Image":
      return linkOrImage(ctx, node);
    case "URL":
    case "Autolink": {
      const raw = text(ctx, node.from, node.to).replace(/^<|>$/g, "");
      const href = webUrl(raw);
      return href ? `<a href="${escapeHtml(href)}">${plain(raw)}</a>` : plain(raw);
    }
    case "Escape":
      return plain(text(ctx, node.from + 1, node.to));
    case "HardBreak":
      return "<br>";
    case "HTMLTag":
    case "Comment":
    case "ProcessingInstruction":
    case "QuoteMark":
    case "HeaderMark":
    case "TaskMarker":
    case "ListMark":
      return "";
    default:
      return inline(ctx, node);
  }
}

function linkOrImage(ctx: Context, node: SyntaxNode): string {
  const marks = children(node).filter((child) => child.name === "LinkMark");
  const url = children(node).find((child) => child.name === "URL");
  // `[!note]`, reference links and the like: printed as written.
  if (marks.length < 2 || !url) return plain(text(ctx, node.from, node.to));
  const label = inline(ctx, node, marks[0].to, marks[1].from);
  const target = text(ctx, url.from, url.to).replace(/^<|>$/g, "");
  if (node.name === "Image") {
    const src = ctx.imageSrc(target);
    const alt = escapeHtml(text(ctx, marks[0].to, marks[1].from));
    return src ? `<img src="${escapeHtml(src)}" alt="${alt}">` : `<span class="image-alt">[${alt || "image"}]</span>`;
  }
  const href = webUrl(target);
  return href ? `<a href="${escapeHtml(href)}">${label}</a>` : label;
}

// A placeholder for a block rendered later (Mermaid, display math).
function deferred(ctx: Context, kind: PrintBlockKind, source: string): string {
  ctx.blocks.push({ kind, source });
  return `<div class="rendered ${kind}" data-render="${ctx.blocks.length - 1}"></div>`;
}

// Blockquotes and callouts: the lines without their `>` prefix, rendered as
// a document of their own.
function quoteBody(ctx: Context, node: SyntaxNode): string[] {
  return text(ctx, node.from, node.to)
    .split("\n")
    .map((line) => line.replace(/^[ \t]*>[ \t]?/, ""));
}

function blockquote(ctx: Context, node: SyntaxNode): string {
  const lines = quoteBody(ctx, node);
  const callout = REGEX_CALLOUT.exec(lines[0] ?? "");
  if (!callout) return `<blockquote>${renderInto(ctx, lines.join("\n"))}</blockquote>`;
  const type = callout[1].toLowerCase();
  const title = callout[2].trim() || type.charAt(0).toUpperCase() + type.slice(1);
  const body = renderInto(ctx, lines.slice(1).join("\n"));
  return `<div class="callout callout-${escapeHtml(type)}"><div class="callout-title">${plain(title)}</div>${body}</div>`;
}

function listItem(ctx: Context, node: SyntaxNode): string {
  let out = "";
  let isTask = false;
  for (const child of children(node)) {
    if (child.name === "ListMark") continue;
    if (child.name === "Task") {
      const marker = children(child).find((part) => part.name === "TaskMarker");
      const done = !!marker && /\[[xX]\]/.test(text(ctx, marker.from, marker.to));
      isTask = true;
      out += `<span class="task-box${done ? " done" : ""}" aria-hidden="true">${done ? "✓" : ""}</span>${inline(ctx, child, marker ? marker.to : child.from).trim()}`;
      continue;
    }
    out += block(ctx, child);
  }
  return `<li${isTask ? ' class="task"' : ""}>${out}</li>`;
}

function table(ctx: Context, node: SyntaxNode): string {
  const rows = children(node).filter((child) => child.name === "TableHeader" || child.name === "TableRow");
  const cells = (row: SyntaxNode, tag: "th" | "td") =>
    children(row)
      .filter((child) => child.name === "TableCell")
      .map((cell) => `<${tag}>${inline(ctx, cell).trim()}</${tag}>`)
      .join("");
  const [head, ...body] = rows;
  const thead = head?.name === "TableHeader" ? `<thead><tr>${cells(head, "th")}</tr></thead>` : "";
  const bodyRows = (head?.name === "TableHeader" ? body : rows).map((row) => `<tr>${cells(row, "td")}</tr>`).join("");
  return `<table>${thead}<tbody>${bodyRows}</tbody></table>`;
}

function fencedCode(ctx: Context, node: SyntaxNode): string {
  const info = children(node).find((child) => child.name === "CodeInfo");
  const code = children(node).find((child) => child.name === "CodeText");
  const lang = info ? text(ctx, info.from, info.to).trim().toLowerCase() : "";
  const body = code ? text(ctx, code.from, code.to) : "";
  if (MERMAID_INFO.has(lang)) return deferred(ctx, "mermaid", body);
  if (MATH_INFO.has(lang)) return deferred(ctx, "math", body);
  return `<pre><code>${escapeHtml(body)}</code></pre>`;
}

function block(ctx: Context, node: SyntaxNode): string {
  const heading = /^(?:ATX|Setext)Heading(\d)$/.exec(node.name);
  if (heading) {
    const body = inline(ctx, node).replace(/\n[=-]+\s*$/, "").trim();
    return `<h${heading[1]}>${body}</h${heading[1]}>`;
  }
  switch (node.name) {
    case "Paragraph": {
      const source = text(ctx, node.from, node.to).trim();
      if (source.length >= 4 && source.startsWith("$$") && source.endsWith("$$")) {
        return deferred(ctx, "math", source.slice(2, -2).trim());
      }
      return `<p>${inline(ctx, node).trim()}</p>`;
    }
    case "BulletList":
      return `<ul>${children(node).filter((child) => child.name === "ListItem").map((item) => listItem(ctx, item)).join("")}</ul>`;
    case "OrderedList": {
      const first = node.firstChild?.firstChild;
      const start = first?.name === "ListMark" ? parseInt(text(ctx, first.from, first.to), 10) : 1;
      const attr = Number.isFinite(start) && start !== 1 ? ` start="${start}"` : "";
      return `<ol${attr}>${children(node).filter((child) => child.name === "ListItem").map((item) => listItem(ctx, item)).join("")}</ol>`;
    }
    case "Blockquote":
      return blockquote(ctx, node);
    case "FencedCode":
      return fencedCode(ctx, node);
    case "CodeBlock":
      return `<pre><code>${escapeHtml(text(ctx, node.from, node.to).replace(/^( {4}|\t)/gm, ""))}</code></pre>`;
    case "Table":
      return table(ctx, node);
    case "HorizontalRule":
      return "<hr>";
    // Raw HTML, comments (the rollup markers) and link definitions don't print.
    case "HTMLBlock":
    case "CommentBlock":
    case "ProcessingInstructionBlock":
    case "LinkReference":
      return "";
    default:
      return "";
  }
}

// Renders `source` (already wikilink-marked) as blocks, sharing `ctx.blocks`.
// Page breaks only count at the top level, not inside a list or quote.
function renderMarkdown(ctx: Context, source: string, top: boolean): string {
  const inner: Context = { ...ctx, src: source };
  const tree = markdownLanguage.parser.parse(source);
  const marker = top ? ctx.pageBreak?.trim() : undefined;
  return children(tree.topNode)
    .map((node) => (marker && text(inner, node.from, node.to).trim() === marker ? PAGE_BREAK_HTML : block(inner, node)))
    .join("\n");
}

// `<details><summary>` sections become real `<details>`; the text around them
// renders as Markdown. Raw HTML elsewhere is still dropped.
function renderInto(ctx: Context, source: string, top = false): string {
  const sections = outermostDetailsBlocks(findDetailsBlocks(source));
  if (!sections.length) return renderMarkdown(ctx, source, top);
  const parts: string[] = [];
  let pos = 0;
  const flush = (to: number) => {
    const piece = source.slice(pos, to);
    if (piece.trim()) parts.push(renderMarkdown(ctx, piece, top));
  };
  for (const b of sections) {
    flush(b.openFrom);
    const open = b.open || ctx.openDetails ? " open" : "";
    const body = renderInto(ctx, source.slice(b.bodyFrom, b.closeFrom));
    parts.push(`<details${open}><summary>${plain(b.summary?.text || "Details")}</summary>${body}</details>`);
    pos = b.closeTo;
  }
  flush(source.length);
  return parts.join("\n");
}

const REGEX_H1 = /^#[ \t]+(.+?)[ \t#]*$/m;

export function noteToHtml(markdown: string, options: NoteHtmlOptions = {}): NoteHtml {
  const body = markdown.replace(FM_REGEX, "").replace(/\r\n?/g, "\n");
  const marked = body.replace(REGEX_WIKILINK, (_whole, target: string, label?: string) => `${WIKI_OPEN}${(label ?? target).trim()}${WIKI_CLOSE}`);
  const ctx: Context = { src: marked, imageSrc: options.imageSrc ?? webUrl, blocks: [], pageBreak: options.pageBreak, openDetails: options.openDetails };
  const html = renderInto(ctx, marked, true);
  const h1 = REGEX_H1.exec(body.replace(/^```[\s\S]*?^```/gm, ""));
  const title = h1 ? h1[1].replace(REGEX_WIKILINK, (_w, target: string, label?: string) => (label ?? target).trim()).replace(/[*_`~]/g, "").trim() : null;
  return { html, title: title || null, blocks: ctx.blocks };
}
