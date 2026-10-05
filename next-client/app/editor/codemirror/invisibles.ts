import { RangeSetBuilder, type Extension } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, highlightWhitespace, ViewPlugin, type ViewUpdate } from "@codemirror/view";

// Show invisibles (Settings → Editor): spaces as faint dots, tabs as arrows
// (CodeMirror's highlightWhitespace), and a ¶ on every empty or
// whitespace-only line, so a real blank line can't be mistaken for the
// room the theme leaves above a heading.

const emptyLine = Decoration.line({ class: "cm-emptyLine" });

function emptyLineDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  for (const { from, to } of view.visibleRanges) {
    for (let pos = from; pos <= to;) {
      const line = view.state.doc.lineAt(pos);
      if (!line.text.trim()) builder.add(line.from, line.from, emptyLine);
      pos = line.to + 1;
    }
  }
  return builder.finish();
}

const emptyLineMarks = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = emptyLineDecorations(view);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) this.decorations = emptyLineDecorations(update.view);
    }
  },
  { decorations: (plugin) => plugin.decorations },
);

// Faint ink, drawn outside the text so the marks never select, copy or
// move the caret.
const invisiblesTheme = EditorView.theme({
  ".cm-highlightSpace": {
    backgroundImage: "radial-gradient(circle at 50% 55%, var(--fg-faint) 12%, transparent 14%)",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  },
  ".cm-highlightTab": {
    opacity: "0.5",
  },
  ".cm-line.cm-emptyLine::after": {
    content: '"¶"',
    color: "var(--fg-faint)",
    opacity: "0.6",
    pointerEvents: "none",
    userSelect: "none",
  },
});

export function invisibles(): Extension {
  return [highlightWhitespace(), emptyLineMarks, invisiblesTheme];
}
