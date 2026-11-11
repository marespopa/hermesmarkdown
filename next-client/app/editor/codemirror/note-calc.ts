import { EditorSelection, Prec, Range } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, keymap, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view";
import { collectNoteCalcLabels, NoteCalcCache } from "../utils/note-calc-scan";

// Inline note calculator: math lines that end with `=`
// (`rent + utilities =`) get a faint result (`1380`) after it. Display-only — the plugin never
// dispatches, so the file, undo history and dirty state are untouched.
// Tab at the end of such a line writes the shown result into the text.
// Line rules and the incremental cache live in utils/note-calc-scan.ts.

class NoteCalcResultWidget extends WidgetType {
  constructor(private readonly label: string) {
    super();
  }

  eq(other: NoteCalcResultWidget) {
    return other.label === this.label;
  }

  toDOM() {
    const node = document.createElement("span");
    node.className = "cm-note-calc-result";
    node.setAttribute("aria-hidden", "true");
    node.textContent = this.label;
    return node;
  }

  ignoreEvent() {
    return true;
  }
}

function buildNoteCalcDecorations(view: EditorView, cache: NoteCalcCache): DecorationSet {
  const ranges: Range<Decoration>[] = collectNoteCalcLabels(view.state.doc, cache, view.visibleRanges)
    .map(({ pos, label }) => Decoration.widget({ widget: new NoteCalcResultWidget(label), side: 1 }).range(pos));
  return Decoration.set(ranges, true);
}

export const noteCalcPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    // One cache per EditorView.
    private readonly cache = new NoteCalcCache();

    // The result shown on a line, or null.
    labelFor(view: EditorView, lineNumber: number): string | null {
      this.cache.ensure(view.state.doc, lineNumber);
      return this.cache.label(lineNumber);
    }

    constructor(view: EditorView) {
      this.decorations = buildNoteCalcDecorations(view, this.cache);
    }

    update(update: ViewUpdate) {
      if (update.docChanged) {
        let min = Infinity;
        update.changes.iterChangedRanges((fromA) => {
          min = Math.min(min, fromA);
        });
        if (min !== Infinity) {
          this.cache.invalidateFrom(update.startState.doc.lineAt(min).number);
        }
      }
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildNoteCalcDecorations(update.view, this.cache);
      }
    }
  },
  { decorations: (value) => value.decorations },
);

// Tab with the caret at the end of a line that shows a result: insert it.
function acceptResult(view: EditorView): boolean {
  const { selection, doc } = view.state;
  if (selection.ranges.length !== 1 || !selection.main.empty) return false;
  const line = doc.lineAt(selection.main.head);
  if (selection.main.head !== line.to) return false;
  const label = view.plugin(noteCalcPlugin)?.labelFor(view, line.number);
  if (!label) return false;
  const insert = /\s$/.test(line.text) ? label : ` ${label}`;
  view.dispatch({
    changes: { from: line.to, insert },
    selection: EditorSelection.cursor(line.to + insert.length),
    userEvent: "input.complete",
  });
  return true;
}

// Ahead of list indenting (Tab) and the completion popup; other lines fall through.
const noteCalcKeymap = Prec.highest(keymap.of([{ key: "Tab", run: acceptResult }]));

const noteCalcTheme = EditorView.baseTheme({
  ".cm-note-calc-result": {
    color: "var(--fg-faint)",
    marginLeft: "0.4em",
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
    userSelect: "none",
    pointerEvents: "none",
  },
});

export const noteCalcExtension = [noteCalcPlugin, noteCalcKeymap, noteCalcTheme];
