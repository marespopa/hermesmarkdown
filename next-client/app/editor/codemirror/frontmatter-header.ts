import { StateEffect, StateField, type EditorState } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, WidgetType } from "@codemirror/view";
import { foldedRanges } from "@codemirror/language";
import { isolateHistory } from "@codemirror/commands";
import {
  frontmatterHeaderChips,
  frontmatterValueSpan,
  type HeaderChip,
} from "../utils/frontmatter-header-chips";
import { frontmatterRangeOf } from "./frontmatter-block";
import { frontmatterHeaderTheme } from "./frontmatter-header-theme";

// The frontmatter as one row of chips (type, tags, status, dates, other
// keys) while the caret is outside the block; the raw YAML shows, as typed,
// while the caret or selection touches the block or the YAML is too complex
// (utils/frontmatter-header-chips.ts). The row replaces `0..closeTo` from a
// state field, like the fold does, so line 1 stays a line and the fold
// chevron at 0 and the spacer after the block keep working.

export const FRONTMATTER_CHIP_EVENT = "hermes:frontmatter-chip";

// Sent from `view.dom` when a status or date chip asks for its menu or picker
// (hooks/use-frontmatter-header.ts answers).
export interface FrontmatterChipRequest {
  kind: "status" | "date";
  key: string;
  value: string;
  anchor?: DOMRect;
}

export const setHeaderFocus = StateEffect.define<boolean>();

export interface HeaderState {
  focused: boolean;
  chips: HeaderChip[] | null;
  shown: boolean;
  decorations: DecorationSet;
}

const blockText = (state: EditorState) => {
  const range = frontmatterRangeOf(state.doc);
  return range ? state.doc.sliceString(0, range.closeTo) : null;
};

// Folded at 0: the fold placeholder takes the block's place.
function foldedAtZero(state: EditorState): boolean {
  let folded = false;
  foldedRanges(state).between(0, 0, (from) => {
    if (from === 0) folded = true;
  });
  return folded;
}

function computeShown(state: EditorState, focused: boolean, chips: HeaderChip[] | null): boolean {
  const range = frontmatterRangeOf(state.doc);
  if (!range || !chips || foldedAtZero(state)) return false;
  if (!focused) return true;
  return !state.selection.ranges.some((r) => r.from <= range.closeTo);
}

function chipsOf(state: EditorState): HeaderChip[] | null {
  const text = blockText(state);
  return text === null ? null : frontmatterHeaderChips(text);
}

function chipElement(view: EditorView, chip: HeaderChip): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "cm-fm-chip";
  button.dataset.kind = chip.kind;
  button.setAttribute("aria-label", chip.ariaLabel);
  button.title = chip.keyLabel ? chip.label : `${chip.key}: ${chip.value}`;
  if (chip.keyLabel) {
    const key = document.createElement("span");
    key.className = "cm-fm-chip-key";
    key.textContent = chip.keyLabel;
    button.append(key, chip.label.slice(chip.keyLabel.length));
  } else {
    button.textContent = chip.label;
  }
  // The caret stays where it is: only a click on the row's background moves it.
  button.addEventListener("mousedown", (event) => event.preventDefault());
  button.addEventListener("click", () => activateChip(view, chip, button));
  return button;
}

function activateChip(view: EditorView, chip: HeaderChip, button: HTMLElement) {
  if (chip.kind === "status" || chip.kind === "date") {
    const detail: FrontmatterChipRequest = {
      kind: chip.kind,
      key: chip.key,
      value: chip.value,
      anchor: button.getBoundingClientRect(),
    };
    view.dom.dispatchEvent(new CustomEvent(FRONTMATTER_CHIP_EVENT, { bubbles: true, detail }));
    return;
  }
  const text = blockText(view.state);
  const span = text === null ? null : frontmatterValueSpan(text, chip.key);
  if (!span) return;
  view.dispatch({ selection: { anchor: span.from }, scrollIntoView: true });
  view.focus();
}

class FrontmatterHeaderWidget extends WidgetType {
  constructor(private readonly chips: HeaderChip[]) {
    super();
  }

  eq(other: FrontmatterHeaderWidget) {
    const sign = (chips: HeaderChip[]) => chips.map((c) => [c.kind, c.label, c.keyLabel, c.value, c.line].join("\0")).join("\n");
    return sign(this.chips) === sign(other.chips);
  }

  toDOM(view: EditorView) {
    const row = document.createElement("span");
    row.className = "cm-frontmatter-header";
    row.setAttribute("role", "toolbar");
    row.setAttribute("aria-label", "Frontmatter");
    for (const chip of this.chips) row.append(chipElement(view, chip), " ");
    row.addEventListener("keydown", (event) => {
      const buttons = Array.from(row.querySelectorAll<HTMLElement>(".cm-fm-chip"));
      const at = buttons.indexOf(document.activeElement as HTMLElement);
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        const next = buttons[at + (event.key === "ArrowRight" ? 1 : -1)];
        if (next) next.focus();
        event.preventDefault();
      } else if (event.key === "Escape") {
        view.focus();
        event.preventDefault();
      }
    });
    return row;
  }

  // Chips handle their own events; the row's background reaches CodeMirror,
  // so a click there puts the caret in the block and reveals the YAML.
  ignoreEvent(event: Event) {
    return event.target instanceof Element && !!event.target.closest(".cm-fm-chip");
  }
}

function buildDecorations(state: EditorState, chips: HeaderChip[]): DecorationSet {
  const range = frontmatterRangeOf(state.doc);
  if (!range) return Decoration.none;
  return Decoration.set([
    Decoration.line({ class: "cm-frontmatter-end cm-frontmatter-header-line" }).range(0),
    Decoration.replace({ widget: new FrontmatterHeaderWidget(chips) }).range(0, range.closeTo),
  ], true);
}

function initial(state: EditorState): HeaderState {
  const chips = chipsOf(state);
  const shown = computeShown(state, false, chips);
  return { focused: false, chips, shown, decorations: shown && chips ? buildDecorations(state, chips) : Decoration.none };
}

export const frontmatterHeaderField = StateField.define<HeaderState>({
  create: initial,
  update(value, tr) {
    let { focused, chips } = value;
    for (const effect of tr.effects) if (effect.is(setHeaderFocus)) focused = effect.value;
    if (tr.docChanged) {
      // Only an edit in or next to the block, or one that makes or breaks it, re-reads it.
      const before = frontmatterRangeOf(tr.startState.doc);
      const after = frontmatterRangeOf(tr.state.doc);
      if (before || after) {
        const reach = Math.max(before?.closeTo ?? 0, after?.closeTo ?? 0) + 1;
        if (!before || !after || tr.changes.touchesRange(0, reach)) chips = chipsOf(tr.state);
      }
    }
    const shown = computeShown(tr.state, focused, chips);
    if (shown === value.shown && chips === value.chips && focused === value.focused) return value;
    const rebuild = shown !== value.shown || chips !== value.chips;
    return {
      focused,
      chips,
      shown,
      decorations: !rebuild ? value.decorations : shown && chips ? buildDecorations(tr.state, chips) : Decoration.none,
    };
  },
  provide: (field) => EditorView.decorations.from(field, (value) => value.decorations),
});

export function frontmatterHeaderShown(state: EditorState): boolean {
  return state.field(frontmatterHeaderField, false)?.shown ?? false;
}

// Rewrites only the value characters of `key`'s line (keeping its quotes and
// trailing comment) as one undo step that never merges with typing.
export function setFrontmatterValue(view: EditorView, key: string, value: string): boolean {
  const text = blockText(view.state);
  const span = text === null ? null : frontmatterValueSpan(text, key);
  if (!span) return false;
  view.dispatch({
    changes: { from: span.from, to: span.to, insert: value },
    userEvent: "input.frontmatter",
    annotations: isolateHistory.of("full"),
  });
  return true;
}

// Ctrl/Cmd+Shift+Enter on a `status:` line of the revealed YAML opens the
// status menu, as on a date it opens the date picker.
export function requestFrontmatterChipAtCaret(view: EditorView): boolean {
  const range = frontmatterRangeOf(view.state.doc);
  const head = view.state.selection.main.head;
  if (!range || head > range.closeTo) return false;
  const line = view.state.doc.lineAt(head);
  if (line.number === 1 || !/^status\s*:/.test(line.text)) return false;
  const text = blockText(view.state);
  const span = text === null ? null : frontmatterValueSpan(text, "status");
  if (!span || span.from < line.from || span.from > line.to) return false;
  const coords = view.coordsAtPos(span.from);
  const anchor = coords
    ? ({ left: coords.left, right: coords.left, top: coords.top, bottom: coords.bottom, width: 0, height: coords.bottom - coords.top, x: coords.left, y: coords.top } as DOMRect)
    : undefined;
  const detail: FrontmatterChipRequest = {
    kind: "status",
    key: "status",
    value: view.state.doc.sliceString(span.from, span.to),
    anchor,
  };
  view.dom.dispatchEvent(new CustomEvent(FRONTMATTER_CHIP_EVENT, { bubbles: true, detail }));
  return true;
}

export const frontmatterHeader = [
  frontmatterHeaderField,
  EditorView.focusChangeEffect.of((_state, focusing) => setHeaderFocus.of(focusing)),
  frontmatterHeaderTheme,
];
