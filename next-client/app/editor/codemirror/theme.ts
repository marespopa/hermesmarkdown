import { EditorView } from "@codemirror/view";
import { HighlightStyle } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

// Structural theme only — no color literals. Colors come from the
// HighlightStyle below, which references the same CSS custom properties
// as the rest of the app (app/globals.scss :root / .dark), so toggling
// html.dark repaints CM6 for free.
export const baseTheme = EditorView.theme({
  "&": {
    color: "var(--fg)",
    backgroundColor: "transparent",
    height: "100%",
  },
  "&.cm-focused": {
    outline: "none",
  },
  ".cm-content": {
    caretColor: "var(--clay)",
    fontFamily: "inherit",
    fontSize: "var(--editor-font-size, inherit)",
    lineHeight: "var(--editor-line-height, inherit)",
    letterSpacing: "var(--editor-letter-spacing, inherit)",
    padding: 0,
  },
  ".cm-line": {
    padding: 0,
  },
  "&.cm-editor": {
    height: "100%",
  },
  ".cm-scroller": {
    fontFamily: "inherit",
    overflow: "visible",
  },
  ".cm-cursor": {
    borderLeftColor: "var(--clay)",
  },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
    backgroundColor: "var(--clay) !important",
    opacity: "0.25",
  },
  ".cm-gutters": {
    display: "none",
  },
});

// The slash-command menu is CodeMirror's built-in autocomplete tooltip
// (createSlashMenuSource in slash-menu.ts feeds it via `autocompletion()`).
// Left undstyled it falls back to @codemirror/autocomplete's own baseTheme —
// monospace font, 250px-wide list, flat blue selection — which reads as a
// bare browser widget next to the app's chrome/border/rounded-corner menus
// (CommandPalette, TableCallout). This reskins it to match those.
export const slashMenuTheme = EditorView.theme({
  ".cm-tooltip.cm-tooltip-autocomplete": {
    backgroundColor: "var(--chrome)",
    border: "1px solid var(--border)",
    borderRadius: "0.75rem",
    boxShadow: "0 12px 28px rgba(0, 0, 0, 0.18)",
    overflow: "hidden",
  },
  ".cm-tooltip.cm-tooltip-autocomplete > ul": {
    fontFamily: "inherit",
    minWidth: "260px",
    maxWidth: "min(360px, 90vw)",
    maxHeight: "17em",
    padding: "6px",
    margin: 0,
  },
  ".cm-tooltip.cm-tooltip-autocomplete > ul > li": {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    padding: "7px 10px",
    borderRadius: "0.5rem",
    fontSize: "14px",
    lineHeight: "1.3",
    color: "var(--fg)",
  },
  ".cm-tooltip-autocomplete ul li[aria-selected]": {
    backgroundColor: "color-mix(in srgb, var(--clay) 14%, transparent)",
    color: "var(--fg)",
  },
  ".cm-completionMatchedText": {
    textDecoration: "none",
    color: "var(--clay)",
  },
  ".cm-completionDetail": {
    marginLeft: 0,
    fontStyle: "normal",
    fontSize: "12px",
    color: "var(--fg-faint)",
    whiteSpace: "nowrap",
  },
});

export const markdownHighlightStyle = HighlightStyle.define([
  { tag: t.heading, fontWeight: "700", color: "var(--fg)" },
  { tag: t.strong, fontWeight: "700", color: "var(--fg)" },
  { tag: t.emphasis, fontStyle: "italic", color: "var(--fg)" },
  { tag: t.strikethrough, textDecoration: "line-through", color: "var(--fg-muted)" },
  { tag: t.link, color: "var(--clay)", textDecoration: "underline" },
  { tag: t.url, color: "var(--clay)" },
  { tag: t.monospace, fontFamily: "var(--font-mono, monospace)", color: "var(--moss)" },
  { tag: t.quote, color: "var(--fg-muted)", fontStyle: "italic" },
  { tag: t.list, color: "var(--fg)" },
  { tag: t.meta, color: "var(--fg-faint)" },
  { tag: t.processingInstruction, color: "var(--fg-faint)" },
]);

// The custom markdown-highlight ViewPlugin (highlight.ts) is a direct port
// of the app's existing regex tokenizer and owns all visual coloring;
// this lezer-based HighlightStyle is intentionally unused for now to avoid
// double-applying/conflicting styles. Kept in case a lezer-tree-based pass
// (better perf, real nesting awareness) replaces the regex port later.
export function editorTheme() {
  return [baseTheme, slashMenuTheme];
}
