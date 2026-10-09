import { Annotation, EditorState, StateEffect, StateField, Transaction } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view";
import { parseFmFields } from "@/app/utils/frontmatter-utils";
import { buildTagMatch, tagPillClassName } from "./tag-pills";

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
// with the shared frontmatter parser, so the summary row always lists
// the same keys as other readers.
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

const SUMMARY_TAG_LIMIT = 3;

export interface FrontmatterRowSummary {
  status: string | null;
  // The first few tags, without `#`, then a count of the rest.
  tags: string[];
  moreTags: number;
  // The other keys, as `frontmatterSummary` lists them.
  keys: string;
}

function unquote(value: string) {
  return value.trim().replace(/^['"]|['"]$/g, "").trim();
}

// What the collapsed row shows: `status` and `tags` as values (chips), the
// remaining keys by name. A key shown as chips isn't named again; an empty
// `status` or `tags` stays a plain key.
export function frontmatterRowSummary(doc: string): FrontmatterRowSummary {
  const fields = parseFmFields(doc);
  const status = "status" in fields ? unquote(fields.status) || null : null;
  const allTags = (fields.tags ?? "")
    .split(",")
    .map((tag) => unquote(tag).replace(/^#/, ""))
    .filter(Boolean);
  const keys = Object.keys(fields).filter(
    (key) => !(key === "status" && status) && !(key === "tags" && allTags.length > 0),
  );
  return {
    status,
    tags: allTags.slice(0, SUMMARY_TAG_LIMIT),
    moreTags: Math.max(0, allTags.length - SUMMARY_TAG_LIMIT),
    keys: frontmatterSummary(keys),
  };
}

// The row as one line of text, for its accessible label:
// "draft, #work, #ideas, +1, title, created".
export function frontmatterRowLabel(summary: FrontmatterRowSummary): string {
  return [
    summary.status,
    ...summary.tags.map((tag) => `#${tag}`),
    summary.moreTags > 0 ? `+${summary.moreTags}` : null,
    summary.keys || null,
  ].filter(Boolean).join(", ");
}

// A chip coloured like the same word as an inline tag: workflow words
// (`draft`, `review`, …) and task states (`todo`, `done`, …) keep their
// colours; anything else is muted.
function summaryChip(text: string, kindOf: string) {
  const chip = document.createElement("span");
  chip.className = `${tagPillClassName(buildTagMatch(kindOf, 0, 0)?.kind ?? "custom")} cm-frontmatter-chip`;
  chip.textContent = text;
  return chip;
}

// The frontmatter's header row, in the same place either way, so it
// expands and collapses from one spot. Collapsed, the block is a block
// widget, not a fold: a fold's placeholder lives inside a text line, which
// either costs a row or merges the next content line into the frontmatter's
// first line (and its styling). It's this one quiet row ("▸ Properties ·
// title, tags"); clicking it expands the block, as does moving the caret
// into it (arrowing up from the first line). Expanded, the row ("▾
// Properties") sits above the YAML and collapses it.
// Fired on the editor's DOM when the Properties row is clicked (not when
// the caret or an edit expands it), so the app can remember the choice.
export const FRONTMATTER_TOGGLE_EVENT = "hermes:frontmatter-toggle";

class FrontmatterHeaderWidget extends WidgetType {
  constructor(readonly summary: FrontmatterRowSummary, readonly collapsed: boolean) {
    super();
  }

  eq(other: FrontmatterHeaderWidget) {
    return other.collapsed === this.collapsed
      && JSON.stringify(other.summary) === JSON.stringify(this.summary);
  }

  toDOM(view: EditorView) {
    const element = document.createElement("div");
    element.className = this.collapsed ? "cm-frontmatterCollapsed" : "cm-frontmatterHeader";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "cm-frontmatter-summary";
    button.setAttribute("aria-expanded", String(!this.collapsed));
    const rowLabel = frontmatterRowLabel(this.summary);
    button.setAttribute(
      "aria-label",
      !this.collapsed ? "Hide properties" : rowLabel ? `Show properties: ${rowLabel}` : "Show properties",
    );
    button.innerHTML =
      '<svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" class="cm-frontmatter-summary-chevron">' +
      '<path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd"/></svg>';
    const label = document.createElement("span");
    label.textContent = "Properties";
    button.append(label);
    if (this.collapsed && rowLabel) {
      // Chips, then the remaining key names: "· draft #work #ideas +1 · title".
      const { status, tags, moreTags, keys } = this.summary;
      const content = document.createElement("span");
      content.className = "cm-frontmatter-summary-keys";
      content.setAttribute("aria-hidden", "true");
      content.append("·");
      if (status) content.append(summaryChip(status, status));
      for (const tag of tags) content.append(summaryChip(`#${tag}`, tag));
      if (moreTags > 0) content.append(` +${moreTags}`);
      if (keys) content.append(status || tags.length > 0 ? ` · ${keys}` : ` ${keys}`);
      button.append(content);
    }
    // mousedown, not click: CodeMirror would otherwise move the caret first.
    button.addEventListener("mousedown", (event) => event.preventDefault());
    button.addEventListener("click", (event) => {
      event.preventDefault();
      const range = findFrontmatterFoldRange(view.state.doc.toString());
      if (range) {
        toggleFrontmatterFold(view, range, !this.collapsed);
        view.dom.dispatchEvent(new CustomEvent(FRONTMATTER_TOGGLE_EVENT, { detail: { collapsed: !this.collapsed } }));
      }
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
  const summary = frontmatterRowSummary(doc);
  if (!collapsed) {
    const decorations = [
      Decoration.widget({ block: true, side: -1, widget: new FrontmatterHeaderWidget(summary, false) }).range(range.bodyFrom),
    ];
    const next = state.doc.lineAt(range.closeTo).number + 1;
    if (next <= state.doc.lines && state.doc.line(next).text.trim() !== "") {
      decorations.push(
        Decoration.widget({ block: true, side: 1, widget: new FrontmatterSpacerWidget() }).range(range.closeTo),
      );
    }
    return Decoration.set(decorations);
  }
  return Decoration.set([
    Decoration.replace({ block: true, widget: new FrontmatterHeaderWidget(summary, true) })
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

// Marks a collapse or expand that should land without the fade: the
// default applied as a file opens.
const instantToggle = Annotation.define<boolean>();

// What appears under the header row: the keys on collapse, the YAML on expand. The row itself stays put, so it doesn't fade.
const FADE_SELECTOR =
  ".cm-frontmatter-summary-keys, .cm-frontmatter-line, .cm-frontmatter-spacer";

// Collapsing swaps the YAML lines for the summary row (and back) in one
// frame, so there are no two heights to transition between; instead what
// appears fades in. Only on a toggle: lines CodeMirror redraws for
// scrolling or edits stay put.
const fadeOnToggle = ViewPlugin.fromClass(class {
  update(update: ViewUpdate) {
    if (isFrontmatterFolded(update.startState) === isFrontmatterFolded(update.state)) return;
    if (update.transactions.some((tr) => tr.annotation(instantToggle))) return;
    if (typeof window === "undefined" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    // The DOM is redrawn after update(); the write phase runs after that.
    update.view.requestMeasure({
      read: () => null,
      write: (_, view) => {
        view.contentDOM.querySelectorAll<HTMLElement>(FADE_SELECTOR).forEach((element) => {
          element.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: "ease-out" });
        });
      },
    });
  }
});

export const frontmatterCollapse = [frontmatterCollapseField, fadeOnToggle];

export function toggleFrontmatterFold(
  view: EditorView,
  range: FrontmatterFoldRange,
  collapse: boolean,
  { animate = true }: { animate?: boolean } = {},
) {
  // Collapsing with the caret inside the hidden block would leave typing
  // invisible, so park it at the start of the first visible line.
  const head = view.state.selection.main.head;
  const parkCaret = collapse && head <= range.bodyTo && range.bodyTo < view.state.doc.length;
  view.dispatch({
    effects: setFrontmatterCollapsed.of(collapse),
    ...(animate ? {} : { annotations: instantToggle.of(true) }),
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
