import { ensureSyntaxTree, syntaxTree } from "@codemirror/language";
import { StateEffect, StateField, type EditorState, type Extension, type Text } from "@codemirror/state";
import { Decoration, EditorView, ViewPlugin, WidgetType, type DecorationSet, type ViewUpdate } from "@codemirror/view";

// Problems that change how much of a note renders: frontmatter that isn't
// valid YAML, and a code fence or `$$` block that is never closed (the rest
// of the note then reads as code or math). Each gets a one-line notice just
// above the block, with a button to the line at fault. Checked a moment after
// typing stops, never per keystroke.

export interface MarkdownProblem {
  /** 1-based line at fault ("Go to line"). */
  line: number;
  /** 1-based line the notice sits above. */
  anchorLine: number;
  message: string;
}

type YamlLoad = (source: string) => unknown;

export const PROBLEM_CHECK_DELAY_MS = 1200;

const FRONTMATTER = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;
// Template fields (`{{date}}`) are filled in later and aren't YAML yet.
const TEMPLATE_FIELD = /\{\{[^{}\n]*\}\}/g;

export function frontmatterProblem(doc: string, load: YamlLoad): MarkdownProblem | null {
  const match = FRONTMATTER.exec(doc);
  if (!match) return null;
  try {
    load(match[1].replace(TEMPLATE_FIELD, "x"));
    return null;
  } catch (err) {
    const { mark, reason } = err as { mark?: { line?: number }; reason?: string };
    // mark.line counts from 0 within the block, which starts on line 2.
    const line = (mark?.line ?? 0) + 2;
    return { line, anchorLine: 1, message: `Frontmatter isn't valid YAML on line ${line}: ${reason || "syntax error"}.` };
  }
}

// Unclosed code fences (from the syntax tree) and `$$` lines with no partner
// outside code. Parses the rest of the note for up to PARSE_BUDGET_MS; if
// that isn't enough, fences are skipped, since a part-parsed tree would show
// its last fence as open.
const PARSE_BUDGET_MS = 50;

export function unclosedBlockProblems(state: EditorState): MarkdownProblem[] {
  const { doc } = state;
  const tree = ensureSyntaxTree(state, doc.length, PARSE_BUDGET_MS) ?? syntaxTree(state);
  if (tree.length < doc.length) return [];
  const problems: MarkdownProblem[] = [];
  const codeLines = new Set<number>();
  tree.iterate({
    enter(node) {
      if (node.name !== "FencedCode" && node.name !== "CodeBlock") return;
      const first = doc.lineAt(node.from).number;
      const last = doc.lineAt(node.to).number;
      for (let n = first; n <= last; n++) codeLines.add(n);
      if (node.name === "FencedCode" && node.node.getChildren("CodeMark").length < 2) {
        problems.push({
          line: first,
          anchorLine: first,
          message: `The code block on line ${first} is never closed, so the rest of the note reads as code.`,
        });
      }
      return false;
    },
  });
  problems.push(...unclosedMathProblems(doc, codeLines));
  return problems;
}

function unclosedMathProblems(doc: Text, codeLines: Set<number>): MarkdownProblem[] {
  if (!doc.toString().includes("$$")) return [];
  let open: number | null = null;
  for (let n = 1; n <= doc.lines; n++) {
    if (codeLines.has(n) || doc.line(n).text.trim() !== "$$") continue;
    open = open === null ? n : null;
  }
  if (open === null) return [];
  return [{ line: open, anchorLine: open, message: `The math block on line ${open} is never closed.` }];
}

class ProblemWidget extends WidgetType {
  constructor(readonly problem: MarkdownProblem) {
    super();
  }

  eq(other: ProblemWidget) {
    return other.problem.line === this.problem.line && other.problem.message === this.problem.message;
  }

  toDOM(view: EditorView) {
    const box = document.createElement("div");
    box.className = "cm-markdown-problem";
    box.setAttribute("role", "note");
    const text = document.createElement("span");
    text.textContent = this.problem.message;
    const jump = document.createElement("button");
    jump.type = "button";
    jump.className = "cm-markdown-problem-jump";
    jump.textContent = `Go to line ${this.problem.line}`;
    jump.addEventListener("click", () => {
      const line = view.state.doc.line(Math.min(this.problem.line, view.state.doc.lines));
      view.dispatch({ selection: { anchor: line.from }, scrollIntoView: true });
      view.focus();
    });
    box.append(text, jump);
    return box;
  }
}

const setProblems = StateEffect.define<MarkdownProblem[]>();

function decorate(state: EditorState, problems: MarkdownProblem[]): DecorationSet {
  const ranges = problems
    .filter((problem) => problem.anchorLine <= state.doc.lines)
    .sort((a, b) => a.anchorLine - b.anchorLine)
    .map((problem) =>
      Decoration.widget({ widget: new ProblemWidget(problem), block: true, side: -1 }).range(
        state.doc.line(problem.anchorLine).from,
      ),
    );
  return Decoration.set(ranges, true);
}

const problemField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(value, tr) {
    for (const effect of tr.effects) if (effect.is(setProblems)) return decorate(tr.state, effect.value);
    // Edits clear the notices; the next check puts back any still true.
    return tr.docChanged ? Decoration.none : value;
  },
  provide: (field) => EditorView.decorations.from(field),
});

let yamlLoad: Promise<YamlLoad> | null = null;
function loadYaml(): Promise<YamlLoad> {
  yamlLoad ??= import("js-yaml").then((module) => module.load as YamlLoad);
  return yamlLoad;
}

const problemChecker = ViewPlugin.fromClass(
  class {
    timer: ReturnType<typeof setTimeout> | undefined;

    constructor(readonly view: EditorView) {
      this.schedule();
    }

    update(update: ViewUpdate) {
      if (update.docChanged) this.schedule();
    }

    schedule() {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => void this.check(), PROBLEM_CHECK_DELAY_MS);
    }

    async check() {
      const { state } = this.view;
      const doc = state.doc.toString();
      const front = doc.startsWith("---") ? frontmatterProblem(doc, await loadYaml()) : null;
      // The note changed while js-yaml loaded: the next check covers it.
      if (this.view.state !== state) return;
      const problems = [...(front ? [front] : []), ...unclosedBlockProblems(state)];
      const shown = this.view.state.field(problemField).size;
      if (problems.length === 0 && shown === 0) return;
      this.view.dispatch({ effects: setProblems.of(problems) });
    }

    destroy() {
      clearTimeout(this.timer);
    }
  },
);

export const markdownProblems: Extension = [problemField, problemChecker];
