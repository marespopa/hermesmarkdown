import type { EditorState } from "@codemirror/state";
import type { SyntaxNode } from "@lezer/common";
import { CALLOUT_ALIASES, CALLOUT_META } from "../constants/callouts";

const REGEX_CALLOUT_START = /^(?:[ \t]*>)+[ \t]*\[!(\w+)\]/;

// The frame a table grid inside a quote or callout wears, so the block it
// sits in reads as one piece around it: a callout's tint (and its rounded
// bottom when the table is its last line), or a quote's bar. Empty for a
// table that isn't in one.
export function quoteFrameClass(state: EditorState, table: SyntaxNode): string {
  let quote: SyntaxNode | null = null;
  for (let parent = table.parent; parent; parent = parent.parent) {
    if (parent.name === "Blockquote") quote = parent;
  }
  if (!quote) return "";
  const { doc } = state;
  const callout = REGEX_CALLOUT_START.exec(doc.lineAt(quote.from).text);
  if (!callout) return "cm-table-in-quote";
  const type = callout[1].toLowerCase();
  const style = CALLOUT_META[CALLOUT_ALIASES[type] ?? type] ?? CALLOUT_META.note;
  const isLast = doc.lineAt(quote.to).number === doc.lineAt(table.to).number;
  return `cm-table-in-callout ${style.bg}${isLast ? " cm-table-callout-end" : ""}`;
}
