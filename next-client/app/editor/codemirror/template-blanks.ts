import { EditorSelection, StateEffect, StateField, type EditorState } from "@codemirror/state";
import { keymap, type EditorView } from "@codemirror/view";
import toast from "react-hot-toast";
import { isBlankToken, templateTokenRegex } from "@/app/utils/templates/template-tokens";
import { isInCode, templateNoteField } from "./template-field-pills";

// Blanks a template leaves in a note (`{{task_1}}`): Tab selects the next one
// so typing replaces it, Shift+Tab the previous one, both wrapping around.
// When the last blank is gone, the next Tab says "Template ready ✦" once.
// Escape stops Tab jumping in this note until another template is inserted.
// Not in template notes (there the braces are being authored) and not inside
// a table (table-commands.ts runs first).

interface BlankNav {
  /** Tab has jumped to a blank since the last insert. */
  active: boolean;
  /** Escape was pressed: Tab is plain Tab again. */
  dismissed: boolean;
}

const setBlankNav = StateEffect.define<BlankNav>();

export const blankNavField = StateField.define<BlankNav>({
  create: () => ({ active: false, dismissed: false }),
  update(value, tr) {
    for (const effect of tr.effects) if (effect.is(setBlankNav)) return effect.value;
    if (tr.isUserEvent("input.replace.template")) return { active: false, dismissed: false };
    return value;
  },
});

export function findBlanks(state: EditorState): { from: number; to: number }[] {
  const blanks: { from: number; to: number }[] = [];
  for (const match of state.doc.toString().matchAll(templateTokenRegex())) {
    if (!isBlankToken(match[1]) || isInCode(state, match.index)) continue;
    blanks.push({ from: match.index, to: match.index + match[0].length });
  }
  return blanks;
}

export function jumpToBlank(view: EditorView, direction: 1 | -1): boolean {
  const { state } = view;
  if (state.field(templateNoteField, false)) return false;
  const nav = state.field(blankNavField, false);
  if (!nav || nav.dismissed) return false;
  const blanks = findBlanks(state);
  if (blanks.length === 0) {
    if (!nav.active) return false;
    view.dispatch({ effects: setBlankNav.of({ active: false, dismissed: false }) });
    toast.success("Template ready ✦", { duration: 1500, position: "bottom-right" });
    return true;
  }
  const { from, to } = state.selection.main;
  const target = direction > 0
    ? blanks.find((blank) => blank.from >= to) ?? blanks[0]
    : [...blanks].reverse().find((blank) => blank.to <= from) ?? blanks[blanks.length - 1];
  view.dispatch({
    selection: EditorSelection.range(target.from, target.to),
    effects: setBlankNav.of({ active: true, dismissed: false }),
    scrollIntoView: true,
    userEvent: "select.blank",
  });
  return true;
}

function dismissBlanks(view: EditorView): boolean {
  const nav = view.state.field(blankNavField, false);
  if (nav && !nav.dismissed && findBlanks(view.state).length > 0) {
    view.dispatch({ effects: setBlankNav.of({ active: false, dismissed: true }) });
  }
  return false; // Escape still does its usual job.
}

export const templateBlanks = [
  blankNavField,
  keymap.of([
    { key: "Tab", run: (view) => jumpToBlank(view, 1) },
    { key: "Shift-Tab", run: (view) => jumpToBlank(view, -1) },
    { key: "Escape", run: dismissBlanks },
  ]),
];
