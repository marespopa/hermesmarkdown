import type { Extension, Range } from "@codemirror/state";
import { countColumn } from "@codemirror/state";
import { Decoration, EditorView, ViewPlugin, type DecorationSet, type ViewUpdate } from "@codemirror/view";
import { getIndentUnit } from "@codemirror/language";

// Thin vertical guides at each indent level of a code file's lines, drawn as
// a background on the line itself (no extra DOM): a repeating one-pixel
// gradient `unit` columns apart over the line's leading whitespace, anchored
// to the content box so it starts at the text's first column, not the line's
// padding edge. `ch` follows the code font, and a tab counts as its tab size. Blank lines get
// none.
function guides(view: EditorView): DecorationSet {
  const { state } = view;
  const unit = Math.max(1, getIndentUnit(state));
  const tabSize = state.tabSize;
  const decorations: Range<Decoration>[] = [];
  let last = -1;
  for (const { from, to } of view.visibleRanges) {
    for (let pos = from; pos <= to;) {
      const line = state.doc.lineAt(pos);
      pos = line.to + 1;
      if (line.from === last) continue;
      last = line.from;
      const indent = /^[ \t]*/.exec(line.text)![0];
      if (!indent || indent.length === line.length) continue;
      const columns = countColumn(indent, tabSize);
      if (columns < unit) continue;
      decorations.push(Decoration.line({ attributes: { class: "cm-indent-guides", style: `--indent-columns:${columns};--indent-unit:${unit}` } }).range(line.from));
    }
  }
  return Decoration.set(decorations);
}

const indentGuidesTheme = EditorView.theme({
  ".cm-indent-guides": {
    backgroundImage: "repeating-linear-gradient(to right, color-mix(in srgb, var(--fg-faint) 18%, transparent) 0 1px, transparent 1px calc(var(--indent-unit) * 1ch))",
    backgroundOrigin: "content-box",
    backgroundSize: "calc(var(--indent-columns) * 1ch) 100%",
    backgroundRepeat: "no-repeat",
  },
});

export function indentGuides(): Extension {
  return [
    ViewPlugin.fromClass(class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = guides(view);
      }
      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) this.decorations = guides(update.view);
      }
    }, { decorations: (plugin) => plugin.decorations }),
    indentGuidesTheme,
  ];
}
