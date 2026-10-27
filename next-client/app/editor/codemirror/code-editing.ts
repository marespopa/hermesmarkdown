import type { Extension } from "@codemirror/state";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { bracketMatching, foldGutter, foldKeymap, indentOnInput } from "@codemirror/language";
import { autocompletion, closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { codeProblems } from "./code-problems";
import { indentGuides } from "./indent-guides";

// Editing helpers for code files (a file whose language was recognised, see
// plain-text-extensions.ts): matching brackets are marked, typing an opening
// bracket or quote adds its pair (Backspace removes both), a closing brace
// re-indents its line, blocks fold, the language suggests completions as you
// type (its own: keywords, properties, tags), syntax errors are underlined
// (code-problems.ts) and indent levels get thin guides (indent-guides.ts).
// Comment toggle (Mod-/), move line (Alt-↑/↓) and copy line (Shift-Alt-↑/↓)
// come from the default keymap. Never in notes, where auto-paired
// quotes would fight apostrophes, nor in plain text (.txt, .log, .csv).
const codeEditingTheme = EditorView.theme({
  "&.cm-focused .cm-matchingBracket": { backgroundColor: "var(--fill)", outline: "none" },
  "&.cm-focused .cm-nonmatchingBracket": { backgroundColor: "transparent", textDecoration: "underline wavy var(--fg-faint)" },
  ".cm-foldGutter .cm-gutterElement": { color: "var(--fg-faint)", cursor: "pointer", padding: "0 0.25em" },
  ".cm-foldPlaceholder": { backgroundColor: "var(--fill)", border: "none", color: "var(--fg-muted)", padding: "0 0.4em" },
});

export function codeEditing(): Extension {
  return [
    bracketMatching(),
    closeBrackets(),
    indentOnInput(),
    autocompletion({ icons: false }),
    codeProblems(),
    indentGuides(),
    keymap.of([...closeBracketsKeymap, ...foldKeymap]),
    codeEditingTheme,
  ];
}

// A text file's gutters, always shown: plain numbers (a code line
// is one row tall, unlike the note gutter's heading-aware cells, which took
// a `# comment` for a heading) and, in code files, the fold markers.
export function codeGutters(foldable: boolean): Extension {
  return foldable ? [lineNumbers(), foldGutter({ openText: "⌄", closedText: "›" })] : lineNumbers();
}
