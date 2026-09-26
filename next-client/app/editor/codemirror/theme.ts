import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
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
  ".cm-frontmatter-line": {
    backgroundColor: "var(--frontmatter-bg)",
    color: "var(--fg-faint)",
    fontSize: "0.94em",
    fontWeight: "400",
    letterSpacing: "0.005em",
    paddingLeft: "0.55rem",
    paddingRight: "0.55rem",
    transition: "background-color 150ms ease, color 150ms ease",
  },
  ".cm-frontmatter-line *": {
    fontWeight: "400 !important",
  },
  ".cm-frontmatter-key": {
    color: "var(--fg-muted)",
    fontWeight: "400 !important",
  },
  ".cm-frontmatter-separator": {
    color: "var(--fg-faint)",
    opacity: "0.55",
  },
  ".cm-frontmatter-line.cm-frontmatter-start": {
    borderRadius: "0.55rem 0.55rem 0 0",
    paddingTop: "0.15rem",
  },
  ".cm-frontmatter-line.cm-frontmatter-end": {
    borderRadius: "0 0 0.55rem 0.55rem",
    paddingBottom: "0.15rem",
  },
  ".cm-frontmatter-line:hover, .cm-frontmatter-line:focus-within": {
    backgroundColor: "var(--frontmatter-bg-hover)",
    color: "var(--fg-muted)",
  },
  "&.cm-editor": {
    height: "100%",
  },
  ".cm-scroller": {
    fontFamily: "inherit",
    overflow: "visible",
  },
  ".cm-lineNumbers": {
    color: "var(--fg-faint) !important",
    fontSize: "0.75em",
    minWidth: "2.5em",
  },
  ".cm-lineNumbers .cm-gutterElement": {
    color: "var(--fg-faint) !important",
    paddingRight: "0.75em",
  },
  ".cm-gutters": {
    backgroundColor: "transparent",
    border: "none",
    paddingRight: "0.75rem",
  },
  ".cm-panels": {
    backgroundColor: "var(--chrome)",
    borderTop: "1px solid var(--border)",
  },
  ".cm-vim-panel": {
    alignItems: "center",
    color: "var(--fg-muted)",
    fontFamily: "var(--font-ibm-mono), ui-monospace, monospace",
    fontSize: "0.75rem",
    lineHeight: "1.75rem",
    minHeight: "1.75rem",
  },
  ".cm-vim-panel > span:first-child": {
    color: "var(--sage)",
    fontWeight: "700",
  },
  // !important: Tailwind's preflight resets border-color to currentColor on
  // all elements, which can override this rule for equal-specificity selectors.
  // Pinning with !important guarantees the custom cursor keeps its blue color
  // in both light and dark mode, regardless of surrounding decoration classes.
  ".cm-cursor": {
    borderLeftColor: "#3b82f6 !important",
    borderLeftWidth: "2px",
  },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
    backgroundColor: "var(--clay) !important",
    opacity: "0.25",
  },
  // Generic fold state is already shown by our own chevron UI, so its
  // placeholder stays visually hidden while retaining its layout box.
  // Do NOT zero its width/use `display: none`/`overflow: hidden`: CM6's
  // posAtCoords hit-testing walks this widget's DOM box and needs it to keep
  // its normal (glyph-sized) layout dimensions, or clicks near it crash.
  ".cm-foldPlaceholder": {
    backgroundColor: "transparent",
    border: "none",
    color: "transparent",
  },
  ".cm-foldPlaceholder.cm-frontmatterPlaceholder": {
    backgroundColor: "transparent",
    border: "none",
    color: "inherit",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: "0.9em",
    fontWeight: "400",
    margin: "0 0.35rem",
    opacity: "var(--frontmatter-label-opacity)",
    padding: 0,
    transition: "opacity 500ms ease",
  },
  ".cm-foldPlaceholder.cm-frontmatterPlaceholder::after": {
    content: '"›"',
    marginLeft: "0.35rem",
  },
  ".cm-foldPlaceholder.cm-frontmatterPlaceholder:hover": {
    backgroundColor: "transparent",
    color: "inherit",
    opacity: "1",
  },
  ".cm-line:has(.cm-frontmatterPlaceholder)": {
    backgroundColor: "transparent",
    borderRadius: 0,
    padding: "0 0 0.75em",
  },
  ".cm-tag-pill": {
    display: "inline-flex",
    alignItems: "center",
    verticalAlign: "middle",
    borderRadius: "9999px",
    border: "1px solid var(--border)",
    backgroundColor: "color-mix(in srgb, var(--chrome) 72%, transparent)",
    color: "var(--fg)",
    fontSize: "0.72em",
    lineHeight: "1.2",
    padding: "0.1em 0.45em",
    margin: "0 0.1em",
    whiteSpace: "nowrap",
    cursor: "pointer",
    userSelect: "none",
    transform: "translateY(-0.05em)",
  },
  ".cm-tag-pill.cm-tag-pill-workflow": {
    color: "var(--sage)",
  },
  ".cm-tag-pill.cm-tag-pill-todo": {
    color: "var(--clay)",
  },
  ".cm-tag-pill.cm-tag-pill-custom": {
    color: "var(--fg-muted)",
  },
  ".cm-frontmatter-tag-list": {
    display: "inline-flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "0.28em",
    paddingInline: "0.1em",
    verticalAlign: "middle",
  },
  ".cm-frontmatter-tag-list .cm-tag-pill": {
    margin: 0,
  },
  ".cm-frontmatter-tag-list-empty": {
    color: "var(--fg-faint)",
    fontSize: "0.78em",
    fontStyle: "italic",
    opacity: "0.75",
  },
  ".cm-link-display": {
    display: "inline-flex",
    alignItems: "baseline",
    gap: "0.2em",
    color: "var(--link)",
    fontWeight: "500",
    lineHeight: "inherit",
    paddingInline: "0.08em",
    textDecoration: "underline",
    textDecorationColor: "color-mix(in srgb, var(--link) 38%, transparent)",
    textDecorationThickness: "0.06em",
    textUnderlineOffset: "0.16em",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  ".cm-link-display::after": {
    color: "currentColor",
    fontSize: "0.72em",
    fontWeight: "600",
    opacity: "0.55",
    textDecoration: "none",
  },
  ".cm-link-display-url::after": {
    content: '"↗"',
  },
  ".cm-link-display-wiki": {
    color: "var(--moss)",
    textDecorationStyle: "dotted",
  },
  ".cm-link-display-wiki::after": {
    content: '"›"',
    fontSize: "0.9em",
  },
  ".cm-link-display:hover": {
    color: "var(--link-hover)",
    textDecorationColor: "currentColor",
  },
  ".cm-annotation-display": {
    display: "inline-flex",
    alignItems: "center",
    border: "1px solid var(--border-subtle)",
    borderRadius: "0.4em",
    backgroundColor: "color-mix(in srgb, var(--chrome) 52%, transparent)",
    fontSize: "0.78em",
    fontWeight: "500",
    lineHeight: "1.35",
    padding: "0.08em 0.42em",
    marginInline: "0.06em",
    whiteSpace: "nowrap",
    verticalAlign: "0.06em",
    cursor: "text",
  },
  ".cm-date-display": {
    color: "var(--fg-muted)",
    fontVariantNumeric: "tabular-nums",
  },
  ".cm-date-display::before": {
    content: '"◷"',
    color: "var(--fg-faint)",
    fontSize: "0.88em",
    marginRight: "0.3em",
  },
  ".cm-date-display-due": {
    color: "var(--clay)",
  },
  ".cm-priority-display": {
    borderRadius: "9999px",
    textTransform: "uppercase",
    letterSpacing: "0.055em",
  },
  ".cm-priority-display-high": {
    color: "var(--clay)",
    backgroundColor: "color-mix(in srgb, var(--clay) 8%, transparent)",
  },
  ".cm-priority-display-med": {
    color: "var(--fg-muted)",
  },
  ".cm-priority-display-low": {
    color: "var(--moss)",
    backgroundColor: "color-mix(in srgb, var(--moss) 7%, transparent)",
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
  { tag: t.monospace, fontFamily: "var(--font-mono, monospace)" },
  { tag: t.quote, color: "var(--fg-muted)", fontStyle: "italic" },
  { tag: t.list, color: "var(--fg)" },
  { tag: t.meta, color: "var(--fg-faint)" },
  { tag: t.processingInstruction, color: "var(--fg-faint)" },
  { tag: t.comment, color: "var(--fg-faint)", fontStyle: "italic" },
  { tag: [t.keyword, t.definitionKeyword, t.controlKeyword], color: "var(--clay)" },
  { tag: [t.typeName, t.className], color: "var(--moss)" },
  { tag: [t.string, t.special(t.string)], color: "var(--sage)" },
  { tag: [t.number, t.bool, t.atom], color: "var(--clay)" },
  { tag: [t.variableName, t.propertyName], color: "var(--fg)" },
  { tag: t.operator, color: "var(--fg-muted)" },
]);

export function editorTheme() {
  return [baseTheme, slashMenuTheme, syntaxHighlighting(markdownHighlightStyle)];
}
