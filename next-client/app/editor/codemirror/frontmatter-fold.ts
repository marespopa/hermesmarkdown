import { EditorState, StateEffect, StateField, Transaction } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, WidgetType } from "@codemirror/view";
import { parseFmFields } from "@/app/utils/frontmatter-utils";

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

// Top-level keys of a frontmatter block, in order (`title`, `tags`, …). Read
// with the shared frontmatter parser, so the summary row and Preview's grid
// always list the same keys.
export function frontmatterKeys(doc: string): string[] {
  return Object.keys(parseFmFields(doc));
}

const SUMMARY_KEY_LIMIT = 3;

// "title, tags, created, +2": the first few keys, then a count of the rest.
export function frontmatterSummary(keys: string[]): string {
  const shown = keys.slice(0, SUMMARY_KEY_LIMIT).join(", ");
  const rest = keys.length - SUMMARY_KEY_LIMIT;
  return rest > 0 ? `${shown}, +${rest}` : shown;
}

// Collapsed frontmatter is a block widget, not a fold: a fold's placeholder
// lives inside a text line, which either costs a row or merges the next
// content line into the frontmatter's first line (and its styling). The
// widget is one quiet summary row ("▸ Properties · title, tags"); clicking it
// expands the block, as does moving the caret into it (arrowing up from the
// first line).
class CollapsedFrontmatterWidget extends WidgetType {
  constructor(readonly summary: string) {
    super();
  }

  eq(other: CollapsedFrontmatterWidget) {
    return other.summary === this.summary;
  }

  toDOM(view: EditorView) {
    const element = document.createElement("div");
    element.className = "cm-frontmatterCollapsed";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "cm-frontmatter-summary";
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-label", this.summary ? `Show properties: ${this.summary}` : "Show properties");
    button.innerHTML =
      '<svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" class="cm-frontmatter-summary-chevron">' +
      '<path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd"/></svg>';
    const label = document.createElement("span");
    label.textContent = "Properties";
    button.append(label);
    if (this.summary) {
      const keys = document.createElement("span");
      keys.className = "cm-frontmatter-summary-keys";
      keys.textContent = `· ${this.summary}`;
      button.append(keys);
    }
    // mousedown, not click: CodeMirror would otherwise move the caret first.
    button.addEventListener("mousedown", (event) => event.preventDefault());
    button.addEventListener("click", (event) => {
      event.preventDefault();
      view.dispatch({ effects: setFrontmatterCollapsed.of(false) });
      view.focus();
    });
    element.append(button);
    return element;
  }

  // The button handles its own pointer and keyboard events.
  ignoreEvent() {
    return true;
  }

  get estimatedHeight() {
    return 28;
  }
}

// Room between expanded frontmatter and text that follows its closing `---`
// directly (see `.cm-frontmatter-spacer` in theme.ts).
class FrontmatterSpacerWidget extends WidgetType {
  eq() {
    return true;
  }

  toDOM() {
    const element = document.createElement("div");
    element.className = "cm-frontmatter-spacer";
    element.setAttribute("aria-hidden", "true");
    return element;
  }

  get estimatedHeight() {
    return 24;
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
  const doc = state.doc.toString();
  const range = findFrontmatterFoldRange(doc);
  if (!range) return Decoration.none;
  if (!collapsed) {
    const next = state.doc.lineAt(range.closeTo).number + 1;
    if (next > state.doc.lines || state.doc.line(next).text.trim() === "") return Decoration.none;
    return Decoration.set([
      Decoration.widget({ block: true, side: 1, widget: new FrontmatterSpacerWidget() }).range(range.closeTo),
    ]);
  }
  const summary = frontmatterSummary(frontmatterKeys(doc));
  return Decoration.set([
    Decoration.replace({ block: true, widget: new CollapsedFrontmatterWidget(summary) })
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
  create: (state) => ({ collapsed: false, decorations: buildDecorations(state, false) }),
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
