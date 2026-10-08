import { EditorView } from "@codemirror/view";

// Styles for live-markers.ts and the chips that stay in place while edited.
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
    transition: "opacity 120ms ease",
  },
  ".cm-marginMarks-off": {
    opacity: "0",
  },
  // A zero-width space gives a marks-only row a line box at its own size.
  ".cm-marginOnly::after": {
    content: '"\\200b"',
  },

  // A callout's type, in place of `> [!type]` away from the caret.
  ".cm-calloutLabel": {
    fontSize: "0.72em",
    fontWeight: "600",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    marginRight: "0.6em",
    cursor: "text",
  },
  // A fenced block's opening row while its fences are hidden: the language
  // sits in the row's top-right corner.
  ".cm-fenceHidden, .cm-fenceHidden *": {
    color: "transparent !important",
  },
  ".cm-codeFenceRow": {
    position: "relative",
  },
  ".cm-codeLanguage": {
    position: "absolute",
    right: "0",
    top: "0",
    fontSize: "0.75em",
    lineHeight: "inherit",
    color: "var(--fg-faint)",
    letterSpacing: "0.02em",
    pointerEvents: "none",
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
    color: "var(--link)",
    fontSize: "0.72em",
    fontWeight: "600",
    opacity: "0.55",
    marginLeft: "0.2em",
    cursor: "pointer",
  },
});
