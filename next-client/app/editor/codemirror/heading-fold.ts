import type { EditorState, Extension, Range } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, type KeyBinding, ViewPlugin, type ViewUpdate, WidgetType } from "@codemirror/view";
import { codeFolding, ensureSyntaxTree, foldEffect, foldedRanges, syntaxTree, unfoldEffect } from "@codemirror/language";
import type { SyntaxNode, Tree } from "@lezer/common";
import { bodyStart, frontmatterRangeOf, frontmatterSummary } from "./frontmatter-block";

// Heading sections fold like an outline: a `#`–`######` heading at the top
// level of the note (not in a quote, callout or list) hides everything under
// it up to the next heading of the same or a higher level. The fold is
// CodeMirror's own (foldEffect), so the text stays in the document and the
// caret steps over it; moving the caret into it or editing it unfolds it.
// Toggles: a chevron that hangs in the leading margin where the heading's
// `#`s would, shown while the pointer is over the heading and always while
// it's folded; the `…` after a folded heading; and the keyboard commands.
// The frontmatter folds the same way, as a section of its own (level 0):
// the whole block folds into one line that names it ("Frontmatter · title ·
// #tags").

const ATX = /^ATXHeading(\d)$/;
const HEADING_LINE = /^ {0,3}#{1,6}(?:[ \t]|$)/;

export interface HeadingSection {
  // 1–6 for a heading, 0 for the frontmatter.
  level: number;
  // Start of the heading's line.
  headingFrom: number;
  // The folded range: from the end of the heading's line to the end of the
  // section's last block, so blank lines before the next heading stay.
  from: number;
  to: number;
}

const levelOf = (node: SyntaxNode) => {
  const match = ATX.exec(node.name);
  return match ? Number(match[1]) : null;
};

// A `# comment` in the YAML parses as a heading; it isn't one.
const afterFrontmatter = (state: EditorState, pos: number) => pos > (frontmatterRangeOf(state.doc)?.closeTo ?? -1);

// The frontmatter as a section: the whole block, opening `---` included, so
// folded it shows only its summary.
function frontmatterSection(state: EditorState): HeadingSection | null {
  const range = frontmatterRangeOf(state.doc);
  return range ? { level: 0, headingFrom: 0, from: 0, to: range.closeTo } : null;
}

// Where the fold of the section on the line at `lineFrom` starts: the
// frontmatter's at the top of the note, a heading's at the end of its line.
function foldStartOn(state: EditorState, lineFrom: number) {
  const line = state.doc.lineAt(lineFrom);
  return line.number === 1 && frontmatterRangeOf(state.doc) ? 0 : line.to;
}

// The whole note's tree for a command or a click (a heading's section can
// run to the end), the parsed part when that takes too long.
const fullTree = (state: EditorState): Tree => ensureSyntaxTree(state, state.doc.length, 200) ?? syntaxTree(state);

function sectionOf(state: EditorState, heading: SyntaxNode, level: number): HeadingSection | null {
  const line = state.doc.lineAt(heading.from);
  let last: SyntaxNode = heading;
  for (let next = heading.nextSibling; next; next = next.nextSibling) {
    const nextLevel = levelOf(next);
    if (nextLevel !== null && nextLevel <= level) break;
    last = next;
  }
  return last.to > line.to ? { level, headingFrom: line.from, from: line.to, to: last.to } : null;
}

// The top-level heading on the line at `lineFrom`, if any.
function headingOnLine(state: EditorState, tree: Tree, lineFrom: number) {
  const line = state.doc.lineAt(lineFrom);
  const node = tree.topNode.childAfter(line.from);
  if (!node || node.from > line.to || !afterFrontmatter(state, node.from)) return null;
  const level = levelOf(node);
  return level === null ? null : { node, level };
}

// The section of the heading on the line at `lineFrom`.
export function headingSectionAt(state: EditorState, lineFrom: number): HeadingSection | null {
  if (state.doc.lineAt(lineFrom).number === 1 && frontmatterRangeOf(state.doc)) return frontmatterSection(state);
  const heading = headingOnLine(state, fullTree(state), lineFrom);
  return heading ? sectionOf(state, heading.node, heading.level) : null;
}

// The section `pos` is in: the frontmatter, its own line's heading, or the
// nearest top-level heading above it (nothing between them can close that
// heading's section).
export function sectionAround(state: EditorState, pos: number): HeadingSection | null {
  const frontmatter = frontmatterRangeOf(state.doc);
  if (frontmatter && pos <= frontmatter.closeTo) return frontmatterSection(state);
  const tree = fullTree(state);
  const line = state.doc.lineAt(pos);
  for (let node = tree.topNode.childBefore(line.to + 1); node; node = node.prevSibling) {
    const level = levelOf(node);
    if (level === null) continue;
    return afterFrontmatter(state, node.from) ? sectionOf(state, node, level) : null;
  }
  return null;
}

const isFrontmatterFoldAt = (state: EditorState, from: number) => from === 0 && frontmatterRangeOf(state.doc) !== null;

// Whether a fold starting at `from` is a heading's or the frontmatter's: it
// starts at the end of a heading line or at the top of the note. Callouts
// and `<details>` fold from their own title lines.
export function isHeadingFoldAt(state: EditorState, from: number) {
  if (isFrontmatterFoldAt(state, from)) return true;
  const line = state.doc.lineAt(from);
  return from === line.to && HEADING_LINE.test(line.text) && afterFrontmatter(state, line.from);
}

// The fold that starts at `foldFrom` (foldStartOn), if it's folded.
export function foldedSectionAt(state: EditorState, foldFrom: number): { from: number; to: number } | null {
  const found: { from: number; to: number }[] = [];
  foldedRanges(state).between(foldFrom, foldFrom, (from, to) => {
    if (from === foldFrom) found.push({ from, to });
  });
  return found[0] ?? null;
}

function foldSection(view: EditorView, section: HeadingSection) {
  // The caret inside a fold would unfold it, so it parks at the heading's
  // end (for the frontmatter, the start of the body, so unfolding shows the
  // header rather than the raw YAML; the top of the note without a body).
  const head = view.state.selection.main.head;
  const inside = head > section.from && head <= section.to;
  const park = section.level === 0 ? bodyStart(view.state.doc) ?? section.from : section.from;
  view.dispatch({
    effects: foldEffect.of({ from: section.from, to: section.to }),
    ...(inside ? { selection: { anchor: park } } : {}),
  });
}

// Folds or unfolds the section of the heading on the line at `lineFrom`.
export function toggleHeadingFold(view: EditorView, lineFrom: number): boolean {
  const folded = foldedSectionAt(view.state, foldStartOn(view.state, lineFrom));
  if (folded) {
    view.dispatch({ effects: unfoldEffect.of(folded) });
    return true;
  }
  const section = headingSectionAt(view.state, lineFrom);
  if (!section) return false;
  foldSection(view, section);
  return true;
}

// Fold Current Section: the section the caret is in; again unfolds it.
export function foldCurrentSection(view: EditorView): boolean {
  const section = sectionAround(view.state, view.state.selection.main.head);
  if (!section) return false;
  const folded = foldedSectionAt(view.state, section.from);
  if (folded) view.dispatch({ effects: unfoldEffect.of(folded) });
  else foldSection(view, section);
  return true;
}

// Unfold All: every folded heading and the frontmatter. Folded callouts and `<details>` stay,
// since their state is written in the note.
export function unfoldAllSections(view: EditorView): boolean {
  const effects: ReturnType<typeof unfoldEffect.of>[] = [];
  foldedRanges(view.state).between(0, view.state.doc.length, (from, to) => {
    if (isHeadingFoldAt(view.state, from)) effects.push(unfoldEffect.of({ from, to }));
  });
  if (effects.length) view.dispatch({ effects });
  return true;
}

// The folded headings by line text, in note order, so a note reopened in the
// same session folds the same headings (headingFoldKeys / restoreHeadingFolds).
// Folded frontmatter is `---`, which no heading line is.
const FRONTMATTER_KEY = "---";

export function headingFoldKeys(state: EditorState): string[] {
  const keys: string[] = [];
  foldedRanges(state).between(0, state.doc.length, (from) => {
    if (!isHeadingFoldAt(state, from)) return;
    const line = state.doc.lineAt(from);
    keys.push(line.number === 1 && frontmatterRangeOf(state.doc) ? FRONTMATTER_KEY : line.text);
  });
  return keys;
}

export function restoreHeadingFolds(view: EditorView, keys: readonly string[]) {
  if (!keys.length) return;
  const wanted = new Map<string, number>();
  for (const key of keys) wanted.set(key, (wanted.get(key) ?? 0) + 1);
  const { state } = view;
  const effects: ReturnType<typeof foldEffect.of>[] = [];
  const frontmatter = wanted.has(FRONTMATTER_KEY) ? frontmatterSection(state) : null;
  if (frontmatter) effects.push(foldEffect.of({ from: frontmatter.from, to: frontmatter.to }));
  for (let node = fullTree(state).topNode.firstChild; node; node = node.nextSibling) {
    const level = levelOf(node);
    if (level === null || !afterFrontmatter(state, node.from)) continue;
    const text = state.doc.lineAt(node.from).text;
    const left = wanted.get(text);
    if (!left) continue;
    const section = sectionOf(state, node, level);
    if (!section) continue;
    wanted.set(text, left - 1);
    effects.push(foldEffect.of({ from: section.from, to: section.to }));
  }
  if (effects.length) view.dispatch({ effects });
}

export const headingFoldKeymap: KeyBinding[] = [
  { key: "Mod-Shift-.", run: foldCurrentSection, preventDefault: true },
  { key: "Mod-Shift-,", run: unfoldAllSections, preventDefault: true },
];

const CHEVRON =
  '<svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor">' +
  '<path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd"/></svg>';

class HeadingFoldWidget extends WidgetType {
  constructor(readonly folded: boolean, readonly frontmatter = false) {
    super();
  }

  eq(other: HeadingFoldWidget) {
    return other.folded === this.folded && other.frontmatter === this.frontmatter;
  }

  toDOM(view: EditorView) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = this.frontmatter ? "cm-headingFold cm-frontmatterFold" : "cm-headingFold";
    const what = this.frontmatter ? "frontmatter" : "section";
    const label = `${this.folded ? "Unfold" : "Fold"} ${what}`;
    button.setAttribute("aria-expanded", String(!this.folded));
    button.setAttribute("aria-label", label);
    button.title = label;
    button.innerHTML = CHEVRON;
    // mousedown, not click: CodeMirror would otherwise move the caret first.
    button.addEventListener("mousedown", (event) => event.preventDefault());
    button.addEventListener("click", (event) => {
      event.preventDefault();
      toggleHeadingFold(view, view.posAtDOM(button));
    });
    return button;
  }

  ignoreEvent() {
    return true;
  }
}

const foldable = Decoration.widget({ widget: new HeadingFoldWidget(false), side: -1 });
const folded = Decoration.widget({ widget: new HeadingFoldWidget(true), side: -1 });
const frontmatterFoldable = Decoration.widget({ widget: new HeadingFoldWidget(false, true), side: -1 });
const frontmatterFolded = Decoration.widget({ widget: new HeadingFoldWidget(true, true), side: -1 });
// Folded, the summary line is the panel's last line too: its bottom corners.
const frontmatterFoldedEnd = Decoration.line({ class: "cm-frontmatter-end" });

// Chevrons for the rendered part of the note only. A heading can fold when
// a block follows it before the next heading of its level or higher; that
// needs only the next block, never the section's end.
function chevronDecorations(view: EditorView): DecorationSet {
  const { state } = view;
  const tree = syntaxTree(state);
  const ranges: Range<Decoration>[] = [];
  const frontmatter = frontmatterRangeOf(state.doc);
  // The viewport, not visibleRanges: those skip folded text, so folded
  // frontmatter (folded from 0) would lose its chevron.
  if (frontmatter && view.viewport.from === 0) {
    if (foldedSectionAt(state, 0)) {
      ranges.push(frontmatterFoldedEnd.range(0), frontmatterFolded.range(0));
    } else {
      ranges.push(frontmatterFoldable.range(0));
    }
  }
  for (const { from, to } of view.visibleRanges) {
    for (let node = tree.topNode.childAfter(from); node && node.from <= to; node = node.nextSibling) {
      const level = levelOf(node);
      if (level === null || !afterFrontmatter(state, node.from)) continue;
      const line = state.doc.lineAt(node.from);
      if (foldedSectionAt(state, line.to)) {
        ranges.push(folded.range(line.from));
        continue;
      }
      const next = node.nextSibling;
      const nextLevel = next ? levelOf(next) : null;
      if (next && (nextLevel === null || nextLevel > level)) ranges.push(foldable.range(line.from));
    }
  }
  return Decoration.set(ranges, true);
}

const headingFoldChevrons = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = chevronDecorations(view);
    }
    update(update: ViewUpdate) {
      if (
        update.docChanged
        || update.viewportChanged
        || foldedRanges(update.startState) !== foldedRanges(update.state)
        || syntaxTree(update.startState) !== syntaxTree(update.state)
      ) {
        this.decorations = chevronDecorations(update.view);
      }
    }
  },
  { decorations: (value) => value.decorations },
);

type Prepared = "heading" | { frontmatter: string[] } | null;

// The fold's placeholder: a quiet `…` after a folded heading, and folded
// frontmatter's summary in place of the block, each unfolding it on click;
// other folds (callouts, `<details>`) keep CodeMirror's placeholder, which
// the theme hides behind their own chevrons.
function placeholderDOM(view: EditorView, onclick: (event: Event) => void, prepared: Prepared) {
  const element = document.createElement("span");
  if (prepared && typeof prepared === "object") {
    element.className = "cm-frontmatterFoldPlaceholder";
    element.title = "Unfold frontmatter";
    const [label, ...rest] = prepared.frontmatter;
    element.append(label);
    for (const part of rest) {
      const value = document.createElement("span");
      value.className = "cm-frontmatterFoldValue";
      value.textContent = part;
      element.append(" · ", value);
    }
    element.onclick = onclick;
    return element;
  }
  element.textContent = "…";
  element.className = prepared === "heading" ? "cm-headingFoldPlaceholder" : "cm-foldPlaceholder";
  element.title = prepared === "heading" ? "Unfold section" : view.state.phrase("unfold");
  element.setAttribute("aria-label", prepared === "heading" ? "Folded section" : view.state.phrase("folded code"));
  element.onclick = onclick;
  return element;
}

export const headingFolding: Extension = [
  codeFolding({
    preparePlaceholder: (state, range): Prepared => {
      if (isFrontmatterFoldAt(state, range.from)) return { frontmatter: ["Frontmatter", ...frontmatterSummary(state)] };
      return isHeadingFoldAt(state, range.from) ? "heading" : null;
    },
    placeholderDOM,
  }),
  headingFoldChevrons,
];
