import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { EditorState, Range } from "@codemirror/state";
import { CALLOUT_META, CALLOUT_ALIASES } from "../constants/callouts";
import { FADED, type MarkRange, mark, processInline } from "./highlight-inline";
import {
  type BlockStyler,
  type CalloutBody,
  CALLOUT_QUOTE,
  calloutBodyPrefixLength,
  calloutQuoteDepth,
  headingLineClass,
  newCalloutBody,
  REGEX_HEADING,
  REGEX_LIST_ITEM,
  REGEX_TABLE_LINE,
  REGEX_TABLE_SEPARATOR,
  styleCalloutBody,
  styleHeading,
  styleListItem,
  styleQuote,
  styleTableRow,
} from "./highlight-blocks";

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

const REGEX_OBSIDIAN_CALLOUT = /^(>\s*)+\[!(\w+)\]([+-]?)\s*(.*)$/i;
const REGEX_OBSIDIAN_QUOTE_DEPTH = /^(>\s*)+/;
const REGEX_THEMATIC_BREAK = /^( {0,3}([-*_])(?:\s*\2){2,}\s*)$/;

const quoteDepth = (text: string) => (text.match(REGEX_OBSIDIAN_QUOTE_DEPTH)?.[0].match(/>/g) || []).length;
const calloutStyle = (type: string) => CALLOUT_META[CALLOUT_ALIASES[type] ?? type] ?? CALLOUT_META.note;

// `> [!type] Title`: the syntax faded, the title bold in the type's colour.
// The fold sign (`+`/`-`) is syntax like the rest of `> [!type]`: same
// faded look. The fold chevron writes it (callout-fold.ts).
function styleCalloutTitle(out: BlockStyler, text: string, base: number, title: RegExpMatchArray, textClass: string) {
  const prefix = REGEX_OBSIDIAN_QUOTE_DEPTH.exec(text)![0];
  const prefixEnd = prefix.length + text.slice(prefix.length).indexOf("]") + 1 + (title[3] ? 1 : 0);
  out.mark(base, base + prefixEnd, FADED);
  if (text.slice(prefixEnd).trim()) out.mark(base + prefixEnd, base + text.length, `${textClass} font-bold`);
}

/** A callout inside another (`> > [!tip]`): its type and its `>`s. */
interface NestedCallout {
  type: string;
  depth: number;
}

type LineDeco = { line: number; class: string; style?: string };

// A thematic-break line that renders as a horizontal rule: not a
// frontmatter fence, and not a `---` directly under a paragraph line (that
// makes the line above a setext heading instead). `***` / `___` always are.
export function isHorizontalRule(text: string, previousLine: string, isFrontmatterLine = false): boolean {
  if (isFrontmatterLine || !REGEX_THEMATIC_BREAK.test(text)) return false;
  return !text.trim().startsWith("-") || !previousLine.trim();
}

// What the reading has seen by the start of a line: an open code block or
// callout, a table's row count, frontmatter. Saved every CHECKPOINT_EVERY
// lines, so decorating the viewport starts reading from the nearest saved
// line instead of the top of the note.
export interface ScanCheckpoint {
  line: number;
  isInsideCodeBlock: boolean;
  calloutType: string | null;
  calloutDepth: number;
  calloutBody: CalloutBody;
  calloutNest: NestedCallout[];
  tableRowCounter: number;
  isInsideFrontmatter: boolean;
}

const CHECKPOINT_EVERY = 256;

// `checkpoints` (sorted by line, filled in as lines are read) carries the
// saved readings from one call to the next; keep only those at or above the
// first edited line when the note changes (keepCheckpointsBefore).
export function computeMarkdownDecorations(
  state: EditorState,
  range?: { from: number; to: number },
  checkpoints?: ScanCheckpoint[],
): DecorationSet {
  const ranges: MarkRange[] = [];
  const lineDecos: LineDeco[] = [];

  let isInsideCodeBlock = false;
  let calloutType: string | null = null;
  let calloutDepth = 0;
  // What the callout's body has seen: an open code fence, a table's rows.
  let calloutBody = newCalloutBody();
  // The callout's last line so far (its lineDecos entry), capped when it ends.
  let calloutLastDeco: LineDeco | null = null;
  // Callouts nested in the open one, innermost last; the card drawn is the
  // innermost's, capped on its last line (nestedLastDeco) when it ends.
  let calloutNest: NestedCallout[] = [];
  let nestedLastDeco: LineDeco | null = null;
  const endNested = () => {
    if (nestedLastDeco) nestedLastDeco.class += " cm-callout-nested-end";
    nestedLastDeco = null;
  };
  const endCallout = () => {
    endNested();
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
  // Start from the last saved reading at or above the first line drawn.
  let startLine = 1;
  const saved = checkpoints?.filter((checkpoint) => checkpoint.line <= firstLine).at(-1);
  if (saved) {
    ({ isInsideCodeBlock, calloutType, calloutDepth, tableRowCounter, isInsideFrontmatter } = saved);
    calloutBody = { ...saved.calloutBody };
    calloutNest = [...saved.calloutNest];
    startLine = saved.line;
  }
  let emit = true;
  const markIf: typeof mark = (...args) => { if (emit) mark(...args); };
  const inlineIf: typeof processInline = (...args) => { if (emit) processInline(...args); };
  const pushLine = (deco: LineDeco) => { if (emit) lineDecos.push(deco); };
  const styler: BlockStyler = {
    mark: (from, to, className) => markIf(ranges, from, to, className),
    inline: (label, base) => inlineIf(ranges, label, base),
  };
  for (let i = startLine; i <= lastLine; i++) {
    if (checkpoints && i % CHECKPOINT_EVERY === 0 && !checkpoints.some((checkpoint) => checkpoint.line === i)) {
      checkpoints.push({
        line: i, isInsideCodeBlock, calloutType, calloutDepth, calloutBody: { ...calloutBody },
        calloutNest: [...calloutNest], tableRowCounter, isInsideFrontmatter,
      });
      checkpoints.sort((a, b) => a.line - b.line);
    }
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
      calloutType = m[2].toLowerCase();
      calloutDepth = quoteDepth(text);
      calloutBody = newCalloutBody();
      calloutNest = [];
      const style = calloutStyle(calloutType);
      styleCalloutTitle(styler, text, base, m, style.text);
      calloutLastDeco = { line: i, class: `cm-callout cm-callout-start ${style.bg}` };
      pushLine(calloutLastDeco);
    } else if (calloutType !== null && quoteDepth(text) >= calloutDepth) {
      const depth = quoteDepth(text);
      // A callout nested in this one ends where its `>`s do.
      if (calloutNest.length && depth < calloutNest.at(-1)!.depth) {
        endNested();
        while (calloutNest.length && depth < calloutNest.at(-1)!.depth) calloutNest.pop();
        calloutBody = newCalloutBody();
      }
      const ownDepth = calloutNest.at(-1)?.depth ?? calloutDepth;
      const title = depth > ownDepth && !calloutBody.inCode ? text.match(REGEX_OBSIDIAN_CALLOUT) : null;
      if (title) {
        calloutNest.push({ type: title[2].toLowerCase(), depth });
        calloutBody = newCalloutBody();
      }
      const inner = calloutNest.at(-1);
      const innerDepth = inner?.depth ?? calloutDepth;
      let extra = "";
      let quoteBars = 0;
      if (title) {
        styleCalloutTitle(styler, text, base, title, calloutStyle(inner!.type).text);
      } else {
        // The body after the callout's own `>`s is styled as any other line:
        // headings, lists, tables, code, quotes (highlight-blocks.ts).
        const prefixLength = calloutBodyPrefixLength(text, innerDepth);
        markIf(ranges, base, base + prefixLength, FADED);
        const next = i < doc.lines ? doc.line(i + 1).text : "";
        const nextBody = quoteDepth(next) >= innerDepth ? next.slice(calloutBodyPrefixLength(next, innerDepth)) : null;
        const body = text.slice(prefixLength);
        extra = styleCalloutBody(styler, calloutBody, body, base + prefixLength, nextBody);
        if (extra.split(" ").includes(CALLOUT_QUOTE)) quoteBars = calloutQuoteDepth(body);
      }
      // A nested callout is an inset card of its own tint on the outer one
      // (live-markers-theme.ts), `--callout-nest` levels in.
      const nested = inner
        ? ` cm-callout-nested ${calloutStyle(inner.type).nested}${title ? " cm-callout-nested-start" : ""}`
        : "";
      const style = [inner && `--callout-nest: ${calloutNest.length}`, quoteBars && `--quote-depth: ${quoteBars}`]
        .filter(Boolean).join("; ");
      calloutLastDeco = {
        line: i,
        class: `cm-callout ${calloutStyle(calloutType).bg}${nested}${extra ? ` ${extra}` : ""}`,
        ...(style ? { style } : {}),
      };
      nestedLastDeco = inner ? calloutLastDeco : null;
      pushLine(calloutLastDeco);
    } else if (calloutType !== null) {
      endCallout();
      calloutType = null;
      calloutDepth = 0;
      calloutNest = [];
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
      pushLine({ line: i, class: headingLineClass(styleHeading(styler, text, base)) });
    } else if (text.startsWith(">")) {
      styleQuote(styler, text, base);
    } else if (REGEX_LIST_ITEM.test(text)) {
      styleListItem(styler, text, base);
    } else if (isPipeLine) {
      const isSeparator = REGEX_TABLE_SEPARATOR.test(text);
      const nextLine = i < doc.lines ? doc.line(i + 1).text : "";
      const isHeader = tableRowCounter === 0 && REGEX_TABLE_SEPARATOR.test(nextLine);

      styleTableRow(styler, text, base, isHeader);

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
    const attributes = ld.style ? { class: ld.class, style: ld.style } : { class: ld.class };
    decoRanges.push(Decoration.line({ attributes }).range(line.from));
  }

  return Decoration.set(decoRanges, true);
}

// The saved readings still true after `update`: those at or above the first
// edited line (lines above an edit read the same).
export function keepCheckpointsBefore(checkpoints: ScanCheckpoint[], update: Pick<ViewUpdate, "changes" | "startState">) {
  let first = Infinity;
  update.changes.iterChangedRanges((fromA) => { first = Math.min(first, fromA); });
  if (first === Infinity) return checkpoints;
  const firstLine = update.startState.doc.lineAt(first).number;
  return checkpoints.filter((checkpoint) => checkpoint.line <= firstLine);
}

export const markdownHighlightPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    checkpoints: ScanCheckpoint[] = [];
    // Only the viewport (what CodeMirror renders, plus its margin) is
    // decorated, so typing and scrolling in a long note never rebuild
    // decorations for lines that aren't drawn; the reading above it starts
    // from the nearest saved checkpoint.
    constructor(view: EditorView) {
      this.decorations = computeMarkdownDecorations(view.state, view.viewport, this.checkpoints);
    }
    update(update: ViewUpdate) {
      if (update.docChanged) this.checkpoints = keepCheckpointsBefore(this.checkpoints, update);
      if (update.docChanged || update.viewportChanged) {
        this.decorations = computeMarkdownDecorations(update.state, update.view.viewport, this.checkpoints);
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
