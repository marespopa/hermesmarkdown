import { EditorState, type Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { search } from "@codemirror/search";

// In-note find and replace (Mod-f; searchKeymap is bound in extensions.ts):
// @codemirror/search's panel, pinned to the top of the sheet and restyled
// to the app's chrome. Labels are capitalized through CM6's phrase table.
const findPhrases = EditorState.phrases.of({
  Find: "Find",
  Replace: "Replace",
  next: "Next",
  previous: "Previous",
  all: "All",
  "match case": "Match case",
  regexp: "Regex",
  "by word": "Whole word",
  replace: "Replace",
  "replace all": "Replace all",
  close: "Close",
});

const findReplaceTheme = EditorView.theme({
  ".cm-panels": {
    backgroundColor: "transparent",
    color: "var(--fg)",
    zIndex: "30",
  },
  ".cm-panels.cm-panels-top": {
    borderBottom: "none",
    paddingBottom: "0.5rem",
  },
  ".cm-panel.cm-search": {
    position: "relative",
    padding: "0.3rem 2.25rem 0.3rem 0.3rem",
    backgroundColor: "var(--chrome)",
    border: "1px solid var(--border)",
    borderRadius: "0.75rem",
    boxShadow: "0 8px 20px rgba(0, 0, 0, 0.1)",
    fontFamily: "var(--font-inter), system-ui, sans-serif",
    fontSize: "13px",
  },
  // Inline layout (CM6 breaks find and replace rows with a <br>), so rows
  // wrap on narrow screens; each control carries its own spacing.
  ".cm-panel.cm-search > *": {
    margin: "0.2rem",
    verticalAlign: "middle",
  },
  ".cm-panel.cm-search .cm-textfield": {
    width: "min(16rem, calc(100% - 0.4rem))",
    padding: "0.3rem 0.55rem",
    fontSize: "14px",
    color: "var(--fg)",
    backgroundColor: "var(--input-bg)",
    border: "1px solid var(--border)",
    borderRadius: "0.5rem",
    outline: "none",
  },
  ".cm-panel.cm-search .cm-textfield:focus": {
    borderColor: "var(--clay)",
    boxShadow: "0 0 0 2px color-mix(in srgb, var(--clay) 20%, transparent)",
  },
  ".cm-panel.cm-search .cm-button": {
    padding: "0.3rem 0.6rem",
    fontSize: "13px",
    color: "var(--fg-muted)",
    backgroundImage: "none",
    backgroundColor: "transparent",
    border: "1px solid var(--border)",
    borderRadius: "0.5rem",
    cursor: "pointer",
  },
  ".cm-panel.cm-search .cm-button:hover": {
    color: "var(--fg)",
    backgroundColor: "color-mix(in srgb, var(--fg) 6%, transparent)",
  },
  ".cm-panel.cm-search label": {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.3rem",
    fontSize: "13px",
    color: "var(--fg-muted)",
    whiteSpace: "nowrap",
    cursor: "pointer",
  },
  ".cm-panel.cm-search input[type=checkbox]": {
    margin: 0,
    accentColor: "var(--clay)",
  },
  ".cm-panel.cm-search button[name=close]": {
    position: "absolute",
    top: "0.35rem",
    right: "0.5rem",
    width: "1.5rem",
    height: "1.5rem",
    padding: 0,
    fontSize: "18px",
    lineHeight: "1",
    color: "var(--fg-muted)",
    backgroundColor: "transparent",
    border: "none",
    borderRadius: "9999px",
    cursor: "pointer",
  },
  ".cm-panel.cm-search button[name=close]:hover": {
    color: "var(--fg)",
    backgroundColor: "color-mix(in srgb, var(--fg) 8%, transparent)",
  },
  ".cm-searchMatch.cm-searchMatch-selected": {
    backgroundColor: "color-mix(in srgb, var(--clay) 32%, transparent) !important",
  },
});

export function findReplace(): Extension {
  return [search({ top: true }), findPhrases, findReplaceTheme];
}
