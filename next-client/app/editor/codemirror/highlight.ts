import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { EditorState, Range } from "@codemirror/state";
import { WORKFLOW_TAGS, TODO_TAGS, TAG_COLORS } from "../components/constants";
import { CALLOUT_META, CALLOUT_ALIASES } from "../constants/callouts";
import {
  REGEX_DATE_ISO,
  REGEX_DATE_SLASHED,
  REGEX_DATE_DOTTED,
  REGEX_DATE_WIKI,
  REGEX_CODE_INLINE,
  REGEX_WIKILINK,
  REGEX_HASHTAG,
  REGEX_CURRENCY,
  REGEX_LINK,
  REGEX_BOLD,
  REGEX_ITALIC,
  REGEX_STRIKETHROUGH,
} from "../components/regex";

// Direct port of MarkdownHighlighter.tsx's line-by-line tokenizer, ported
// from "build an HTML string" to "emit CM6 mark/line decorations over the
// real doc". Unlike the old overlay, decorations don't mutate text, so
// each inline regex runs independently against the raw line rather than
// against a progressively-html-mutated string — overlapping styles (e.g. a
// hashtag inside bold text) just layer as separate marks, which CM6
// supports natively.
//
// dateMatch/activeLink/tableInfo "active state" highlighting (the
// underline-on-hover / active-cell-ring behavior) is wired in Step 4 once
// the link pill / date picker / table subsystems land — this pass only
// covers static syntax coloring.

const FADED = "opacity-40 dark:opacity-50 transition-opacity duration-500 hover:opacity-100";
const TRANSITION = "transition-all duration-100 ease-in-out";

const REGEX_OBSIDIAN_CALLOUT = /^(>\s*)+\[!(\w+)\]([+-]?)\s*(.*)$/i;
const REGEX_OBSIDIAN_QUOTE_DEPTH = /^(>\s*)+/;
const REGEX_THEMATIC_BREAK = /^( {0,3}([-*_])(?:\s*\2){2,}\s*)$/;
const REGEX_HEADING = /^#{1,6}\s/;
const REGEX_HEADING_PARTS = /^(#{1,6}\s+)(.*)$/;
const REGEX_BLOCKQUOTE_PARTS = /^(>\s?)(.*)$/;
const REGEX_LIST_ITEM = /^\s*[-*+]\s+/;
const REGEX_LIST_PARTS = /^(\s*[-*+]\s+)(\[[ xX]\]\s+)?(.*)$/;
const REGEX_TABLE_LINE = /^\s*\|/;
const REGEX_TABLE_SEPARATOR = /^\s*\|[\s:|-]+\|/;

const HEADING_SIZE_CLASSES: Record<number, string> = {
  1: "!text-[1.5em]",
  2: "!text-[1.35em]",
  3: "!text-[1.2em]",
  4: "!text-[1.1em]",
  5: "!text-[1em]",
  6: "!text-[0.95em]",
};

interface MarkRange {
  from: number;
  to: number;
  class: string;
}

function mark(ranges: MarkRange[], from: number, to: number, className: string) {
  if (to > from) ranges.push({ from, to, class: className });
}

// Runs the inline regex passes (dates, wikilinks, code, hashtags, currency,
// links, bold/italic, strikethrough) over one line's label text, emitting
// absolute-position mark decorations. `base` is the doc offset of label[0].
function processInline(ranges: MarkRange[], label: string, base: number) {
  const push = (from: number, to: number, cls: string) => mark(ranges, base + from, base + to, cls);

  if (/\d/.test(label)) {
    for (const m of label.matchAll(REGEX_DATE_WIKI)) {
      push(m.index!, m.index! + 2, FADED);
      push(m.index! + 2, m.index! + m[0].length - 2, TRANSITION);
      push(m.index! + m[0].length - 2, m.index! + m[0].length, FADED);
    }
    for (const re of [REGEX_DATE_ISO, REGEX_DATE_SLASHED, REGEX_DATE_DOTTED]) {
      for (const m of label.matchAll(re)) push(m.index!, m.index! + m[0].length, TRANSITION);
    }
  }

  if (label.includes("[[")) {
    for (const m of label.matchAll(REGEX_WIKILINK)) {
      if (/^\[\[\d{4}-\d{2}-\d{2}\]\]$/.test(m[0])) continue;
      push(m.index!, m.index! + 2, FADED);
      push(m.index! + 2, m.index! + m[0].length - 2, "text-sage dark:text-sage font-bold underline cursor-pointer");
      push(m.index! + m[0].length - 2, m.index! + m[0].length, FADED);
    }
  }

  if (label.includes("`")) {
    for (const m of label.matchAll(REGEX_CODE_INLINE)) {
      const [full, open, inner, close] = m;
      const i = m.index!;
      push(i, i + open.length, FADED);
      push(i + open.length, i + open.length + inner.length, "bg-paper-softgray/80 dark:bg-paper-dark-surface/50 rounded-sm");
      push(i + open.length + inner.length, i + full.length, FADED);
    }
  }

  if (label.includes("#")) {
    for (const m of label.matchAll(REGEX_HASHTAG)) {
      const fullTag = m[2];
      const tagName = fullTag.slice(1).toLowerCase();
      const isColored = WORKFLOW_TAGS.includes(tagName) || TODO_TAGS.includes(tagName);
      const cls = isColored ? TAG_COLORS[tagName] : "text-zinc-700 dark:text-zinc-300";
      const tagStart = m.index! + m[1].length;
      push(tagStart, tagStart + fullTag.length, `${cls} font-bold cursor-pointer`);
    }
  }

  if (/[$€£¥₹]|C\$|A\$|lei/.test(label)) {
    for (const m of label.matchAll(REGEX_CURRENCY)) {
      push(m.index!, m.index! + m[0].length, "text-emerald-600 dark:text-emerald-400");
    }
  }

  if (label.includes("[")) {
    for (const m of label.matchAll(REGEX_LINK)) {
      const [, p1, p2, p3, p4, p5] = m;
      let i = m.index!;
      push(i, i + p1.length, FADED); i += p1.length;
      push(i, i + p2.length, "text-sage dark:text-sage underline"); i += p2.length;
      push(i, i + p3.length + p4.length + p5.length, FADED);
    }
  }

  if (label.includes("*") || label.includes("_")) {
    for (const m of label.matchAll(REGEX_BOLD)) {
      const [full, marker, inner] = m;
      const i = m.index!;
      push(i, i + marker.length, FADED);
      push(i + marker.length, i + marker.length + inner.length, "font-bold text-ink-light dark:text-ink-dark");
      push(i + marker.length + inner.length, i + full.length, FADED);
    }
    for (const m of label.matchAll(REGEX_ITALIC)) {
      const [full, marker, inner] = m;
      const i = m.index!;
      push(i, i + marker.length, FADED);
      push(i + marker.length, i + marker.length + inner.length, "italic text-ink-light dark:text-ink-dark");
      push(i + marker.length + inner.length, i + full.length, FADED);
    }
  }

  if (label.includes("~~")) {
    for (const m of label.matchAll(REGEX_STRIKETHROUGH)) {
      const [, p1, p2, p3] = m;
      let i = m.index!;
      push(i, i + p1.length, FADED); i += p1.length;
      push(i, i + p2.length, "line-through opacity-40"); i += p2.length;
      push(i, i + p3.length, FADED);
    }
  }
}

export function computeMarkdownDecorations(state: EditorState): DecorationSet {
  const ranges: MarkRange[] = [];
  const lineDecos: { line: number; class: string }[] = [];

  let isInsideCodeBlock = false;
  let calloutType: string | null = null;
  let calloutDepth = 0;
  let tableRowCounter = -1;

  const doc = state.doc;
  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i);
    const text = line.text;
    const base = line.from;

    const isPipeLine =
      REGEX_TABLE_LINE.test(text) && !isInsideCodeBlock && calloutType === null &&
      !text.startsWith("```") && !text.startsWith("~~~");
    tableRowCounter = isPipeLine ? (tableRowCounter < 0 ? 0 : tableRowCounter + 1) : -1;

    if (calloutType === null && REGEX_OBSIDIAN_CALLOUT.test(text)) {
      const m = text.match(REGEX_OBSIDIAN_CALLOUT)!;
      const depthMatch = text.match(REGEX_OBSIDIAN_QUOTE_DEPTH)!;
      const prefixText = depthMatch[0];
      const depth = (prefixText.match(/>/g) || []).length;
      const requestedType = m[2].toLowerCase();
      const fold = m[3];
      const resolvedType = CALLOUT_ALIASES[requestedType] ?? requestedType;
      const style = CALLOUT_META[resolvedType] ?? CALLOUT_META.note;

      calloutType = requestedType;
      calloutDepth = depth;

      const remainder = text.slice(prefixText.length);
      const bracketEnd = remainder.indexOf("]");
      const bracketEndAbs = prefixText.length + bracketEnd + 1;
      mark(ranges, base, base + bracketEndAbs, FADED);
      let cursor = bracketEndAbs;
      if (fold) {
        mark(ranges, base + cursor, base + cursor + 1, `${style.text} font-bold`);
        cursor += 1;
      }
      const rest = text.slice(cursor);
      if (rest.trim()) {
        mark(ranges, base + cursor, line.to, `${style.text} font-bold`);
      }
      lineDecos.push({ line: i, class: `${style.bg} ${style.border} border-l-2` });
    } else if (
      calloutType !== null &&
      (text.match(REGEX_OBSIDIAN_QUOTE_DEPTH)?.[0].match(/>/g) || []).length >= calloutDepth
    ) {
      const resolvedType = CALLOUT_ALIASES[calloutType] ?? calloutType;
      const style = CALLOUT_META[resolvedType] ?? CALLOUT_META.note;
      const bodyDepthMatch = text.match(REGEX_OBSIDIAN_QUOTE_DEPTH);
      const bodyPrefix = bodyDepthMatch ? bodyDepthMatch[0] : "";
      mark(ranges, base, base + bodyPrefix.length, FADED);
      processInline(ranges, text.slice(bodyPrefix.length), base + bodyPrefix.length);
      lineDecos.push({ line: i, class: `${style.bg} ${style.border} border-l-2` });
    } else if (calloutType !== null) {
      calloutType = null;
      calloutDepth = 0;
      processInline(ranges, text, base);
    } else if (text.startsWith("```") || text.startsWith("~~~")) {
      isInsideCodeBlock = !isInsideCodeBlock;
      mark(ranges, base, line.to, FADED);
    } else if (isInsideCodeBlock) {
      lineDecos.push({ line: i, class: "bg-paper-softgray/50 dark:bg-paper-dark-surface/40" });
    } else if (!text.trim()) {
      // blank line, nothing to decorate
    } else if (REGEX_THEMATIC_BREAK.test(text)) {
      mark(ranges, base, line.to, FADED);
    } else if (text.startsWith("#") && REGEX_HEADING.test(text)) {
      const m = text.match(REGEX_HEADING_PARTS)!;
      const hashes = m[1];
      const level = hashes.match(/^#+/)![0].length;
      mark(ranges, base, base + hashes.length, FADED);
      mark(ranges, base + hashes.length, line.to, "font-bold text-ink-light dark:text-ink-dark");
      lineDecos.push({ line: i, class: HEADING_SIZE_CLASSES[level] });
      processInline(ranges, m[2], base + hashes.length);
    } else if (text.startsWith(">")) {
      const m = text.match(REGEX_BLOCKQUOTE_PARTS)!;
      const quote = m[1];
      mark(ranges, base, base + quote.length, FADED);
      mark(ranges, base + quote.length, line.to, "text-ink-muted dark:text-stone");
      processInline(ranges, m[2], base + quote.length);
    } else if (REGEX_LIST_ITEM.test(text)) {
      const m = text.match(REGEX_LIST_PARTS)!;
      const bull = m[1];
      const check = m[2];
      const label = m[3];
      mark(ranges, base, base + bull.length, FADED);
      let cursor = bull.length;
      if (check) {
        mark(ranges, base + cursor, base + cursor + check.length, FADED);
        cursor += check.length;
      }
      const isChecked = check?.toLowerCase().includes("x");
      mark(ranges, base + cursor, line.to, isChecked ? "line-through opacity-40" : "text-ink-light dark:text-ink-dark");
      processInline(ranges, label, base + cursor);
    } else if (isPipeLine) {
      const isSeparator = REGEX_TABLE_SEPARATOR.test(text);
      const nextLine = i < doc.lines ? doc.line(i + 1).text : "";
      const isHeader = tableRowCounter === 0 && REGEX_TABLE_SEPARATOR.test(nextLine);

      if (isSeparator) {
        mark(ranges, base, line.to, FADED);
      } else {
        let cellStart = 0;
        const cells = text.split("|");
        cells.forEach((cell, ci) => {
          const cellBase = base + cellStart;
          if (ci > 0) mark(ranges, cellBase - 1, cellBase, FADED);
          processInline(ranges, cell, cellBase);
          if (isHeader) mark(ranges, cellBase, cellBase + cell.length, "font-bold text-ink-light dark:text-ink-dark");
          cellStart += cell.length + 1;
        });
      }

      if (isHeader) {
        lineDecos.push({ line: i, class: "bg-paper-softgray/60 dark:bg-paper-dark-surface/50" });
      } else if (!isSeparator && tableRowCounter >= 2 && tableRowCounter % 2 === 1) {
        lineDecos.push({ line: i, class: "bg-black/[0.03] dark:bg-white/[0.04]" });
      }
    } else {
      processInline(ranges, text, base);
    }
  }

  const decoRanges: Range<Decoration>[] = ranges
    .filter((r) => r.to > r.from)
    .map((r) => Decoration.mark({ class: r.class }).range(r.from, r.to));

  for (const ld of lineDecos) {
    const line = doc.line(ld.line);
    decoRanges.push(Decoration.line({ attributes: { class: ld.class } }).range(line.from));
  }

  return Decoration.set(decoRanges, true);
}

export const markdownHighlightPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = computeMarkdownDecorations(view.state);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = computeMarkdownDecorations(update.state);
      }
    }
  },
  { decorations: (v) => v.decorations },
);
