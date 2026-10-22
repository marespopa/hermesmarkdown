import { EditorView } from "@codemirror/view";
import { MONO_FONT_STACK } from "@/app/atoms/ui-atoms";

// The reader's code font (--font-code, globals.scss), with the default face
// where the variable isn't set, as on a highlighted copy outside the app.
export const CODE_FONT = `var(--font-code, ${MONO_FONT_STACK})`;

// A quote's or callout's inset in body-text units, not `em`: a heading line
// in it has its own, larger size, and would start further in than the text.
const BODY_EM = "var(--editor-font-size, 17px)";
const QUOTE_INSET = `calc(${BODY_EM} * 0.9)`;

// Styles for live-markers.ts and the chips that stay in place while edited.
export const liveMarkersTheme = EditorView.theme({
  ".cm-liveQuote": {
    borderLeft: "3px solid var(--border)",
    paddingLeft: `${QUOTE_INSET} !important`,
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
  // Off the caret's lines (syntax-reveal.ts) margin marks stay in the DOM,
  // unseen, so showing them again changes nothing in the line's layout.
  ".cm-marginMarksHidden .cm-marginMarks": {
    visibility: "hidden",
  },

  // On a code line the `>`s hang outside the code's panel, at the card's text
  // edge like the other lines', not at the inset code.
  ".cm-callout-codeblock .cm-marginMarks": {
    transform: `translateX(calc(-100% - ${BODY_EM} * 0.75)) scale(0.6)`,
  },

  // A callout reads as one rounded, tinted card (lines tagged in highlight.ts),
  // its text, headings included, inset the same from the card's edge.
  ".cm-line.cm-callout": {
    paddingLeft: `${QUOTE_INSET} !important`,
    paddingRight: `calc(${BODY_EM} * 0.75) !important`,
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
  // Fenced code inside a callout (highlight-blocks.ts): a code block of its
  // own on the card, as at the top level. Its panel is drawn behind the text
  // (isolated, so it stays above the card's tint) from the card's text edge,
  // so it lines up with the callout's text; the code sits inset in it.
  ".cm-line.cm-callout-codeblock": {
    position: "relative",
    isolation: "isolate",
    paddingLeft: `calc(${QUOTE_INSET} + ${BODY_EM} * 0.75) !important`,
    paddingRight: `calc(${BODY_EM} * 1.5) !important`,
    fontFamily: CODE_FONT,
    fontFeatureSettings: '"calt" 1, "zero" 1',
    fontSize: "0.875em",
    letterSpacing: "0",
    lineHeight: "1.6",
  },
  ".cm-line.cm-callout-codeblock::before": {
    content: '""',
    position: "absolute",
    zIndex: "-1",
    top: "0",
    bottom: "0",
    left: QUOTE_INSET,
    right: `calc(${BODY_EM} * 0.75)`,
    backgroundColor: "color-mix(in srgb, var(--fg) 5%, transparent)",
    borderInline: "1px solid color-mix(in srgb, var(--fg) 9%, transparent)",
    pointerEvents: "none",
  },
  // The same room above and below as a top-level block (editor-typography.scss),
  // so the line numbers' code shapes fit it too (line-numbers.ts).
  ".cm-line.cm-callout-codeblock-start": {
    paddingTop: "0.75em",
  },
  ".cm-line.cm-callout-codeblock-start::before": {
    top: "0.35em",
    borderTop: "1px solid color-mix(in srgb, var(--fg) 9%, transparent)",
    borderTopLeftRadius: "0.5rem",
    borderTopRightRadius: "0.5rem",
  },
  ".cm-line.cm-callout-codeblock-end": {
    paddingBottom: "0.75em !important",
  },
  ".cm-line.cm-callout-codeblock-end::before": {
    bottom: "0.35em",
    borderBottom: "1px solid color-mix(in srgb, var(--fg) 9%, transparent)",
    borderBottomLeftRadius: "0.5rem",
    borderBottomRightRadius: "0.5rem",
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
