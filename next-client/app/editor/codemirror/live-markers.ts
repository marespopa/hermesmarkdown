import { syntaxTree } from "@codemirror/language";
import { EditorSelection, EditorState, type Range } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, WidgetType } from "@codemirror/view";
import type { SyntaxNode } from "@lezer/common";
import { findFrontmatterFoldRange } from "./frontmatter-fold";

// Live markers: Markdown syntax stays out of sight until the caret reaches
// it, so a note reads like a page while it stays editable. Inline marks
// (`**`, `_`, `~~`, inline-code backticks) show while a caret or selection
// touches their span. A heading's `#`s and a quote's `>` show while the caret
// is on their line, hung in the margin left of the text so the words never
// move. List markers never change with the caret: a bullet's `-` always reads
// as • (◦ when nested), a task's `- [ ]` as a checkbox that ticks on a click,
// and an ordered item's `1.` sits in a muted, fixed-width box. An unfocused
// editor reveals nothing. Callouts, fenced code and frontmatter keep their
// own display.
//
// List geometry is in columns of LIST_INDENT_EM_PER_COLUMN: a two-space
// indent is as wide as a bullet's box ("- "), a three-space one as "1. ", so
// a nested item starts exactly under its parent's text. An item's wrapped
// lines hang at that same text edge.

const hidden = Decoration.replace({});
const quoteLine = Decoration.line({ class: "cm-liveQuote" });
const REGEX_CALLOUT_START = /^(>\s*)+\[!\w+\]/;
// A run of `>`s from a line's first QuoteMark: "> ", "> > ", ">>".
const REGEX_QUOTE_PREFIX = /^>(?:[ \t]*>)*[ \t]?/;
// A task box right after a bullet: " [ ] ", " [x] ", " [/] " (in progress), " [-] " (cancelled).
const REGEX_TASK_BOX = /^[ \t]\[([ xX/-])\](?=[ \t\n]|$)/;
const LIST_INDENT_EM_PER_COLUMN = 0.75;
// A bullet's or task's box is as wide as "- ", whatever the marker's spacing.
const BULLET_COLUMNS = 2;

const em = (columns: number) => `${columns * LIST_INDENT_EM_PER_COLUMN}em`;

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

// Structural marks (`## `, `> `) on the caret's line, drawn in the margin.
const marginMarks = Decoration.mark({ class: "cm-marginMarks" });

class BulletWidget extends WidgetType {
  constructor(readonly depth: number) {
    super();
  }

  eq(other: BulletWidget) {
    return other.depth === this.depth;
  }

  toDOM() {
    const node = document.createElement("span");
    node.className = "cm-liveBullet";
    node.style.width = em(BULLET_COLUMNS);
    node.textContent = this.depth % 2 === 0 ? "•" : "◦";
    node.setAttribute("aria-hidden", "true");
    return node;
  }

  ignoreEvent() {
    return false;
  }
}

// `state` is the character between the brackets.
class TaskBoxWidget extends WidgetType {
  constructor(readonly state: string) {
    super();
  }

  eq(other: TaskBoxWidget) {
    return other.state === this.state;
  }

  toDOM(view: EditorView) {
    const node = document.createElement("span");
    node.className = "cm-liveTask";
    node.style.width = em(BULLET_COLUMNS);
    node.dataset.state = this.state === " " ? "open" : this.state === "/" ? "progress" : this.state === "-" ? "cancelled" : "done";
    node.setAttribute("role", "checkbox");
    node.setAttribute("aria-checked", this.state === "x" ? "true" : this.state === "/" ? "mixed" : "false");
    const box = node.appendChild(document.createElement("span"));
    box.className = "cm-liveTask-box";
    node.addEventListener("mousedown", (event) => {
      event.preventDefault();
      toggleTaskBox(view, view.posAtDOM(node));
    });
    return node;
  }

  ignoreEvent() {
    return true;
  }
}

// Ticks the task whose widget starts at `markerFrom`, or clears a done one.
export function toggleTaskBox(view: EditorView, markerFrom: number): boolean {
  const line = view.state.doc.lineAt(markerFrom);
  const bracket = line.text.indexOf("[", markerFrom - line.from);
  if (bracket < 0) return false;
  const at = line.from + bracket + 1;
  const current = view.state.doc.sliceString(at, at + 1);
  view.dispatch({
    changes: { from: at, to: at + 1, insert: current.toLowerCase() === "x" ? " " : "x" },
    userEvent: "input.outline.task",
  });
  return true;
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

  for (const visible of visibleRanges) {
    syntaxTree(state).iterate({
      from: visible.from,
      to: visible.to,
      enter(ref) {
        if (ref.to <= frontmatterEnd) return ref.name === "Document";
        const node = ref.node;
        switch (ref.name) {
          case "Table":
          case "FencedCode":
          case "CodeBlock":
            return false;
          case "Blockquote":
            // Callouts keep their own `>` styling (highlight.ts, callout-fold.ts).
            return !REGEX_CALLOUT_START.test(doc.lineAt(ref.from).text);
          case "HeaderMark": {
            // Setext underlines and closing `#`s stay as typed.
            if (ref.from !== node.parent?.from || !node.parent.name.startsWith("ATXHeading")) return;
            const to = withTrailingSpace(state, ref.to);
            const deco = touchesLine(state, selection, ref.from) ? marginMarks : hidden;
            ranges.push(deco.range(ref.from, to));
            return;
          }
          case "QuoteMark": {
            // One range per line covers every `>` of a nested quote.
            const line = doc.lineAt(ref.from);
            if (quotedLines.has(line.number)) return;
            quotedLines.add(line.number);
            const prefix = REGEX_QUOTE_PREFIX.exec(doc.sliceString(ref.from, line.to))![0];
            const deco = touches(selection, line.from, line.to) ? marginMarks : hidden;
            ranges.push(deco.range(ref.from, ref.from + prefix.length));
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

  for (const n of quotedLines) ranges.push(quoteLine.range(doc.line(n).from));
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

export const liveMarkersTheme = EditorView.theme({
  ".cm-liveQuote": {
    borderLeft: "3px solid var(--border)",
    paddingLeft: "0.9em !important",
  },
  // Hanging indent: a transparent border, not padding (drawSelection() reads
  // the first line's padding-left for every selection rect), pulled back on
  // the first row by a negative text-indent.
  ".cm-listLine": {
    borderLeft: "var(--list-hang) solid transparent",
    textIndent: "calc(-1 * var(--list-hang))",
  },
  ".cm-listLine *": {
    textIndent: "0",
  },
  ".cm-listIndent": {
    display: "inline-block",
    overflow: "hidden",
    verticalAlign: "top",
  },
  ".cm-liveBullet": {
    display: "inline-block",
    color: "var(--fg-muted)",
  },
  ".cm-listNumber": {
    display: "inline-block",
    whiteSpace: "pre",
    color: "var(--fg-muted)",
    fontVariantNumeric: "tabular-nums",
  },
  ".cm-liveTask": {
    display: "inline-block",
    cursor: "pointer",
    verticalAlign: "baseline",
  },
  ".cm-liveTask-box": {
    display: "inline-block",
    boxSizing: "border-box",
    width: "0.85em",
    height: "0.85em",
    verticalAlign: "-0.1em",
    border: "1.5px solid var(--fg-faint)",
    borderRadius: "0.25em",
    transition: "background-color 120ms ease, border-color 120ms ease",
  },
  ".cm-liveTask[data-state=done] .cm-liveTask-box": {
    borderColor: "var(--fg-muted)",
    backgroundColor: "var(--fg-muted)",
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M4 8.5l2.5 2.5L12 5.5' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
    backgroundSize: "100% 100%",
  },
  ".cm-liveTask[data-state=progress] .cm-liveTask-box": {
    backgroundImage: "linear-gradient(to right, var(--fg-faint) 50%, transparent 50%)",
  },
  ".cm-liveTask[data-state=cancelled] .cm-liveTask-box": {
    backgroundImage: "linear-gradient(var(--fg-faint), var(--fg-faint))",
    backgroundSize: "60% 1.5px",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  },
  // Out of the text flow entirely, so revealing the marks can't move a word,
  // grow the line or re-balance a heading's wrap. With left/top unset it
  // sits at its static position, the start of the line's first row, at the
  // line's own size, so it shares the text's baseline; the transform then
  // shrinks it and moves it into the margin, which layout never sees.
  ".cm-marginMarks": {
    position: "absolute",
    whiteSpace: "pre",
    fontWeight: "400",
    letterSpacing: "0",
    color: "var(--fg-faint)",
    transform: "translateX(-100%) scale(0.6)",
    transformOrigin: "right 70%",
  },
});

export const liveMarkers = [liveMarkersPlugin, liveMarkersTheme];
