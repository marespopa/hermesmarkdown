import { syntaxTree } from "@codemirror/language";
import { EditorSelection, EditorState, type Range } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, WidgetType } from "@codemirror/view";
import type { SyntaxNode } from "@lezer/common";
import { findFrontmatterFoldRange } from "./frontmatter-fold";

// Live markers: Markdown syntax stays out of sight until the caret reaches
// it, so a note reads like a page while it stays editable. Inline marks
// (`**`, `_`, `~~`, inline-code backticks) show while a caret or selection
// touches their span; a heading's `#`s and a quote's `>` show while the caret
// is on their line; a bullet's `-` reads as • (◦ when nested) until the caret
// touches it. An unfocused editor reveals nothing. Callouts, task items,
// ordered lists, fenced code and frontmatter keep their own display.

const hidden = Decoration.replace({});
const quoteLine = Decoration.line({ class: "cm-liveQuote" });
const REGEX_CALLOUT_START = /^(>\s*)+\[!\w+\]/;

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
    node.textContent = this.depth % 2 === 0 ? "•" : "◦";
    node.setAttribute("aria-hidden", "true");
    return node;
  }

  ignoreEvent() {
    return false;
  }
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
            if (touchesLine(state, selection, ref.from)) return;
            ranges.push(hidden.range(ref.from, withTrailingSpace(state, ref.to)));
            return;
          }
          case "QuoteMark": {
            const line = doc.lineAt(ref.from);
            quotedLines.add(line.number);
            if (touches(selection, line.from, line.to)) return;
            ranges.push(hidden.range(ref.from, withTrailingSpace(state, ref.to)));
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
          case "ListMark": {
            if (node.parent?.parent?.name !== "BulletList" || node.parent.getChild("Task")) return;
            const to = withTrailingSpace(state, ref.to);
            if (touches(selection, ref.from, to)) return;
            ranges.push(Decoration.replace({ widget: new BulletWidget(bulletDepth(node)) }).range(ref.from, ref.to));
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
  ".cm-liveBullet": {
    display: "inline-block",
    width: "1.1em",
    color: "var(--fg-muted)",
  },
});

export const liveMarkers = [liveMarkersPlugin, liveMarkersTheme];
