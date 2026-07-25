import type { Ctx } from "@milkdown/kit/ctx";
import type { EditorView } from "@milkdown/kit/prose/view";
import { parserCtx } from "@milkdown/kit/core";
import { Slice, Fragment } from "@milkdown/kit/prose/model";
import { TextSelection } from "@milkdown/kit/prose/state";

// Rendered-mode counterpart to codemirror/typewriter-insert.ts's
// typewriterReplaceCM6 — CM6 is a plain-text doc so replacing a range with
// raw markdown text is enough, but Milkdown's doc is a ProseMirror node
// tree, so a markdown-formatted AI suggestion (headings, bold, lists, ...)
// has to be parsed into real nodes via parserCtx first. Otherwise it would
// land as literal "**bold**"/"## heading" characters instead of rendering.
// No typewriter reveal here (unlike CM6): chunking a node tree character by
// character risks splitting it mid-node, so this applies in one dispatch.
export function replaceMilkdownRange(ctx: Ctx, view: EditorView, from: number, to: number, markdown: string): boolean {
  const parser = ctx.get(parserCtx);
  const parsed = parser(markdown);
  if (!parsed) return false;

  const content = parsed.content ?? Fragment.empty;
  const tr = view.state.tr.replace(from, to, new Slice(content, 0, 0));
  tr.setSelection(TextSelection.near(tr.doc.resolve(from + content.size)));
  view.dispatch(tr);
  view.focus();
  return true;
}
