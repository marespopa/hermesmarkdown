import { startCompletion, type Completion, type CompletionContext, type CompletionResult } from "@codemirror/autocomplete";
import { EditorSelection } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { templateFieldOptions } from "@/app/utils/templates/template-fields";
import type { SlashMenuCallbacks } from "./slash-menu";

// `{{` menu in template notes: every field the template engine knows, with
// today's value or a description. Offered only while the editor can insert
// template fields (callbacks.onInsertTemplateField is set for template notes).
export function createTemplateFieldSource(callbacksRef: { current: Pick<SlashMenuCallbacks, "onInsertTemplateField"> }) {
  return (context: CompletionContext): CompletionResult | null => {
    if (!callbacksRef.current.onInsertTemplateField) return null;
    const typed = context.matchBefore(/\{\{\s*[\w:]*$/);
    if (!typed) return null;
    const query = typed.text.replace(/^\{\{\s*/, "").toLowerCase();
    const matches = templateFieldOptions(context.state.doc.toString(), new Date())
      .filter((option) => option.label.toLowerCase().startsWith(query));
    if (matches.length === 0) return null;

    const options: Completion[] = matches.map((option) => ({
      label: option.label,
      detail: option.detail,
      info: option.info,
      apply: (view, _completion, from, to) => {
        // Replace through a closing `}}` already after the caret, so braces never double.
        const line = view.state.doc.lineAt(to);
        const closing = /^[\w:]*\}\}/.exec(line.text.slice(to - line.from));
        const end = to + (closing ? closing[0].length : 0);
        view.dispatch({
          changes: { from, to: end, insert: option.insert },
          selection: EditorSelection.cursor(from + (option.caret ?? option.insert.length)),
          userEvent: "input.complete",
        });
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
