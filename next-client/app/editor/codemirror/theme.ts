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
  // The caret's line, faintly tinted — only in the focused editor, so an
  // unfocused split pane stays clean, and never in Preview (no caret) or on
  // frontmatter (it has its own tint). Lines carry no padding, so the tint is
  // widened past the text by side shadows rather than layout-changing padding.
  // CodeMirror's own active-line color (a light blue) is turned off
  // everywhere else — it showed in an unfocused editor, e.g. right after
  // clicking a fold chevron.
  ".cm-activeLine": {
    backgroundColor: "transparent !important",
  },
  "&.cm-focused .cm-content:not([data-mode=preview]) .cm-activeLine:not(.cm-frontmatter-line)": {
    backgroundColor: "var(--active-line-bg) !important",
    boxShadow: "-0.5em 0 0 var(--active-line-bg), 0.5em 0 0 var(--active-line-bg)",
  },
  ".cm-frontmatter-line": {
    backgroundColor: "var(--frontmatter-bg)",
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
  // block instead — a block of its own, not padding on the text's line, so
  // the active-line tint doesn't stretch over the gap. Preview's grid has
  // its own margin.
  ".cm-frontmatter-spacer": {
    height: "var(--sheet-pad-top, 1.5rem)",
  },
  ".cm-content[data-mode=preview] .cm-frontmatter-spacer": {
    display: "none",
  },
  ".cm-frontmatter-line:hover, .cm-frontmatter-line:focus-within": {
    backgroundColor: "var(--frontmatter-bg-hover)",
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
  // The frontmatter's header row, low contrast until hovered. Collapsed it is
  // the whole block ("▸ Properties · title, tags") above the first content
  // line: a small label, not a block, so it sits close to the text below.
  // Expanded ("▾ Properties") it sits right above the YAML.
  ".cm-frontmatterCollapsed": {
    paddingBottom: "0.5em",
  },
  ".cm-frontmatterHeader": {
    paddingBottom: "0.25em",
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
    background: "transparent",
    color: "var(--fg-faint)",
    font: "inherit",
    fontSize: "0.78em",
    lineHeight: "1",
    whiteSpace: "nowrap",
    cursor: "pointer",
    transition: "color 150ms, background-color 150ms",
  },
  ".cm-frontmatter-summary:hover, .cm-frontmatter-summary:focus-visible": {
    color: "var(--fg-muted)",
    backgroundColor: "var(--frontmatter-bg-hover)",
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
