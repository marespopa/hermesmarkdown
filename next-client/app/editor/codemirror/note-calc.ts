import { Range } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view";
import { collectNoteCalcLabels, NoteCalcCache } from "../utils/note-calc-scan";

// Inline note calculator: math lines (`rent + utilities`) get a faint
// `= 1380` label at the end of the line. Display-only — the plugin never
// dispatches, so the file, undo history and dirty state are untouched.
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
    // One cache per EditorView: split panes compute independently.
    private readonly cache = new NoteCalcCache();

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

const noteCalcTheme = EditorView.baseTheme({
  ".cm-note-calc-result": {
    color: "var(--fg-faint)",
    fontSize: "0.9em",
    marginLeft: "0.75em",
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
    userSelect: "none",
    pointerEvents: "none",
  },
});

export const noteCalcExtension = [noteCalcPlugin, noteCalcTheme];
