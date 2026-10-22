import { syntaxTree } from "@codemirror/language";
import { type EditorState, type Range } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view";
import { quotedRowPrefix } from "../utils/quoted-table";
import { frontmatterFoldRangeOf } from "./frontmatter-fold";
import { headingHangsWithQuote, insideQuote } from "./live-markers";

// Syntax shows where you're writing. An inline mark (emphasis, strikethrough,
// inline code) shows, dimmed by highlight.ts, while the caret or a selection
// touches its token (edges included); the rest of the line stays rendered. A
// heading's `#`s, a quote's or callout's `>`s and a callout's `[!type]` show on
// the caret's lines (the `#`s and `>`s in the margin by live-markers.ts, a
// quoted code block's `>`s included). Margin marks are only made invisible
// elsewhere, so revealing them leaves the line's layout as it was and the
// text doesn't jump; a callout's `[!type]`, inline, is hidden. An
// editor without focus shows none. List markers and task boxes, code fences,
// tables and frontmatter keep their own display; links fold on their own
// (link-display.ts) and rules show their dashes on the caret's line
// (horizontalRuleCursorPlugin).

const hidden = Decoration.replace({});
// A line whose margin marks (live-markers.ts) are kept but not shown.
const marginMarksHidden = Decoration.line({ class: "cm-marginMarksHidden" });
// A callout's `[!type]`, its fold sign and the space after them.
const REGEX_CALLOUT_TAG = /^((?:[ \t]*>)+[ \t]*)(\[![\w-]+\][+-]?[ \t]?)/;
const INLINE_MARKS = new Set(["EmphasisMark", "StrikethroughMark"]);
const INLINE_TOKENS = new Set(["Emphasis", "StrongEmphasis", "Strikethrough", "InlineCode"]);

/** Where the selection reveals syntax: whole lines (block marks) and the
 *  ranges themselves (inline tokens). Both empty when the editor isn't focused. */
export interface RevealAt {
  lines: Set<number>;
  ranges: readonly { from: number; to: number }[];
}

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

export function revealAt(state: EditorState, hasFocus: boolean): RevealAt {
  return { lines: activeLines(state, hasFocus), ranges: hasFocus ? state.selection.ranges : [] };
}

// Edges count, like a link's label (selectionTouchesLink).
function touches(ranges: RevealAt["ranges"], from: number, to: number): boolean {
  return ranges.some((r) => r.from <= to && r.to >= from);
}

// Extends a marker's range over the spaces after it ("## ", "> ").
function withTrailingSpace(state: EditorState, to: number): number {
  return state.doc.sliceString(to, to + 1) === " " ? to + 1 : to;
}

export function buildSyntaxRevealDecorations(
  state: EditorState,
  visibleRanges: readonly { from: number; to: number }[],
  reveal: RevealAt,
): DecorationSet {
  const ranges: Range<Decoration>[] = [];
  const { doc } = state;
  const lineRevealed = (pos: number) => reveal.lines.has(doc.lineAt(pos).number);
  const hide = (from: number, to: number) => {
    if (to > from) ranges.push(hidden.range(from, to));
  };
  const quoteLines = new Set<number>();
  // Lines whose margin marks are hidden: a heading's, a quote's or callout's.
  const marginLines = new Set<number>();
  // Frontmatter's `# comments` and closing `---` aren't Markdown.
  const frontmatterEnd = frontmatterFoldRangeOf(doc)?.closeTo ?? -1;

  for (const visible of visibleRanges) {
    syntaxTree(state).iterate({
      from: visible.from,
      to: visible.to,
      enter(ref) {
        if (ref.to <= frontmatterEnd) return ref.name === "Document";
        switch (ref.name) {
          // A quoted code block's lines still start with the quote's `>`s;
          // its code is left alone (CodeText).
          case "FencedCode":
          case "CodeBlock":
            return insideQuote(ref.node);
          case "CodeText":
          case "Table":
          case "HTMLBlock":
          case "CommentBlock":
            return false;
        }
        if (INLINE_MARKS.has(ref.name) || (ref.name === "CodeMark" && ref.node.parent?.name === "InlineCode")) {
          const token = ref.node.parent;
          if (token && INLINE_TOKENS.has(token.name) && touches(reveal.ranges, token.from, token.to)) return;
          hide(ref.from, ref.to);
        } else if (ref.name === "HeaderMark") {
          if (lineRevealed(ref.from)) return;
          // Setext underlines and closing `#`s stay as typed.
          const heading = ref.node.parent;
          if (heading?.name.startsWith("ATXHeading") && ref.from === heading.from) {
            // A quoted heading's `#`s hang with the `>`s before them (the
            // quote's line hides both), or sit inline after a list marker.
            if (!insideQuote(ref.node)) marginLines.add(doc.lineAt(ref.from).number);
            else if (!headingHangsWithQuote(state, ref.from)) hide(ref.from, withTrailingSpace(state, ref.to));
          }
        } else if (ref.name === "QuoteMark") {
          if (lineRevealed(ref.from)) return;
          // Every `>` of a nested quote hangs in one margin run; a callout's
          // `[!type]` after them is inline.
          const line = doc.lineAt(ref.from);
          // A quoted table's rows are inside its grid.
          if (quoteLines.has(line.number) || quotedRowPrefix(line.text)) return;
          quoteLines.add(line.number);
          marginLines.add(line.number);
          const tag = REGEX_CALLOUT_TAG.exec(line.text);
          if (tag) hide(line.from + tag[1].length, line.from + tag[0].length);
        }
      },
    });
  }
  for (const n of marginLines) ranges.push(marginMarksHidden.range(doc.line(n).from));
  return ranges.length ? Decoration.set(ranges, true) : Decoration.none;
}

export const syntaxReveal = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildSyntaxRevealDecorations(view.state, view.visibleRanges, revealAt(view.state, view.hasFocus));
    }

    update(update: ViewUpdate) {
      if (
        update.docChanged || update.selectionSet || update.viewportChanged || update.focusChanged
        || syntaxTree(update.startState) !== syntaxTree(update.state)
      ) {
        this.decorations = buildSyntaxRevealDecorations(
          update.state,
          update.view.visibleRanges,
          revealAt(update.state, update.view.hasFocus),
        );
      }
    }
  },
  { decorations: (value) => value.decorations },
);
