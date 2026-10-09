import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import { MONO_FONT_STACK } from "@/app/atoms/ui-atoms";

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
  // Properties keep a visible tint at rest, so the block always reads as a
  // panel; hover/focus deepens it and lifts the text colour.
  ".cm-frontmatter-line": {
    backgroundColor: "var(--frontmatter-bg-hover)",
    color: "var(--fg-faint)",
    fontSize: "0.94em",
    fontWeight: "400",
    letterSpacing: "0.005em",
    // Inset via a transparent border, not padding: drawSelection() reads the
    // paddingLeft of the *first* .cm-line to place the left edge of every
    // full-line selection rect. With frontmatter at the top of the doc, a
    // padded line here shifted select-all right by ~0.55rem on every line.
    // The background still paints under the border (background-clip default).
    borderInline: "0.55rem solid transparent",
    transition: "background-color 150ms ease, color 150ms ease",
  },
  ".cm-frontmatter-line *": {
    fontWeight: "400 !important",
  },
  ".cm-frontmatter-key": {
    color: "var(--fg-muted)",
    fontWeight: "400 !important",
  },
  ".cm-frontmatter-comment": {
    color: "var(--fg-faint)",
    fontStyle: "italic",
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
  // The room below the frontmatter matches the sheet's padding above it
  // (`--sheet-pad-top`, set on the sheet). A blank line after the closing
  // `---` already gives about that; text right after it gets this spacer
  // block instead — a block of its own, not padding on the text's line.
  ".cm-frontmatter-spacer": {
    height: "var(--sheet-pad-top, 1.5rem)",
  },
  ".cm-frontmatter-line:hover, .cm-frontmatter-line:focus-within": {
    backgroundColor: "var(--frontmatter-bg-active)",
    color: "var(--fg-muted)",
  },
  // Horizontal rule (---, ***, ___): a thin line across the text column;
  // the dashes themselves are hidden unless the caret is on the line.
  ".cm-hr": {
    position: "relative",
  },
  ".cm-hr::after": {
    content: '""',
    position: "absolute",
    left: 0,
    right: 0,
    top: "50%",
    borderTop: "1px solid var(--border)",
    pointerEvents: "none",
  },
  ".cm-hr-marks": {
    color: "transparent",
  },
  ".cm-hr.cm-hr-editing::after": {
    opacity: "0.35",
  },
  ".cm-hr.cm-hr-editing .cm-hr-marks": {
    color: "var(--fg-faint)",
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
    fontSize: "0.85em",
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
  // !important: Tailwind's preflight resets border-color to currentColor on
  // all elements, which can override this rule for equal-specificity selectors.
  // Pinning with !important guarantees the custom cursor keeps its blue color
  // in both light and dark mode, regardless of surrounding decoration classes.
  ".cm-cursor": {
    borderLeftColor: "var(--caret) !important",
    borderLeftWidth: "2px",
  },
  // Vim's block cursor (Normal / Visual). The library's own theme sits at
  // Prec.highest with a pink fill, hence !important. A tint, not a solid
  // block, so the character under it — drawn by the library in the text
  // colour — stays readable.
  ".cm-fat-cursor": {
    background: "color-mix(in srgb, var(--caret) 30%, transparent) !important",
    borderRadius: "2px",
  },
  "&:not(.cm-focused) .cm-fat-cursor": {
    background: "none !important",
    outline: "solid 1px color-mix(in srgb, var(--caret) 60%, transparent) !important",
  },
  // Vim `/` search hits; replaces the library's yellow / cyan.
  ".cm-searchMatch": {
    backgroundColor: "color-mix(in srgb, var(--moss) 22%, transparent) !important",
    borderRadius: "2px",
  },
  // --selection is already translucent (lighter in light mode, stronger in
  // dark), so no layer opacity here.
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
    backgroundColor: "var(--selection) !important",
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
  // The frontmatter's header row: always tinted, deeper and with stronger
  // text on hover. Collapsed it is the whole block ("▸ Properties · title, tags")
  // above the first content line: a small label, not a block, so it sits
  // close to the text below.
  // Expanded ("▾ Properties") it is the top row of the YAML's panel: same
  // tint and inset, the panel's top corners, and the first YAML line's
  // corners squared off to join it.
  ".cm-frontmatterCollapsed": {
    paddingBottom: "0.5em",
  },
  ".cm-frontmatterHeader": {
    backgroundColor: "var(--frontmatter-bg-hover)",
    borderRadius: "0.55rem 0.55rem 0 0",
    padding: "0.3rem 0.55rem 0",
  },
  ".cm-frontmatterHeader + .cm-frontmatter-line.cm-frontmatter-start": {
    borderRadius: "0",
  },
  ".cm-frontmatterHeader .cm-frontmatter-summary-chevron": {
    transform: "rotate(90deg)",
  },
  ".cm-frontmatter-summary": {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.35em",
    maxWidth: "100%",
    height: "28px",
    padding: "0 0.5em 0 0.25em",
    marginLeft: "-0.25em",
    border: "none",
    borderRadius: "6px",
    backgroundColor: "var(--frontmatter-bg-hover)",
    color: "var(--fg-muted)",
    font: "inherit",
    fontSize: "0.85em",
    lineHeight: "1",
    whiteSpace: "nowrap",
    cursor: "pointer",
    transition: "color 150ms, background-color 150ms",
  },
  ".cm-frontmatter-summary:hover, .cm-frontmatter-summary:focus-visible": {
    color: "var(--fg)",
    backgroundColor: "var(--frontmatter-bg-active)",
  },
  ".cm-frontmatter-summary:focus-visible": {
    outline: "1px solid var(--sage)",
  },
  ".cm-frontmatter-summary-chevron": {
    width: "14px",
    height: "14px",
    flexShrink: "0",
  },
  ".cm-frontmatter-summary-keys": {
    overflow: "hidden",
    textOverflow: "ellipsis",
    opacity: "0.8",
  },
  // Status and tag values in the collapsed row (frontmatter-fold.ts): tag
  // pills sized to the row; a click goes to the row, which expands.
  ".cm-frontmatter-summary-keys .cm-frontmatter-chip": {
    fontSize: "0.95em",
    padding: "0.05em 0.45em",
    margin: "0 0 0 0.35em",
    cursor: "inherit",
    transform: "none",
  },
  ".cm-tag-pill": {
    display: "inline-flex",
    alignItems: "center",
    verticalAlign: "middle",
    borderRadius: "9999px",
    border: "1px solid var(--border)",
    backgroundColor: "color-mix(in srgb, var(--chrome) 72%, transparent)",
    color: "var(--fg)",
    fontSize: "0.9em",
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
  // Template fields in a template note (template-field-pills.ts): a dashed
  // pill reads "filled in later", unlike tags.
  ".cm-template-field": {
    display: "inline-flex",
    alignItems: "center",
    verticalAlign: "baseline",
    borderRadius: "0.4em",
    border: "1px dashed color-mix(in srgb, var(--moss) 55%, transparent)",
    backgroundColor: "color-mix(in srgb, var(--moss) 9%, transparent)",
    color: "var(--moss)",
    fontSize: "0.85em",
    fontWeight: "500",
    lineHeight: "1.3",
    padding: "0 0.4em",
    margin: "0 0.05em",
    whiteSpace: "nowrap",
    cursor: "text",
  },
  // A blank to fill in (template-blanks.ts): dotted and neutral, like a gap.
  ".cm-template-field-blank": {
    borderStyle: "dotted",
    borderColor: "var(--fg-faint)",
    backgroundColor: "color-mix(in srgb, var(--fg-faint) 10%, transparent)",
    color: "var(--fg-muted)",
    cursor: "pointer",
  },
  ".cm-template-field-ask": {
    borderColor: "color-mix(in srgb, var(--clay) 55%, transparent)",
    backgroundColor: "color-mix(in srgb, var(--clay) 9%, transparent)",
    color: "var(--clay)",
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
    color: "var(--fg-muted)",
    fontSize: "0.85em",
    fontStyle: "italic",
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
    fontSize: "0.85em",
    fontWeight: "600",
    opacity: "0.7",
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
    fontSize: "0.9em",
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
// (CommandPalette). This reskins it to match those.
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
    fontSize: "13px",
    color: "var(--fg-muted)",
    whiteSpace: "nowrap",
  },
});

export const markdownHighlightStyle = HighlightStyle.define([
  { tag: t.heading, fontWeight: "600", color: "var(--fg)" },
  { tag: t.strong, fontWeight: "700", color: "var(--fg)" },
  { tag: t.emphasis, fontStyle: "italic", color: "var(--fg)" },
  { tag: t.strikethrough, textDecoration: "line-through", color: "var(--fg-muted)" },
  { tag: t.link, color: "var(--clay)", textDecoration: "underline" },
  { tag: t.url, color: "var(--clay)" },
  { tag: t.monospace, fontFamily: MONO_FONT_STACK },
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
