import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { foldEffect, foldedRanges, unfoldEffect } from "@codemirror/language";

export interface FrontmatterFoldRange {
  titleOffset: number;
  bodyFrom: number;
  bodyTo: number;
}

export function findFrontmatterFoldRange(doc: string): FrontmatterFoldRange | null {
  const lines = doc.split("\n");
  if (lines.length < 3 || !/^---\s*$/.test(lines[0])) return null;

  const closingLine = lines.findIndex((line, index) => index > 0 && /^---\s*$/.test(line));
  if (closingLine < 0) return null;

  const bodyFrom = 0;
  const bodyTo = lines
    .slice(0, closingLine + 1)
    .join("\n")
    .length;

  if (bodyTo <= bodyFrom) return null;
  return { titleOffset: 0, bodyFrom, bodyTo };
}

export function toggleFrontmatterFold(
  view: EditorView,
  range: FrontmatterFoldRange,
  collapse: boolean,
) {
  view.dispatch({
    effects: collapse
      ? foldEffect.of({ from: range.bodyFrom, to: range.bodyTo })
      : unfoldEffect.of({ from: range.bodyFrom, to: range.bodyTo }),
  });
}

export function isFrontmatterFolded(state: EditorState, range: FrontmatterFoldRange) {
  let found = false;
  foldedRanges(state).between(range.bodyFrom, range.bodyTo, (from, to) => {
    if (from <= range.bodyFrom && to >= range.bodyTo) found = true;
  });
  return found;
}

// The "Frontmatter" slash/palette command: unfolds and jumps to an existing
// frontmatter block, or inserts a starter `title` / `tags` block at the top
// with the cursor on the title.
export function insertOrRevealFrontmatter(view: EditorView) {
  const existing = findFrontmatterFoldRange(view.state.doc.toString());
  if (existing) {
    toggleFrontmatterFold(view, existing, false);
    const titleLineEnd = view.state.doc.line(2).to;
    view.dispatch({
      selection: { anchor: titleLineEnd },
      effects: EditorView.scrollIntoView(titleLineEnd, { y: "center" }),
    });
    view.focus();
    return;
  }

  const frontmatter = "---\ntitle: \ntags: []\n---\n\n";
  const titleLineEnd = frontmatter.indexOf("title: ") + "title: ".length;
  view.dispatch({
    changes: { from: 0, insert: frontmatter },
    selection: { anchor: titleLineEnd },
    userEvent: "input.replace.template",
  });
  view.focus();
}
