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
    // caretColor is intentionally omitted here: drawSelection() owns the
    // native caret by setting `caret-color: transparent` in its base theme.
    // A user-theme `caret-color` would have higher CSS specificity and
    // override the transparent value, causing both the native caret and the
    // drawSelection cursor widget to render simultaneously — leading to the
    // cursor appearing to flicker or wash out to white in light mode after
    // typing. The custom cursor (.cm-cursor below) is the only visible cursor.
    fontFamily: "inherit",
    fontSize: "var(--editor-font-size, inherit)",
    lineHeight: "var(--editor-line-height, inherit)",
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
  // !important: Tailwind's preflight resets border-color to currentColor on
  // all elements, which can override this rule for equal-specificity selectors.
  // Pinning with !important guarantees the custom cursor is always clay-colored
  // in both light and dark mode, regardless of surrounding decoration classes.
  ".cm-cursor": {
    borderLeftColor: "var(--clay) !important",
  },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
    backgroundColor: "var(--clay) !important",
    opacity: "0.25",
  },
  ".cm-gutters": {
    display: "none",
  },
  // CM6's default fold-placeholder widget ("…") ships a hardcoded light-gray
  // box (@codemirror/language baseTheme) with no dark-mode variant, so it
  // reads as a stray white pill in dark mode. Callout fold state is already
  // shown by our own chevron UI (use-codemirror-callout-fold.ts), so the
  // placeholder itself is redundant — made transparent rather than reskinned.
  // Do NOT zero its width/use `display: none`/`overflow: hidden`: CM6's
  // posAtCoords hit-testing walks this widget's DOM box and needs it to keep
  // its normal (glyph-sized) layout dimensions, or clicks near it crash.
  ".cm-foldPlaceholder": {
    backgroundColor: "transparent",
    border: "none",
    color: "transparent",
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

// General-purpose lezer tag → color mapping for fenced code blocks (any
// language, not just markdown), used by the Rendered pane's embedded CM6
// code-block NodeView (milkdown/code-block-view.ts). Distinct from
// markdownHighlightStyle above since that one only covers markdown's own
// small tag set (heading/strong/link/…) — real language grammars use
// keyword/string/number/comment/etc, which need their own mapping. Kept to
// the app's existing accent palette (--clay, --moss) rather than a
// rainbow scheme, to match the rest of the UI.
export const codeBlockHighlightStyle = HighlightStyle.define([
  { tag: t.keyword, color: "var(--clay)", fontWeight: "600" },
  { tag: [t.name, t.deleted, t.character, t.macroName], color: "var(--fg)" },
  { tag: [t.function(t.variableName), t.labelName], color: "var(--moss)" },
  { tag: [t.color, t.constant(t.name), t.standard(t.name), t.atom, t.bool, t.special(t.variableName)], color: "var(--clay)" },
  { tag: [t.definition(t.name), t.separator], color: "var(--fg)" },
  { tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: "var(--moss)" },
  { tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: "var(--clay)" },
  { tag: [t.meta, t.comment], color: "var(--fg-faint)", fontStyle: "italic" },
  { tag: t.strong, fontWeight: "bold" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.strikethrough, textDecoration: "line-through" },
  { tag: [t.processingInstruction, t.string, t.inserted], color: "var(--moss)" },
  { tag: t.invalid, color: "#e5484d" },
]);
