import { EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { EditorSelection } from "@codemirror/state";
import { SHORTCODES } from "../components/constants";
import { REGEX_CALC } from "../components/regex";

// Port of useMarkdownEditor.ts's handleValueChange calc()=/shortcode
// auto-expand (SHORTCODES map + inline calc(...)= evaluator). Runs after
// every doc change: if the text immediately before the cursor matches a
// shortcode or a calc() expression, replace it in a follow-up transaction.
//
// NOTE: this dispatch is deferred via queueMicrotask. Calling
// view.dispatch() synchronously from inside a ViewPlugin's update() (or an
// EditorView.updateListener) re-enters EditorView.update() while the
// current update is still in progress, which CM6 throws on ("Calls to
// EditorView.update are not allowed while an update is in progress").
// (@codemirror/state's EditorState.transactionExtender — the API meant for
// exactly this "merge more changes into the same transaction" case — was
// tried first, but doesn't actually apply its returned changes in the
// installed 6.7.1: a minimal always-append extender was verified to no-op.
// Deferring the dispatch is the same fix already used for the table
// realign-on-exit case.)
function tryExpand(view: EditorView) {
  const sel = view.state.selection.main;
  if (!sel.empty) return;
  const pos = sel.head;
  const line = view.state.doc.lineAt(pos);
  const textUpToCursor = line.text.slice(0, pos - line.from);

  const calcMatch = textUpToCursor.match(REGEX_CALC);
  if (calcMatch) {
    const mathExpression = calcMatch[1];
    const fullMatchString = calcMatch[0];
    const normalized = mathExpression.replace(/(\d),(\d+)/g, (_, pre, post) =>
      post.length <= 2 ? `${pre}.${post}` : `${pre}${post}`,
    );
    const sanitized = normalized.replace(/[^-()\d/*+.]/g, "");
    try {
      // eslint-disable-next-line no-new-func
      const result = new Function(`return (${sanitized})`)();
      const replacement = (Math.round(result * 100) / 100).toString();
      const sliceStart = pos - fullMatchString.length;
      view.dispatch({
        changes: { from: sliceStart, to: pos, insert: replacement },
        selection: EditorSelection.cursor(sliceStart + replacement.length),
        userEvent: "input.replace.calc",
      });
      return true;
    } catch {
      // not a valid expression — fall through to shortcode matching
    }
  }

  for (const [code, getValue] of Object.entries(SHORTCODES)) {
    const sliceStart = Math.max(line.from, pos - code.length);
    if (view.state.sliceDoc(sliceStart, pos) === code) {
      const replacement = getValue();
      view.dispatch({
        changes: { from: sliceStart, to: pos, insert: replacement },
        selection: EditorSelection.cursor(sliceStart + replacement.length),
        userEvent: "input.replace.shortcode",
      });
      return true;
    }
  }
  return false;
}

export const shortcodeExpandPlugin = ViewPlugin.fromClass(
  class {
    update(update: ViewUpdate) {
      if (!update.docChanged) return;
      // Only react to the user's own typing, not our own replacement or
      // external syncs, to avoid re-triggering on the expanded text itself.
      const isOwnEdit = update.transactions.some((tr) =>
        tr.isUserEvent("input") && !tr.isUserEvent("input.replace"),
      );
      if (!isOwnEdit) return;
      const view = update.view;
      queueMicrotask(() => tryExpand(view));
    }
  },
);
