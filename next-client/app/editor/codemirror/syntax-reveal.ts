import { syntaxTree } from "@codemirror/language";
import { type EditorState, type Range } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view";
import { quotedRowPrefix } from "../utils/quoted-table";
import { frontmatterFoldRangeOf } from "./frontmatter-fold";

// Syntax shows where you're writing: a line's Markdown marks (emphasis,
// strikethrough and inline-code marks, a heading's `#`s, a quote's or
// callout's `>`s, a callout's `[!type]`) are hidden on every line but the
// ones the caret or selection is on, where they show as typed (dimmed by
// highlight.ts, the `#`s and `>`s in the margin by live-markers.ts). An
// editor without focus shows none. List markers and task boxes, code fences,
// tables and frontmatter keep their own display; links fold on their own
// (link-display.ts) and rules show their dashes on the caret's line
// (horizontalRuleCursorPlugin).

const hidden = Decoration.replace({});
// A callout's `[!type]`, its fold sign and the space after them.
const REGEX_CALLOUT_TAG = /^((?:[ \t]*>)+[ \t]*)(\[![\w-]+\][+-]?[ \t]?)/;
const INLINE_MARKS = new Set(["EmphasisMark", "StrikethroughMark"]);

/** Line numbers the selection touches, or none while the editor isn't focused. */
export function activeLines(state: EditorState, hasFocus: boolean): Set<number> {
  const lines = new Set<number>();
  if (!hasFocus) return lines;
  for (const range of state.selection.ranges) {
    const last = state.doc.lineAt(range.to).number;
    for (let n = state.doc.lineAt(range.from).number; n <= last; n++) lines.add(n);
  }
  return lines;
}

// Extends a marker's range over the spaces after it ("## ", "> ").
function withTrailingSpace(state: EditorState, to: number): number {
  return state.doc.sliceString(to, to + 1) === " " ? to + 1 : to;
}

export function buildSyntaxRevealDecorations(
  state: EditorState,
  visibleRanges: readonly { from: number; to: number }[],
  active: Set<number>,
): DecorationSet {
  const ranges: Range<Decoration>[] = [];
  const { doc } = state;
  const isActive = (pos: number) => active.has(doc.lineAt(pos).number);
  const hide = (from: number, to: number) => {
    if (to > from) ranges.push(hidden.range(from, to));
  };
  const quoteLines = new Set<number>();
  // Frontmatter's `# comments` and closing `---` aren't Markdown.
  const frontmatterEnd = frontmatterFoldRangeOf(doc)?.closeTo ?? -1;

  for (const visible of visibleRanges) {
    syntaxTree(state).iterate({
      from: visible.from,
      to: visible.to,
      enter(ref) {
        if (ref.to <= frontmatterEnd) return ref.name === "Document";
        switch (ref.name) {
          case "FencedCode":
          case "CodeBlock":
          case "Table":
          case "HTMLBlock":
          case "CommentBlock":
            return false;
        }
        if (isActive(ref.from)) return;
        if (INLINE_MARKS.has(ref.name)) {
          hide(ref.from, ref.to);
        } else if (ref.name === "CodeMark" && ref.node.parent?.name === "InlineCode") {
          hide(ref.from, ref.to);
        } else if (ref.name === "HeaderMark") {
          // Setext underlines and closing `#`s stay as typed.
          const heading = ref.node.parent;
          if (heading?.name.startsWith("ATXHeading") && ref.from === heading.from) {
            hide(ref.from, withTrailingSpace(state, ref.to));
          }
        } else if (ref.name === "QuoteMark") {
          // One range per line covers every `>` of a nested quote, and a
          // callout's `[!type]` after them.
          const line = doc.lineAt(ref.from);
          // A quoted table's rows are inside its grid.
          if (quoteLines.has(line.number) || quotedRowPrefix(line.text)) return;
          quoteLines.add(line.number);
          const tag = REGEX_CALLOUT_TAG.exec(line.text);
          const prefix = /^(?:[ \t]*>)+[ \t]?/.exec(doc.sliceString(ref.from, line.to))![0];
          hide(ref.from, tag ? line.from + tag[0].length : ref.from + prefix.length);
        }
      },
    });
  }
  return ranges.length ? Decoration.set(ranges, true) : Decoration.none;
}

export const syntaxReveal = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildSyntaxRevealDecorations(view.state, view.visibleRanges, activeLines(view.state, view.hasFocus));
    }

    update(update: ViewUpdate) {
      if (
        update.docChanged || update.selectionSet || update.viewportChanged || update.focusChanged
        || syntaxTree(update.startState) !== syntaxTree(update.state)
      ) {
        this.decorations = buildSyntaxRevealDecorations(
          update.state,
          update.view.visibleRanges,
          activeLines(update.state, update.view.hasFocus),
        );
      }
    }
  },
  { decorations: (value) => value.decorations },
);
