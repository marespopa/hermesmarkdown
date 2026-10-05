import { startCompletion, type Completion, type CompletionContext, type CompletionResult } from "@codemirror/autocomplete";
import { EditorSelection } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { blankName, matchFieldOptions, templateFieldOptions } from "@/app/utils/templates/template-fields";
import type { SlashMenuCallbacks } from "./slash-menu";

type FieldCallbacks = Pick<SlashMenuCallbacks, "onInsertTemplateField" | "onAskTemplateQuestion">;

// End of the field being typed: through a closing `}}` already after the
// caret, so braces never double.
function fieldEnd(view: EditorView, to: number): number {
  const line = view.state.doc.lineAt(to);
  const closing = /^[\w:]*\}\}/.exec(line.text.slice(to - line.from));
  return to + (closing ? closing[0].length : 0);
}

function insertField(view: EditorView, from: number, to: number, insert: string) {
  view.dispatch({
    changes: { from, to, insert },
    selection: EditorSelection.cursor(from + insert.length),
    userEvent: "input.complete",
  });
  view.focus();
}

type AskKind = "question" | "blank";

const ASK_FORMS: Record<AskKind, { open: string; token: (answer: string) => string }> = {
  question: { open: "{{prompt:", token: (answer) => `{{prompt:${answer}}}` },
  blank: { open: "{{", token: (answer) => `{{${blankName(answer)}}}` },
};

// "Ask a question…" / "Blank to fill in…": remove what was typed, ask for the
// name, then insert `{{prompt:Question}}` / `{{name}}`. Without a dialog,
// leaves the braces with the caret inside to type it.
async function insertAsked(
  view: EditorView,
  from: number,
  to: number,
  kind: AskKind,
  ask?: (kind: AskKind) => Promise<string | null>,
) {
  const form = ASK_FORMS[kind];
  if (!ask) {
    view.dispatch({
      changes: { from, to, insert: `${form.open}}}` },
      selection: EditorSelection.cursor(from + form.open.length),
      userEvent: "input.complete",
    });
    return;
  }
  view.dispatch({ changes: { from, to, insert: "" }, userEvent: "input.complete" });
  const answer = (await ask(kind))?.replace(/[{}]/g, "").trim();
  if (!answer || (kind === "blank" && !blankName(answer)) || !view.dom.isConnected) return;
  const at = Math.min(from, view.state.doc.length);
  insertField(view, at, at, form.token(answer));
}

// `{{` menu in template notes: every field by its plain name, with today's
// value or a description. Offered only while the editor can insert template
// fields (callbacks.onInsertTemplateField is set for template notes).
export function createTemplateFieldSource(callbacksRef: { current: FieldCallbacks }) {
  return (context: CompletionContext): CompletionResult | null => {
    if (!callbacksRef.current.onInsertTemplateField) return null;
    const typed = context.matchBefore(/\{\{\s*[\w:]*$/);
    if (!typed) return null;
    const query = typed.text.replace(/^\{\{\s*/, "");
    const matches = matchFieldOptions(templateFieldOptions(context.state.doc.toString(), new Date()), query);
    if (matches.length === 0) return null;

    const options: Completion[] = matches.map((option) => ({
      label: option.label,
      detail: option.detail,
      info: option.info,
      apply: (view, _completion, from, to) => {
        const end = fieldEnd(view, to);
        if (option.ask) void insertAsked(view, from, end, option.ask, callbacksRef.current.onAskTemplateQuestion);
        else insertField(view, from, end, option.insert);
      },
    }));
    return { from: typed.from, to: context.pos, options, filter: false };
  };
}

// Types `{{` over the selection and opens the field menu: the strip's
// "Add field" button and the `/field` slash entry.
export function openTemplateFieldMenu(view: EditorView) {
  const { from, to } = view.state.selection.main;
  view.dispatch({
    changes: { from, to, insert: "{{" },
    selection: EditorSelection.cursor(from + 2),
    userEvent: "input.type",
  });
  view.focus();
  startCompletion(view);
}
