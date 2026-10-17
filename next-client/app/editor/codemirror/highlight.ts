import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { EditorState, Range } from "@codemirror/state";
import { CALLOUT_META, CALLOUT_ALIASES } from "../constants/callouts";
import {
  REGEX_CODE_INLINE,
  REGEX_WIKILINK,
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
// Emphasis and inline-code marks, always shown as typed: dimmed like other
// syntax, so the word they wrap stays what you read.
const FADED_MARK = "opacity-40 dark:opacity-50";

const REGEX_OBSIDIAN_CALLOUT = /^(>\s*)+\[!(\w+)\]([+-]?)\s*(.*)$/i;
const REGEX_OBSIDIAN_QUOTE_DEPTH = /^(>\s*)+/;
const REGEX_THEMATIC_BREAK = /^( {0,3}([-*_])(?:\s*\2){2,}\s*)$/;
const REGEX_HEADING = /^#{1,6}\s/;
const REGEX_HEADING_PARTS = /^(#{1,6}\s+)(.*)$/;
const REGEX_BLOCKQUOTE_PARTS = /^(>\s?)(.*)$/;
const REGEX_LIST_ITEM = /^\s*(?:[-*+]|\d+[.)])\s+/;
const REGEX_LIST_PARTS = /^(\s*(?:[-*+]|\d+[.)])\s+)(\[[ xX/!-]\]\s+)?(.*)$/;
const REGEX_TABLE_LINE = /^\s*\|/;
const REGEX_TABLE_SEPARATOR = /^\s*\|[\s:|-]+\|/;

// Heading lines carry `cm-heading cm-heading-N`; their size and tracking
// live in editor-typography.scss.
const headingLineClass = (level: number) => `cm-heading cm-heading-${level}`;

interface MarkRange {
  from: number;
  to: number;
  class: string;
}

function mark(ranges: MarkRange[], from: number, to: number, className: string) {
  if (to > from) ranges.push({ from, to, class: className });
}

// Runs the inline regex passes (wikilinks, code, links, bold/italic,
// strikethrough; tags and dates are chips, tag-pills.ts and
// annotation-display.ts) over one line's label text, emitting
// absolute-position mark decorations. `base` is the doc offset of label[0].
function processInline(ranges: MarkRange[], label: string, base: number) {
  const push = (from: number, to: number, cls: string) => mark(ranges, base + from, base + to, cls);

  if (label.includes("[[")) {
    for (const m of label.matchAll(REGEX_WIKILINK)) {
      if (/^\[\[\d{4}-\d{2}-\d{2}\]\]$/.test(m[0])) continue;
      push(m.index!, m.index! + 2, FADED);
      push(m.index! + 2, m.index! + m[0].length - 2, "!text-sage dark:!text-sage font-bold underline cursor-pointer");
      push(m.index! + m[0].length - 2, m.index! + m[0].length, FADED);
    }
  }

  if (label.includes("`")) {
    for (const m of label.matchAll(REGEX_CODE_INLINE)) {
      const [full, open, inner] = m;
      const i = m.index!;
      push(i, i + open.length, FADED_MARK);
      push(i + open.length, i + open.length + inner.length, "cm-inline-code");
      push(i + open.length + inner.length, i + full.length, FADED_MARK);
    }
  }

  if (label.includes("[")) {
    for (const m of label.matchAll(REGEX_LINK)) {
      const [, p1, p2, p3, p4, p5] = m;
      let i = m.index!;
      push(i, i + p1.length, FADED); i += p1.length;
      push(i, i + p2.length, "!text-sage dark:!text-sage underline"); i += p2.length;
      push(i, i + p3.length + p4.length + p5.length, FADED);
    }
  }

  if (label.includes("*") || label.includes("_")) {
    for (const m of label.matchAll(REGEX_BOLD)) {
      const [full, marker, inner] = m;
      const i = m.index!;
      push(i, i + marker.length, FADED_MARK);
      push(i + marker.length, i + marker.length + inner.length, "font-bold text-ink-light dark:text-ink-dark");
      push(i + marker.length + inner.length, i + full.length, FADED_MARK);
    }
    for (const m of label.matchAll(REGEX_ITALIC)) {
      const [full, marker, inner] = m;
      const i = m.index!;
      push(i, i + marker.length, FADED_MARK);
      push(i + marker.length, i + marker.length + inner.length, "italic text-ink-light dark:text-ink-dark");
      push(i + marker.length + inner.length, i + full.length, FADED_MARK);
    }
  }

  if (label.includes("~~")) {
    for (const m of label.matchAll(REGEX_STRIKETHROUGH)) {
      const [, p1, p2, p3] = m;
      let i = m.index!;
      push(i, i + p1.length, FADED_MARK); i += p1.length;
      push(i, i + p2.length, "line-through opacity-40"); i += p2.length;
      push(i, i + p3.length, FADED_MARK);
    }
  }
}

// A thematic-break line that renders as a horizontal rule: not a
// frontmatter fence, and not a `---` directly under a paragraph line (that
// makes the line above a setext heading instead). `***` / `___` always are.
export function isHorizontalRule(text: string, previousLine: string, isFrontmatterLine = false): boolean {
  if (isFrontmatterLine || !REGEX_THEMATIC_BREAK.test(text)) return false;
  return !text.trim().startsWith("-") || !previousLine.trim();
}

export function computeMarkdownDecorations(
  state: EditorState,
  range?: { from: number; to: number },
): DecorationSet {
  const ranges: MarkRange[] = [];
  const lineDecos: { line: number; class: string }[] = [];

  let isInsideCodeBlock = false;
  let calloutType: string | null = null;
  let calloutDepth = 0;
  // The callout's last line so far (its lineDecos entry), capped when it ends.
  let calloutLastDeco: { line: number; class: string } | null = null;
  const endCallout = () => {
    if (calloutLastDeco) calloutLastDeco.class += " cm-callout-end";
    calloutLastDeco = null;
  };
  let tableRowCounter = -1;
  let isInsideFrontmatter = false;

  const doc = state.doc;
  // With a range (the viewport), lines before it are still read, since a
  // code block or callout above changes how the lines below look, but only
  // the lines in it are decorated, and reading stops one line past it (enough
  // to see whether a callout ends there). Without one, the whole note.
  const firstLine = range ? doc.lineAt(range.from).number : 1;
  const emitLast = range ? doc.lineAt(range.to).number : doc.lines;
  const lastLine = Math.min(doc.lines, emitLast + 1);
  let emit = true;
  const markIf: typeof mark = (...args) => { if (emit) mark(...args); };
  const inlineIf: typeof processInline = (...args) => { if (emit) processInline(...args); };
  const pushLine = (deco: { line: number; class: string }) => { if (emit) lineDecos.push(deco); };
  for (let i = 1; i <= lastLine; i++) {
    emit = i >= firstLine && i <= emitLast;
    const line = doc.line(i);
    const text = line.text;
    const base = line.from;

    if (i === 1 && /^---\s*$/.test(text)) isInsideFrontmatter = true;
    const isFrontmatterLine = isInsideFrontmatter;
    if (isInsideFrontmatter) {
      const isClosingLine = i > 1 && /^---\s*$/.test(text);
      pushLine({
        line: i,
        class: [
          "cm-frontmatter-line",
          i === 1 ? "cm-frontmatter-start" : "",
          isClosingLine ? "cm-frontmatter-end" : "",
        ].filter(Boolean).join(" "),
      });
      if (i > 1 && !isClosingLine) {
        const field = /^(\s*)([A-Za-z_][\w-]*)(\s*:)/.exec(text);
        if (field) {
          const keyFrom = base + field[1].length;
          const keyTo = keyFrom + field[2].length;
          markIf(ranges, keyFrom, keyTo, "cm-frontmatter-key");
          markIf(ranges, keyTo, base + field[0].length, "cm-frontmatter-separator");
        }
      }
      if (isClosingLine) isInsideFrontmatter = false;
    }

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
      // The fold sign (`+`/`-`) is syntax like the rest of `> [!type]`: same
      // faded look. The fold chevron writes it (callout-fold.ts).
      const prefixEnd = bracketEndAbs + (fold ? 1 : 0);
      markIf(ranges, base, base + prefixEnd, FADED);
      const cursor = prefixEnd;
      const rest = text.slice(cursor);
      if (rest.trim()) {
        markIf(ranges, base + cursor, line.to, `${style.text} font-bold`);
      }
      calloutLastDeco = { line: i, class: `cm-callout cm-callout-start ${style.bg}` };
      pushLine(calloutLastDeco);
    } else if (
      calloutType !== null &&
      (text.match(REGEX_OBSIDIAN_QUOTE_DEPTH)?.[0].match(/>/g) || []).length >= calloutDepth
    ) {
      const resolvedType = CALLOUT_ALIASES[calloutType] ?? calloutType;
      const style = CALLOUT_META[resolvedType] ?? CALLOUT_META.note;
      const bodyDepthMatch = text.match(REGEX_OBSIDIAN_QUOTE_DEPTH);
      const bodyPrefix = bodyDepthMatch ? bodyDepthMatch[0] : "";
      markIf(ranges, base, base + bodyPrefix.length, FADED);
      inlineIf(ranges, text.slice(bodyPrefix.length), base + bodyPrefix.length);
      calloutLastDeco = { line: i, class: `cm-callout ${style.bg}` };
      pushLine(calloutLastDeco);
    } else if (calloutType !== null) {
      endCallout();
      calloutType = null;
      calloutDepth = 0;
      inlineIf(ranges, text, base);
    } else if (text.startsWith("```") || text.startsWith("~~~")) {
      // Fences and body share one tinted, monospaced block (editor-typography.scss);
      // the fences cap it top and bottom.
      const edge = isInsideCodeBlock ? "cm-codeblock-end" : "cm-codeblock-start";
      isInsideCodeBlock = !isInsideCodeBlock;
      markIf(ranges, base, line.to, FADED);
      pushLine({ line: i, class: `cm-codeblock ${edge}` });
    } else if (isInsideCodeBlock) {
      pushLine({ line: i, class: "cm-codeblock" });
    } else if (!text.trim()) {
      // blank line, nothing to decorate
    } else if (REGEX_THEMATIC_BREAK.test(text)) {
      if (isHorizontalRule(text, i > 1 ? doc.line(i - 1).text : "", isFrontmatterLine)) {
        // Drawn as a rule (theme.ts); the dashes show only while the caret
        // is on the line (horizontalRuleCursorPlugin).
        markIf(ranges, base, line.to, "cm-hr-marks");
        pushLine({ line: i, class: "cm-hr" });
      } else {
        markIf(ranges, base, line.to, FADED);
      }
    } else if (isFrontmatterLine && text.startsWith("#")) {
      // A YAML comment (templates use them for hints), not a heading.
      markIf(ranges, base, line.to, "cm-frontmatter-comment");
    } else if (text.startsWith("#") && REGEX_HEADING.test(text)) {
      const m = text.match(REGEX_HEADING_PARTS)!;
      const hashes = m[1];
      const level = hashes.match(/^#+/)![0].length;
      markIf(ranges, base, base + hashes.length, FADED);
      markIf(ranges, base + hashes.length, line.to, "font-semibold text-ink-light dark:text-ink-dark");
      pushLine({ line: i, class: headingLineClass(level) });
      inlineIf(ranges, m[2], base + hashes.length);
    } else if (text.startsWith(">")) {
      const m = text.match(REGEX_BLOCKQUOTE_PARTS)!;
      const quote = m[1];
      markIf(ranges, base, base + quote.length, FADED);
      markIf(ranges, base + quote.length, line.to, "text-ink-muted dark:text-stone");
      inlineIf(ranges, m[2], base + quote.length);
    } else if (REGEX_LIST_ITEM.test(text)) {
      const m = text.match(REGEX_LIST_PARTS)!;
      const bull = m[1];
      const check = m[2];
      const label = m[3];
      // The marker itself is styled by live-markers.ts (muted, or a task's
      // status colour), so it isn't faded here.
      let cursor = bull.length;
      if (check) cursor += check.length;
      const state = check?.[1].toLowerCase();
      if (state === "x") markIf(ranges, base + cursor, line.to, "cm-task-done");
      else if (state === "-") markIf(ranges, base + cursor, line.to, "cm-task-cancelled");
      inlineIf(ranges, label, base + cursor);
    } else if (isPipeLine) {
      const isSeparator = REGEX_TABLE_SEPARATOR.test(text);
      const nextLine = i < doc.lines ? doc.line(i + 1).text : "";
      const isHeader = tableRowCounter === 0 && REGEX_TABLE_SEPARATOR.test(nextLine);

      if (isSeparator) {
        markIf(ranges, base, line.to, FADED);
      } else {
        let cellStart = 0;
        const cells = text.split("|");
        cells.forEach((cell, ci) => {
          const cellBase = base + cellStart;
          if (ci > 0) markIf(ranges, cellBase - 1, cellBase, FADED);
          inlineIf(ranges, cell, cellBase);
          if (isHeader) markIf(ranges, cellBase, cellBase + cell.length, "font-bold text-ink-light dark:text-ink-dark");
          cellStart += cell.length + 1;
        });
      }

      if (isHeader) {
        pushLine({ line: i, class: "bg-paper-softgray/60 dark:bg-paper-dark-surface/50" });
      } else if (!isSeparator && tableRowCounter >= 2 && tableRowCounter % 2 === 1) {
        pushLine({ line: i, class: "bg-black/[0.03] dark:bg-white/[0.04]" });
      }
    } else {
      inlineIf(ranges, text, base);
    }
  }
  // A callout still open where reading stopped carries on below; it only
  // gets its end cap when the note itself ends.
  if (lastLine === doc.lines) endCallout();

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
    // Only the viewport (what CodeMirror renders, plus its margin) is
    // decorated, so typing and scrolling in a long note never rebuild
    // decorations for lines that aren't drawn.
    constructor(view: EditorView) {
      this.decorations = computeMarkdownDecorations(view.state, view.viewport);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = computeMarkdownDecorations(update.state, update.view.viewport);
      }
    }
  },
  { decorations: (v) => v.decorations },
);

// Reveals a horizontal rule's dashes while a caret or selection touches its
// line, so it can be edited; elsewhere only the drawn rule shows.
export const horizontalRuleCursorPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = this.compute(view.state);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet) this.decorations = this.compute(update.state);
    }
    compute(state: EditorState): DecorationSet {
      const lines = new Set<number>();
      for (const range of state.selection.ranges) {
        const first = state.doc.lineAt(range.from).number;
        const last = state.doc.lineAt(range.to).number;
        for (let n = first; n <= last; n++) {
          if (REGEX_THEMATIC_BREAK.test(state.doc.line(n).text)) lines.add(n);
        }
      }
      return Decoration.set(
        [...lines].sort((a, b) => a - b).map((n) =>
          Decoration.line({ attributes: { class: "cm-hr-editing" } }).range(state.doc.line(n).from),
        ),
      );
    }
  },
  { decorations: (v) => v.decorations },
);
