import { EditorView } from "@codemirror/view";
import { MONO_FONT_STACK } from "@/app/atoms/ui-atoms";

// The reader's code font (--font-code, globals.scss), with the default face
// where the variable isn't set, as on a highlighted copy outside the app.
export const CODE_FONT = `var(--font-code, ${MONO_FONT_STACK})`;

// Styles for live-markers.ts and the chips that stay in place while edited.
export const liveMarkersTheme = EditorView.theme({
  ".cm-liveQuote": {
    borderLeft: "3px solid var(--border)",
    paddingLeft: "0.9em !important",
    fontStyle: "italic",
  },
  // A nested list item's leading spaces in the monospace face: each as wide as
  // a letter, so nesting reads as it would in a fixed-width editor.
  ".cm-listIndent": {
    fontFamily: MONO_FONT_STACK,
    whiteSpace: "pre",
    letterSpacing: "0",
  },
  // List markers stay as typed, inline and muted.
  ".cm-listMarker": {
    whiteSpace: "pre",
    color: "var(--fg-faint)",
    fontVariantNumeric: "tabular-nums",
  },
  // The syntax highlighter colours parts of a marker on its own (a task's
  // `[x]` as clay); the marker's colour wins.
  ".cm-listMarker *": {
    color: "inherit",
  },
  // A task's marker takes its status colour, as on the Tasks page: to do and
  // cancelled stay faint, in progress clay, on hold ochre, done moss.
  ".cm-listTask[data-state=progress]": {
    color: "var(--task-prog)",
  },
  ".cm-listTask[data-state=hold]": {
    color: "var(--task-hold)",
  },
  ".cm-listTask[data-state=done]": {
    color: "var(--task-done)",
  },
  // Out of the text flow entirely, so the marks can't move a word, grow the
  // line or re-balance a heading's wrap. With left/top unset it
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

  // A callout reads as one rounded, tinted card (lines tagged in highlight.ts),
  // its text inset from the card's edge.
  ".cm-line.cm-callout": {
    paddingLeft: "0.9em !important",
    paddingRight: "0.75em !important",
  },
  ".cm-line.cm-callout-start": {
    borderTopLeftRadius: "12px",
    borderTopRightRadius: "12px",
    paddingTop: "0.4em",
  },
  ".cm-line.cm-callout-end": {
    borderBottomLeftRadius: "12px",
    borderBottomRightRadius: "12px",
    paddingBottom: "0.4em",
  },
  // Code inside a callout (highlight-blocks.ts): monospaced on the callout's
  // own tint, so the card stays one piece.
  ".cm-callout-code": {
    fontFamily: CODE_FONT,
    fontSize: "0.875em",
    letterSpacing: "0",
  },
  // A blank line between list items: kept, but at half height, so a loose
  // list still reads as one list.
  ".cm-listGap": {
    lineHeight: "calc(var(--editor-line-height, 1.65) * 0.5)",
  },
  // Task text by state (highlight.ts): done fades with a light strike,
  // cancelled is struck through and fainter, in progress stays as written.
  ".cm-task-done": {
    color: "var(--fg-muted)",
    textDecorationLine: "line-through",
    textDecorationColor: "color-mix(in srgb, var(--fg-muted) 45%, transparent)",
    textDecorationThickness: "1px",
  },
  ".cm-task-cancelled": {
    color: "var(--fg-faint)",
    opacity: "0.7",
    textDecorationLine: "line-through",
    textDecorationThickness: "1px",
  },
  // A tag or date chip being edited: the chip's look, laid out as text.
  ".cm-tag-pill.cm-chip-editing, .cm-annotation-display.cm-chip-editing": {
    display: "inline",
    verticalAlign: "baseline",
    boxDecorationBreak: "clone",
    WebkitBoxDecorationBreak: "clone",
    cursor: "text",
  },
  // A link's folded URL while its label is being edited.
  ".cm-link-url-chip": {
    color: "var(--fg-muted)",
    fontSize: "0.85em",
    fontWeight: "600",
    marginLeft: "0.2em",
    cursor: "pointer",
  },
});
