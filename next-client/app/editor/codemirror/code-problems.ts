import type { Extension, Range } from "@codemirror/state";
import { Decoration, EditorView, ViewPlugin, type DecorationSet, type ViewUpdate } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";

// Syntax errors in a code file, as a quiet wavy underline (no gutter icon or
// panel): the parser's error nodes in the visible lines, so a stray brace or
// a broken JSON value shows as you type. Languages with no syntax tree
// (shell and other legacy modes) have no error nodes, so nothing shows.
const MAX_PROBLEMS = 200;

const problemMark = Decoration.mark({ class: "cm-code-problem" });

function findProblems(view: EditorView): DecorationSet {
  const { state } = view;
  const marks: Range<Decoration>[] = [];
  for (const { from, to } of view.visibleRanges) {
    syntaxTree(state).iterate({
      from,
      to,
      enter: (node) => {
        if (marks.length >= MAX_PROBLEMS) return false;
        if (!node.type.isError) return;
        // An error node can be empty (something is missing here): mark the
        // character after it, or the one before at the end of a line.
        let start = node.from;
        let end = node.to;
        if (start === end) {
          if (end < state.doc.length && state.doc.sliceString(end, end + 1) !== "\n") end += 1;
          else if (start > 0) start -= 1;
          else return;
        }
        marks.push(problemMark.range(start, end));
      },
    });
  }
  return Decoration.set(marks, true);
}

const codeProblemsTheme = EditorView.theme({
  ".cm-code-problem": { textDecoration: "underline wavy var(--fg-faint)", textUnderlineOffset: "3px" },
});

export function codeProblems(): Extension {
  return [
    ViewPlugin.fromClass(class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = findProblems(view);
      }
      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged || syntaxTree(update.startState) !== syntaxTree(update.state)) {
          this.decorations = findProblems(update.view);
        }
      }
    }, { decorations: (plugin) => plugin.decorations }),
    codeProblemsTheme,
  ];
}
