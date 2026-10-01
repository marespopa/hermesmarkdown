import { foldedRanges, syntaxTree } from "@codemirror/language";
import { EditorState, type Extension, Prec, type Range, StateField } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, WidgetType } from "@codemirror/view";
import type { SyntaxNode } from "@lezer/common";
import { toggleCheckboxOnLine } from "./commands";
import { caretOutsideFrontmatter, findFrontmatterFoldRange } from "./frontmatter-fold";
import { findRenderedBlockAt } from "./rendered-block";
import { previewModeFacet } from "./preview-facet";

export { previewModeFacet, isPreviewMode, previewModeChanged } from "./preview-facet";

// Preview: the same EditorView, read-only, with Markdown syntax hidden so a
// note reads like a rendered page. Nothing about the document changes — the
// decorations below only hide markers or swap them for small widgets, and
// tables, Mermaid/math, link and tag pills already render inline. Edit mode
// gets none of this: the whole extension comes and goes through a compartment.

// The only document changes preview lets through: an external reload of the
// file, and a checkbox toggled from its widget.
const ALLOWED_PREVIEW_EDITS = ["input.external", "input.format.checkbox"];

const hidden = Decoration.replace({});
const hiddenLine = Decoration.replace({ block: true });
const quoteLine = Decoration.line({ class: "cm-previewQuote" });

class BulletWidget extends WidgetType {
  constructor(readonly depth: number) {
    super();
  }

  eq(other: BulletWidget) {
    return other.depth === this.depth;
  }

  toDOM() {
    const node = document.createElement("span");
    node.className = "cm-previewBullet";
    node.textContent = this.depth % 2 === 0 ? "•" : "◦";
    node.setAttribute("aria-hidden", "true");
    return node;
  }
}

class TaskCheckboxWidget extends WidgetType {
  constructor(readonly checked: boolean) {
    super();
  }

  eq(other: TaskCheckboxWidget) {
    return other.checked === this.checked;
  }

  toDOM(view: EditorView) {
    const box = document.createElement("input");
    box.type = "checkbox";
    box.className = "cm-previewCheckbox";
    box.checked = this.checked;
    box.setAttribute("aria-label", this.checked ? "Mark task as not done" : "Mark task as done");
    box.addEventListener("mousedown", (event) => event.preventDefault());
    box.addEventListener("click", (event) => {
      event.preventDefault();
      const line = view.state.doc.lineAt(view.posAtDOM(box));
      toggleCheckboxOnLine(view, line.number);
    });
    return box;
  }

  ignoreEvent() {
    return true;
  }
}

function bulletDepth(node: SyntaxNode): number {
  let depth = 0;
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (parent.name === "BulletList") depth++;
  }
  return Math.max(0, depth - 1);
}

// Extends a marker's hidden range over one following space ("# ", "> ").
function withTrailingSpace(state: EditorState, to: number): number {
  return state.doc.sliceString(to, to + 1) === " " ? to + 1 : to;
}

function codeBlockDecorations(state: EditorState, node: SyntaxNode, ranges: Range<Decoration>[]) {
  const { doc } = state;
  const first = doc.lineAt(node.from);
  const last = doc.lineAt(node.to);
  const closed = last.number > first.number && node.lastChild?.name === "CodeMark" && node.lastChild.from >= last.from;
  // Fenced code inside a list or quote keeps its fences: the line prefixes
  // aren't part of the block, so the whole line can't be collapsed.
  if (doc.sliceString(first.from, node.from).trim() !== "") return;
  ranges.push(hiddenLine.range(first.from, first.to));
  const bodyEnd = closed ? last.number - 1 : last.number;
  for (let n = first.number + 1; n <= bodyEnd; n++) {
    const cls = ["cm-previewCode"];
    if (n === first.number + 1) cls.push("cm-previewCodeFirst");
    if (n === bodyEnd) cls.push("cm-previewCodeLast");
    ranges.push(Decoration.line({ class: cls.join(" ") }).range(doc.line(n).from));
  }
  if (closed) ranges.push(hiddenLine.range(last.from, last.to));
}

export function buildPreviewDecorations(state: EditorState): DecorationSet {
  const ranges: Range<Decoration>[] = [];
  const { doc } = state;
  // Frontmatter's closing `---` parses as a setext underline; leave it alone.
  const frontmatterEnd = findFrontmatterFoldRange(doc.toString())?.closeTo ?? -1;
  const quotedLines = new Set<number>();

  syntaxTree(state).iterate({
    enter(ref) {
      if (ref.to <= frontmatterEnd) return ref.name === "Document";
      const node = ref.node;
      switch (ref.name) {
        case "Table":
          return false;
        case "FencedCode":
          if (!findRenderedBlockAt(state, ref.from)) codeBlockDecorations(state, node, ranges);
          return false;
        case "HeaderMark": {
          if (node.parent?.name.startsWith("SetextHeading")) {
            const line = doc.lineAt(ref.from);
            ranges.push(hiddenLine.range(line.from, line.to));
          } else if (ref.from === node.parent?.from) {
            ranges.push(hidden.range(ref.from, withTrailingSpace(state, ref.to)));
          } else {
            // Closing `#`s: hide them with the space before them.
            const from = doc.sliceString(ref.from - 1, ref.from) === " " ? ref.from - 1 : ref.from;
            ranges.push(hidden.range(from, ref.to));
          }
          return;
        }
        case "QuoteMark":
          ranges.push(hidden.range(ref.from, withTrailingSpace(state, ref.to)));
          quotedLines.add(doc.lineAt(ref.from).number);
          return;
        case "EmphasisMark":
        case "StrikethroughMark":
          ranges.push(hidden.range(ref.from, ref.to));
          return;
        case "CodeMark":
          if (node.parent?.name === "InlineCode") ranges.push(hidden.range(ref.from, ref.to));
          return;
        case "ListMark": {
          if (node.parent?.parent?.name !== "BulletList") return;
          const to = withTrailingSpace(state, ref.to);
          if (node.parent?.getChild("Task")) {
            ranges.push(hidden.range(ref.from, to));
          } else {
            ranges.push(Decoration.replace({ widget: new BulletWidget(bulletDepth(node)) }).range(ref.from, ref.to));
          }
          return;
        }
        case "TaskMarker": {
          const checked = /x/i.test(doc.sliceString(ref.from, ref.to));
          ranges.push(Decoration.replace({ widget: new TaskCheckboxWidget(checked) }).range(ref.from, ref.to));
          return;
        }
      }
    },
  });

  for (const n of quotedLines) ranges.push(quoteLine.range(doc.line(n).from));
  return Decoration.set(ranges, true);
}

const previewDecorationsField = StateField.define<DecorationSet>({
  create: buildPreviewDecorations,
  update(value, transaction) {
    if (!transaction.docChanged && syntaxTree(transaction.startState) === syntaxTree(transaction.state)) {
      return value;
    }
    return buildPreviewDecorations(transaction.state);
  },
  provide: (field) => EditorView.decorations.from(field),
});

// Read-only guard for commands that dispatch changes themselves (table
// shortcuts, formatting keys) rather than checking `state.readOnly`.
const previewEditFilter = EditorState.transactionFilter.of((transaction) => {
  if (!transaction.docChanged) return transaction;
  return ALLOWED_PREVIEW_EDITS.some((event) => transaction.isUserEvent(event)) ? transaction : [];
});

const previewTheme = EditorView.theme({
  ".cm-content[data-mode=preview]": {
    fontFamily: "var(--preview-font-family, inherit)",
    lineHeight: "calc(var(--editor-line-height, 1.6) * 1.08)",
    userSelect: "text",
  },
  ".cm-cursorLayer": {
    display: "none",
  },
  ".cm-previewQuote": {
    borderLeft: "3px solid var(--border)",
    paddingLeft: "0.9em !important",
    color: "var(--fg-muted)",
  },
  ".cm-previewBullet": {
    display: "inline-block",
    width: "1.1em",
    color: "var(--fg-muted)",
  },
  ".cm-previewCheckbox": {
    margin: "0 0.45em 0 0",
    verticalAlign: "-0.1em",
    cursor: "pointer",
    accentColor: "var(--moss)",
  },
  ".cm-previewCode": {
    backgroundColor: "var(--surface-raised)",
    fontFamily: "\"Source Code Pro\", ui-monospace, monospace",
    fontSize: "0.92em",
    paddingLeft: "0.9em !important",
    paddingRight: "0.9em !important",
  },
  ".cm-previewCodeFirst": {
    borderTopLeftRadius: "8px",
    borderTopRightRadius: "8px",
    paddingTop: "0.5em !important",
  },
  ".cm-previewCodeLast": {
    borderBottomLeftRadius: "8px",
    borderBottomRightRadius: "8px",
    paddingBottom: "0.5em !important",
  },
  ".cm-rendered-block": {
    cursor: "default",
  },
  ".cm-rendered-block-edit, .cm-table-rulers": {
    display: "none",
  },
});

// Where the caret goes on leaving Preview. CodeMirror drops a fold whose
// interior holds the selection head, so a caret inside a folded range would
// expand it; move such a caret to the fold's start instead. Collapsed
// frontmatter (a hidden block, not a fold) likewise expands on a caret inside
// it, so such a caret moves to the first line after it.
export function caretOutsideFolds(state: EditorState, pos: number): number {
  let caret = caretOutsideFrontmatter(state, Math.min(Math.max(pos, 0), state.doc.length));
  foldedRanges(state).between(caret, caret, (from, to) => {
    if (from < caret && caret < to) caret = from;
  });
  return caret;
}

// Everything Preview adds, or nothing in Edit mode.
export function previewExtension(on: boolean): Extension {
  if (!on) return [];
  return [
    previewModeFacet.of(true),
    EditorState.readOnly.of(true),
    // High precedence: the first `editable` value wins over buildExtensions' own.
    Prec.high(EditorView.editable.of(false)),
    EditorView.contentAttributes.of({ "data-mode": "preview" }),
    previewDecorationsField,
    previewEditFilter,
    previewTheme,
  ];
}
