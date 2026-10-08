import { syntaxTree } from "@codemirror/language";
import { EditorSelection, EditorState, type Range } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view";
import type { SyntaxNode } from "@lezer/common";
import { CALLOUT_ALIASES, CALLOUT_META } from "../constants/callouts";
import { findFrontmatterFoldRange } from "./frontmatter-fold";
import { liveMarkersTheme } from "./live-markers-theme";
import { BULLET_COLUMNS, BulletWidget, CalloutLabelWidget, CodeLanguageWidget, em, TaskBoxWidget } from "./live-markers-widgets";

// Live markers: Markdown syntax stays out of sight until the caret reaches
// it, so a note reads like a page while it stays editable, and nothing moves
// when the syntax appears. Inline marks (`**`, `_`, `~~`, inline-code
// backticks) show while a caret or selection touches their span. A heading's
// `#`s and a quote's or callout's `>` hang in the margin left of the text,
// visible only while the caret is on their line. A callout's `[!type]` reads as the
// type's name until the caret moves before its title. A fenced block's
// fences fade out (keeping their rows) while the caret is outside it, with
// its language in the corner. List markers never change with the caret: a
// bullet's `-` always reads as • (◦ when nested), a task's `- [ ]` as a
// checkbox that ticks on a click, and an ordered item's `1.` sits in a muted,
// fixed-width box. Blank lines inside a list are half height. An unfocused
// editor reveals nothing. Tables and frontmatter keep their own display.
//
// List geometry is in columns of 0.75em: a two-space indent is as wide as a
// bullet's box ("- "), a three-space one as "1. ", so a nested item starts
// exactly under its parent's text. An item's wrapped lines hang at that same
// text edge.

const hidden = Decoration.replace({});
const quoteLine = Decoration.line({ class: "cm-liveQuote" });
const fenceHidden = Decoration.mark({ class: "cm-fenceHidden" });
const fenceRow = Decoration.line({ class: "cm-codeFenceRow" });
const listGap = Decoration.line({ class: "cm-listGap" });
const REGEX_CALLOUT_START = /^(>\s*)+\[!\w+\]/;
// A callout title's prefix from its first `>`: "> [!note]- ".
const REGEX_CALLOUT_PREFIX = /^>(?:[ \t]*>)*[ \t]*\[!(\w+)\][+-]?[ \t]?/;
// A run of `>`s from a line's first QuoteMark: "> ", "> > ", ">>".
const REGEX_QUOTE_PREFIX = /^>(?:[ \t]*>)*[ \t]?/;
// A task box right after a bullet: " [ ] ", " [x] ", " [/] " (in progress), " [-] " (cancelled).
const REGEX_TASK_BOX = /^[ \t]\[([ xX/-])\](?=[ \t\n]|$)/;

function listIndent(columns: number) {
  return Decoration.mark({ class: "cm-listIndent", attributes: { style: `width: ${em(columns)}` } });
}

function orderedMarker(columns: number) {
  return Decoration.mark({ class: "cm-listNumber", attributes: { style: `width: ${em(columns)}` } });
}

// The item's first line: wrapped rows start at its text, not under the marker.
function hangingLine(columns: number) {
  return Decoration.line({ class: "cm-listLine", attributes: { style: `--list-hang: ${em(columns)}` } });
}

// Structural marks (`## `, `> `) always sit in the margin, out of the text
// flow; off the caret's line they're only made invisible. Both states lay
// out identically, so the caret arriving never moves a word (hiding them
// with a replace on other lines nudged the text whenever they came back).
const marginMarks = Decoration.mark({ class: "cm-marginMarks" });
const marginMarksOff = Decoration.mark({ class: "cm-marginMarks cm-marginMarks-off" });
// A row holding only margin marks (`## ` before its first letter) has no text
// in the flow and would collapse; a strut keeps it at its own height.
const marginOnlyLine = Decoration.line({ class: "cm-marginOnly" });

function marginMarkRanges(state: EditorState, shown: boolean, from: number, to: number): Range<Decoration>[] {
  const out = [(shown ? marginMarks : marginMarksOff).range(from, to)];
  const line = state.doc.lineAt(from);
  if (to === line.to) out.push(marginOnlyLine.range(line.from));
  return out;
}

function bulletDepth(node: SyntaxNode): number {
  let depth = 0;
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (parent.name === "BulletList") depth++;
  }
  return Math.max(0, depth - 1);
}

// Extends a marker's range over one following space ("# ", "> ", "- ").
function withTrailingSpace(state: EditorState, to: number): number {
  return state.doc.sliceString(to, to + 1) === " " ? to + 1 : to;
}

function touches(selection: EditorSelection | null, from: number, to: number): boolean {
  return selection?.ranges.some((range) => range.to >= from && range.from <= to) ?? false;
}

function touchesLine(state: EditorState, selection: EditorSelection | null, pos: number): boolean {
  const line = state.doc.lineAt(pos);
  return touches(selection, line.from, line.to);
}

interface ListMarker {
  kind: "bullet" | "task" | "ordered";
  /** End of the marker, its following space and any task box. */
  to: number;
  /** Columns the marker box takes. */
  columns: number;
  /** Task state: the character between the brackets. */
  task?: string;
}

function listMarker(state: EditorState, mark: SyntaxNode): ListMarker | null {
  const list = mark.parent?.parent?.name;
  const to = withTrailingSpace(state, mark.to);
  if (list === "OrderedList") return { kind: "ordered", to, columns: to - mark.from };
  if (list !== "BulletList") return null;
  const box = REGEX_TASK_BOX.exec(state.doc.sliceString(mark.to, mark.to + 5));
  if (!box) return { kind: "bullet", to, columns: BULLET_COLUMNS };
  return { kind: "task", to: withTrailingSpace(state, mark.to + box[0].length), columns: BULLET_COLUMNS, task: box[1].toLowerCase() };
}

// A fenced block away from the caret: its fences turn transparent rather than
// disappear, so their rows keep their height and nothing moves when the
// caret comes in. The language shows in the opening row's corner.
function fadedFences(state: EditorState, block: SyntaxNode): Range<Decoration>[] {
  const { doc } = state;
  const open = block.firstChild;
  if (open?.name !== "CodeMark") return [];
  const openLine = doc.lineAt(open.from);
  const out = [fenceHidden.range(open.from, openLine.to)];
  const info = block.getChild("CodeInfo");
  if (info) {
    out.push(fenceRow.range(openLine.from));
    const widget = new CodeLanguageWidget(doc.sliceString(info.from, info.to));
    out.push(Decoration.widget({ widget, side: 1 }).range(openLine.to));
  }
  const close = block.lastChild;
  if (close && close !== open && close.name === "CodeMark" && doc.lineAt(close.from).number !== openLine.number) {
    out.push(fenceHidden.range(close.from, doc.lineAt(close.from).to));
  }
  return out;
}

// A callout's title line: `> [!type]` reads as the type's name unless the
// selection reaches before the title (Home, or a click on the label).
function calloutTitle(state: EditorState, selection: EditorSelection | null, from: number): Range<Decoration> | null {
  const line = state.doc.lineAt(from);
  const match = REGEX_CALLOUT_PREFIX.exec(state.doc.sliceString(from, line.to));
  if (!match) return null;
  const to = from + match[0].length;
  if (selection?.ranges.some((range) => range.from < to && range.to >= line.from)) return null;
  const type = match[1].toLowerCase();
  const meta = CALLOUT_META[CALLOUT_ALIASES[type] ?? type] ?? CALLOUT_META.note;
  return Decoration.replace({ widget: new CalloutLabelWidget(type, meta.text) }).range(from, to);
}

export function buildLiveMarkerDecorations(
  state: EditorState,
  visibleRanges: readonly { from: number; to: number }[],
  focused: boolean,
): DecorationSet {
  const ranges: Range<Decoration>[] = [];
  const { doc } = state;
  const selection = focused ? state.selection : null;
  // Frontmatter's closing `---` parses as a setext underline; leave it alone.
  const frontmatterEnd = findFrontmatterFoldRange(doc.toString())?.closeTo ?? -1;
  const quotedLines = new Set<number>();
  const calloutTitles = new Set<number>();
  const calloutLines = new Set<number>();
  const listGapLines = new Set<number>();

  for (const visible of visibleRanges) {
    syntaxTree(state).iterate({
      from: visible.from,
      to: visible.to,
      enter(ref) {
        if (ref.to <= frontmatterEnd) return ref.name === "Document";
        const node = ref.node;
        switch (ref.name) {
          case "Table":
          case "CodeBlock":
            return false;
          case "FencedCode":
            if (!touches(selection, ref.from, ref.to)) ranges.push(...fadedFences(state, node));
            return false;
          case "BulletList":
          case "OrderedList": {
            const last = doc.lineAt(ref.to).number;
            for (let n = doc.lineAt(ref.from).number + 1; n < last; n++) {
              if (!doc.line(n).text.trim()) listGapLines.add(n);
            }
            return;
          }
          case "Blockquote": {
            // Callouts keep their tint and bar (highlight.ts) instead of a quote's.
            const first = doc.lineAt(ref.from);
            if (!REGEX_CALLOUT_START.test(first.text)) return;
            calloutTitles.add(first.number);
            for (let n = first.number; n <= doc.lineAt(ref.to).number; n++) calloutLines.add(n);
            return;
          }
          case "HeaderMark": {
            // Setext underlines and closing `#`s stay as typed.
            if (ref.from !== node.parent?.from || !node.parent.name.startsWith("ATXHeading")) return;
            const to = withTrailingSpace(state, ref.to);
            ranges.push(...marginMarkRanges(state, touchesLine(state, selection, ref.from), ref.from, to));
            return;
          }
          case "QuoteMark": {
            // One range per line covers every `>` of a nested quote.
            const line = doc.lineAt(ref.from);
            if (quotedLines.has(line.number)) return;
            quotedLines.add(line.number);
            if (calloutTitles.has(line.number)) {
              const title = calloutTitle(state, selection, ref.from);
              if (title) ranges.push(title);
              return;
            }
            const prefix = REGEX_QUOTE_PREFIX.exec(doc.sliceString(ref.from, line.to))![0];
            const shown = touches(selection, line.from, line.to);
            ranges.push(...marginMarkRanges(state, shown, ref.from, ref.from + prefix.length));
            return;
          }
          case "EmphasisMark":
          case "StrikethroughMark": {
            const span = node.parent;
            if (!span || touches(selection, span.from, span.to)) return;
            ranges.push(hidden.range(ref.from, ref.to));
            return;
          }
          case "CodeMark": {
            const span = node.parent;
            if (span?.name !== "InlineCode" || touches(selection, span.from, span.to)) return;
            ranges.push(hidden.range(ref.from, ref.to));
            return;
          }
          case "ListItem": {
            // Only plain indentation before the marker (not a quote's `>`).
            const line = doc.lineAt(ref.from);
            const leading = doc.sliceString(line.from, ref.from);
            if (leading && !/^[ \t]+$/.test(leading)) return;
            const mark = node.getChild("ListMark");
            const marker = mark && listMarker(state, mark);
            if (!marker) return;
            const columns = leading.replace(/\t/g, "    ").length;
            ranges.push(hangingLine(columns + marker.columns).range(line.from));
            if (columns) ranges.push(listIndent(columns).range(line.from, ref.from));
            return;
          }
          case "ListMark": {
            const marker = listMarker(state, node);
            if (!marker) return;
            if (marker.kind === "ordered") {
              ranges.push(orderedMarker(marker.columns).range(ref.from, marker.to));
            } else if (marker.kind === "task") {
              ranges.push(Decoration.replace({ widget: new TaskBoxWidget(marker.task!) }).range(ref.from, marker.to));
            } else {
              ranges.push(Decoration.replace({ widget: new BulletWidget(bulletDepth(node)) }).range(ref.from, marker.to));
            }
            return;
          }
        }
      },
    });
  }

  for (const n of quotedLines) {
    if (!calloutLines.has(n)) ranges.push(quoteLine.range(doc.line(n).from));
  }
  for (const n of listGapLines) ranges.push(listGap.range(doc.line(n).from));
  return Decoration.set(ranges, true);
}

export const liveMarkersPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildLiveMarkerDecorations(view.state, view.visibleRanges, view.hasFocus);
    }

    update(update: ViewUpdate) {
      if (
        update.docChanged || update.selectionSet || update.viewportChanged || update.focusChanged
        || syntaxTree(update.startState) !== syntaxTree(update.state)
      ) {
        this.decorations = buildLiveMarkerDecorations(update.state, update.view.visibleRanges, update.view.hasFocus);
      }
    }
  },
  { decorations: (value) => value.decorations },
);

export const liveMarkers = [liveMarkersPlugin, liveMarkersTheme];
