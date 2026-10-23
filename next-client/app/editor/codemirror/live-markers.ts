import { syntaxTree } from "@codemirror/language";
import { EditorState, type Range } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, WidgetType } from "@codemirror/view";
import type { SyntaxNode } from "@lezer/common";
import { frontmatterRangeOf } from "./frontmatter-block";
import { liveMarkersTheme } from "./live-markers-theme";
import { taskStatusFromChar, type TaskStatus } from "@/app/utils/task-status";
import { cycleTaskBox } from "./live-markers-widgets";

// Live markers: inline marks show as typed while the caret touches their token,
// a heading's `#`s and a quote's `>`s on the caret's lines;
// syntax-reveal.ts hides the marks elsewhere.
// Shown syntax is dimmed (inline marks by highlight.ts). A heading's `#`s and a quote's or callout's `>`
// hang in the margin left of the text (a heading inside a quote hangs its
// `#`s there too, after the `>`s, and so do the `>`s of a quoted code
// block's lines). List markers stay inline, as typed,
// with their real spaces; a task's marker takes its status colour, and
// Mod-click on it moves the task on a status. Blank lines inside a list are
// half height. Tables and frontmatter keep their own display.

// A quote's line, one bar per `>` (live-markers-theme.ts), so a nested
// quote reads as nested.
const quoteLines = new Map<number, Decoration>();
function quoteLine(depth: number): Decoration {
  let deco = quoteLines.get(depth);
  if (!deco) {
    deco = Decoration.line({ class: "cm-liveQuote", attributes: { style: `--quote-depth: ${depth}` } });
    quoteLines.set(depth, deco);
  }
  return deco;
}
const listGap = Decoration.line({ class: "cm-listGap" });
const REGEX_CALLOUT_START = /^(>\s*)+\[!\w+\]/;
// A run of `>`s from a line's first QuoteMark: "> ", "> > ", ">>".
const REGEX_QUOTE_PREFIX = /^>(?:[ \t]*>)*[ \t]?/;
// The same run from the start of a line, after any indent.
const REGEX_LINE_QUOTE_PREFIX = /^[ \t]*>(?:[ \t]*>)*[ \t]?/;
// A task box right after a bullet or number: " [ ] ", " [x] ", " [/] " (in progress),
// " [!] " (on hold), " [-] " (cancelled).
const REGEX_TASK_BOX = /^[ \t]\[([ xX/!-])\](?=[ \t\n]|$)/;

// A list marker (`- `, `1. `, `- [ ] `) stays where it's typed, before the
// item's text, muted; a task's takes its status colour. Nested items are
// indented by their own spaces (drawn letter-wide), so a list looks just like
// its Markdown.
const listMarkerMark = Decoration.mark({ class: "cm-listMarker" });
// A nested item's leading spaces, set in the monospace face so each is as
// wide as a letter: two or four typed spaces read as a clear step, as in a
// fixed-width editor. They stay the spaces in the file.
const listIndent = Decoration.mark({ class: "cm-listIndent" });

function taskMarker(task: string) {
  return Decoration.mark({
    class: "cm-listMarker cm-listTask",
    attributes: { "data-state": TASK_DATA_STATE[taskStatusFromChar(task)] },
  });
}

const TASK_DATA_STATE: Record<TaskStatus, string> = {
  todo: "open",
  prog: "progress",
  hold: "hold",
  done: "done",
  cancelled: "cancelled",
};

// Structural marks (`## `, `> `) sit in the margin, out of the text flow, so
// a heading or quote's text lines up with the paragraphs around it.
const marginMarks = Decoration.mark({ class: "cm-marginMarks" });
// A row holding only margin marks (`## ` before its first letter) has no text
// in the flow: it would collapse, and the caret at its end would be drawn
// (and a click on it would land) by the marks in the margin. A zero-width
// strut after the marks keeps the row at its own height and gives the caret
// after `## ` its place in the text column.
class MarginStrutWidget extends WidgetType {
  eq() {
    return true;
  }
  toDOM() {
    const strut = document.createElement("span");
    strut.className = "cm-marginStrut";
    strut.textContent = "\u200b";
    return strut;
  }
  // Clicks on the strut place the caret (at the row's end) like on text.
  ignoreEvent() {
    return false;
  }
}
const marginStrut = Decoration.widget({ widget: new MarginStrutWidget(), side: 1 });

function marginMarkRanges(state: EditorState, from: number, to: number): Range<Decoration>[] {
  const out = [marginMarks.range(from, to)];
  if (to === state.doc.lineAt(from).to) out.push(marginStrut.range(to));
  return out;
}

// Extends a marker's range over one following space ("# ", "> ", "- ").
function withTrailingSpace(state: EditorState, to: number): number {
  return state.doc.sliceString(to, to + 1) === " " ? to + 1 : to;
}

export function insideQuote(node: SyntaxNode): boolean {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (parent.name === "Blockquote") return true;
  }
  return false;
}

/** Whether a quoted heading's `#`s (its HeaderMark at `from`) follow straight
 *  on its line's `>`s, so they hang in the margin with them (`> ## `). A
 *  heading after a quoted list marker keeps its `#`s inline. */
export function headingHangsWithQuote(state: EditorState, from: number): boolean {
  const line = state.doc.lineAt(from);
  const prefix = REGEX_LINE_QUOTE_PREFIX.exec(line.text);
  return prefix !== null && line.from + prefix[0].length === from;
}

export interface ListMarker {
  kind: "bullet" | "task" | "ordered";
  /** End of the marker, its following space and any task box. */
  to: number;
  /** Task state: the character between the brackets. */
  task?: string;
  /** Where a task's `[` starts. */
  boxFrom?: number;
  /** A numbered task ("1. [ ] "). */
  ordered?: boolean;
}

export function listMarker(state: EditorState, mark: SyntaxNode): ListMarker | null {
  const list = mark.parent?.parent?.name;
  const to = withTrailingSpace(state, mark.to);
  if (list !== "OrderedList" && list !== "BulletList") return null;
  const ordered = list === "OrderedList";
  // A task box after either marker: "- [ ] " or "1. [ ] ".
  const box = REGEX_TASK_BOX.exec(state.doc.sliceString(mark.to, mark.to + 5));
  if (!box) return { kind: ordered ? "ordered" : "bullet", to };
  const taskTo = withTrailingSpace(state, mark.to + box[0].length);
  return { kind: "task", to: taskTo, task: box[1].toLowerCase(), boxFrom: mark.to + 1, ordered };
}

export function buildLiveMarkerDecorations(
  state: EditorState,
  visibleRanges: readonly { from: number; to: number }[],
): DecorationSet {
  const ranges: Range<Decoration>[] = [];
  const { doc } = state;
  // Frontmatter's closing `---` parses as a setext underline; leave it alone.
  const frontmatterEnd = frontmatterRangeOf(doc)?.closeTo ?? -1;
  // Each quoted line's margin run: its `>`s, then a heading's `#`s if any.
  const quoteMargins = new Map<number, { from: number; to: number }>();
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
          case "CodeText":
            return false;
          // A quoted code block's lines still start with the quote's `>`s;
          // its code is left alone (CodeText).
          case "CodeBlock":
          case "FencedCode":
            return insideQuote(node);
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
            for (let n = first.number; n <= doc.lineAt(ref.to).number; n++) calloutLines.add(n);
            return;
          }
          case "HeaderMark": {
            // Setext underlines and closing `#`s stay as typed.
            if (ref.from !== node.parent?.from || !node.parent.name.startsWith("ATXHeading")) return;
            const to = withTrailingSpace(state, ref.to);
            if (!insideQuote(node)) {
              ranges.push(...marginMarkRanges(state, ref.from, to));
            } else if (headingHangsWithQuote(state, ref.from)) {
              // A quote's or callout's heading: its `#`s hang after the `>`s.
              const quote = quoteMargins.get(doc.lineAt(ref.from).number);
              if (quote) quote.to = to;
            }
            return;
          }
          case "QuoteMark": {
            // One range per line covers every `>` of a nested quote.
            const line = doc.lineAt(ref.from);
            if (quoteMargins.has(line.number)) return;
            const prefix = REGEX_QUOTE_PREFIX.exec(doc.sliceString(ref.from, line.to))![0];
            quoteMargins.set(line.number, { from: ref.from, to: ref.from + prefix.length });
            return;
          }
          case "ListMark": {
            const marker = listMarker(state, node);
            if (!marker) return;
            // A nested item's spaces, after a quote's or callout's `> ` if any.
            const line = doc.lineAt(ref.from);
            const quote = REGEX_QUOTE_PREFIX.exec(line.text)?.[0] ?? "";
            const indentFrom = line.from + (insideQuote(node) ? quote.length : 0);
            if (ref.from > indentFrom && /^[ \t]+$/.test(doc.sliceString(indentFrom, ref.from))) {
              ranges.push(listIndent.range(indentFrom, ref.from));
            }
            ranges.push((marker.kind === "task" ? taskMarker(marker.task!) : listMarkerMark).range(ref.from, marker.to));
            return;
          }
        }
      },
    });
  }

  for (const [n, { from, to }] of quoteMargins) {
    ranges.push(...marginMarkRanges(state, from, to));
    const depth = doc.sliceString(from, to).split(">").length - 1;
    if (!calloutLines.has(n)) ranges.push(quoteLine(depth).range(doc.line(n).from));
  }
  for (const n of listGapLines) ranges.push(listGap.range(doc.line(n).from));
  return Decoration.set(ranges, true);
}

export const liveMarkersPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildLiveMarkerDecorations(view.state, view.visibleRanges);
    }

    update(update: ViewUpdate) {
      if (
        update.docChanged || update.viewportChanged || syntaxTree(update.startState) !== syntaxTree(update.state)
      ) {
        this.decorations = buildLiveMarkerDecorations(update.state, update.view.visibleRanges);
      }
    }
  },
  {
    decorations: (value) => value.decorations,
    eventHandlers: {
      // Mod-click on a task's marker moves it on a status, like Mod-Enter, with
      // its stamps; a plain click places the caret, so the status can be typed.
      mousedown(event, view) {
        if (!(event.metaKey || event.ctrlKey) || event.button !== 0) return false;
        const box = (event.target as HTMLElement | null)?.closest?.(".cm-listTask");
        if (!box) return false;
        event.preventDefault();
        return cycleTaskBox(view, view.posAtDOM(box));
      },
    },
  },
);

export const liveMarkers = [liveMarkersPlugin, liveMarkersTheme];
