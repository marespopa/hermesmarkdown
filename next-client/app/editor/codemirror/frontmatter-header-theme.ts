import { EditorView } from "@codemirror/view";

// Styles of the frontmatter header (frontmatter-header.ts): one quiet row of
// chips on the same tint as the raw panel, at the body's size and weight.
export const frontmatterHeaderTheme = EditorView.baseTheme({
  ".cm-frontmatter-line.cm-frontmatter-header-line": {
    backgroundColor: "var(--frontmatter-bg-hover)",
  },
  ".cm-frontmatter-header": {
    display: "inline",
  },
  ".cm-fm-chip": {
    font: "inherit",
    fontSize: "1em",
    fontWeight: "400",
    lineHeight: "inherit",
    color: "var(--fg-muted)",
    backgroundColor: "var(--fill)",
    border: "0",
    borderRadius: "0.4em",
    padding: "0 0.4em",
    margin: "0 0.15em 0 0",
    display: "inline-block",
    maxWidth: "18em",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    verticalAlign: "top",
    cursor: "pointer",
  },
  ".cm-fm-chip:hover": {
    backgroundColor: "var(--fill-hover)",
  },
  ".cm-fm-chip:focus-visible": {
    outline: "2px solid color-mix(in srgb, var(--clay) 45%, transparent)",
  },
  ".cm-fm-chip-key": {
    color: "var(--fg-faint)",
  },
});
