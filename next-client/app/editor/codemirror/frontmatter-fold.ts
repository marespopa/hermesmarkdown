import { EditorState, StateEffect, StateField, Transaction } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, WidgetType } from "@codemirror/view";

export interface FrontmatterFoldRange {
  titleOffset: number;
  bodyFrom: number;
  // End of the last line hidden while collapsed: the blank lines after the
  // closing `---` are hidden too, so the first content line (e.g. the
  // heading) becomes the first visible line. Equals `closeTo` when no
  // content follows, so trailing blank lines stay editable.
  bodyTo: number;
  // End of the closing `---` delimiter.
  closeTo: number;
}

export function findFrontmatterFoldRange(doc: string): FrontmatterFoldRange | null {
  const lines = doc.split("\n");
  if (lines.length < 3 || !/^---\s*$/.test(lines[0])) return null;

  const closingLine = lines.findIndex((line, index) => index > 0 && /^---\s*$/.test(line));
  if (closingLine < 0) return null;

  const bodyFrom = 0;
  const closeTo = lines
    .slice(0, closingLine + 1)
    .join("\n")
    .length;

  if (closeTo <= bodyFrom) return null;

  let bodyTo = closeTo;
  let offset = closeTo + 1;
  for (let i = closingLine + 1; i < lines.length; i++) {
    if (lines[i].trim() !== "") {
      bodyTo = offset - 1;
      break;
    }
    offset += lines[i].length + 1;
  }

  return { titleOffset: 0, bodyFrom, bodyTo, closeTo };
}

// Collapsed frontmatter is an empty zero-height block widget, not a fold: a
// fold's placeholder lives inside a text line, which either costs a row or
// merges the next content line into the frontmatter's first line (and its
// styling). It is expanded from the pane header's metadata toggle.
class CollapsedFrontmatterWidget extends WidgetType {
  eq() {
    return true;
  }

  toDOM() {
    const element = document.createElement("div");
    element.className = "cm-frontmatterCollapsed";
    return element;
  }

  get estimatedHeight() {
    return 0;
  }
}

const setFrontmatterCollapsed = StateEffect.define<boolean>();

interface CollapseState {
  collapsed: boolean;
  decorations: DecorationSet;
}

function hiddenRange(state: EditorState) {
  return findFrontmatterFoldRange(state.doc.toString());
}

function buildDecorations(state: EditorState, collapsed: boolean): DecorationSet {
  const range = collapsed ? hiddenRange(state) : null;
  if (!range) return Decoration.none;
  return Decoration.set([
    Decoration.replace({ block: true, widget: new CollapsedFrontmatterWidget() })
      .range(range.bodyFrom, range.bodyTo),
  ]);
}

// A collapsed block must not swallow edits or a caret invisibly: a selection
// moved into it (arrowing up, Ctrl+Home, search) or a user edit touching it
// expands it, like CodeMirror does for folds.
function revealsHidden(tr: Transaction, range: FrontmatterFoldRange) {
  if (tr.selection?.ranges.some((r) => r.head <= range.bodyTo)) return true;
  return tr.docChanged
    && (tr.isUserEvent("input") || tr.isUserEvent("delete"))
    && tr.changes.touchesRange(range.bodyFrom, range.bodyTo + 1) !== false;
}

const frontmatterCollapseField = StateField.define<CollapseState>({
  create: () => ({ collapsed: false, decorations: Decoration.none }),
  update(value, tr) {
    let collapsed = value.collapsed;
    let explicit = false;
    for (const effect of tr.effects) {
      if (effect.is(setFrontmatterCollapsed)) {
        collapsed = effect.value;
        explicit = true;
      }
    }
    if (collapsed && !explicit) {
      const before = hiddenRange(tr.startState);
      if (before && revealsHidden(tr, before)) collapsed = false;
    }
    if (collapsed === value.collapsed && !tr.docChanged) return value;
    return { collapsed, decorations: buildDecorations(tr.state, collapsed) };
  },
  provide: (field) => EditorView.decorations.from(field, (value) => value.decorations),
});

export const frontmatterCollapse = [frontmatterCollapseField];

export function toggleFrontmatterFold(
  view: EditorView,
  range: FrontmatterFoldRange,
  collapse: boolean,
) {
  // Collapsing with the caret inside the hidden block would leave typing
  // invisible, so park it at the start of the first visible line.
  const head = view.state.selection.main.head;
  const parkCaret = collapse && head <= range.bodyTo && range.bodyTo < view.state.doc.length;
  view.dispatch({
    effects: setFrontmatterCollapsed.of(collapse),
    ...(parkCaret ? { selection: { anchor: range.bodyTo + 1 } } : {}),
  });
}

export function isFrontmatterFolded(state: EditorState) {
  return Boolean(state.field(frontmatterCollapseField, false)?.collapsed && hiddenRange(state));
}

// Where a caret may sit without expanding collapsed frontmatter: after it.
export function caretOutsideFrontmatter(state: EditorState, pos: number) {
  if (!isFrontmatterFolded(state)) return pos;
  const range = hiddenRange(state)!;
  return pos <= range.bodyTo && range.bodyTo < state.doc.length ? range.bodyTo + 1 : pos;
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
