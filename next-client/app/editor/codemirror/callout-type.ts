import type { EditorView } from "@codemirror/view";

// The callout type menu: the title label's chevron and a new callout from
// the slash menu ask for it with this event, sent from the editor's DOM.
export const CALLOUT_TYPE_MENU_EVENT = "hermes:callout-type-menu";

export interface CalloutTypeMenuRequest {
  /** Any position on the callout's title line. */
  pos: number;
  /** Where to open it (the label's box); else under the line's start. */
  anchor?: DOMRect;
}

// `> [!type]` at a line's start: the prefix up to `[!`, then the type.
const REGEX_CALLOUT_TYPE = /^((?:>[ \t]*)+\[!)(\w+)\]/;

export function requestCalloutTypeMenu(view: EditorView, detail: CalloutTypeMenuRequest) {
  view.dom.dispatchEvent(new CustomEvent<CalloutTypeMenuRequest>(CALLOUT_TYPE_MENU_EVENT, { bubbles: true, detail }));
}

// The type written on the title line at `pos`, or null when it isn't one.
export function calloutTypeAt(view: EditorView, pos: number): string | null {
  return REGEX_CALLOUT_TYPE.exec(view.state.doc.lineAt(pos).text)?.[2] ?? null;
}

// Rewrites only the type word, so a fold sign (`-`/`+`) and the title stay.
export function setCalloutType(view: EditorView, pos: number, type: string): boolean {
  const line = view.state.doc.lineAt(pos);
  const match = REGEX_CALLOUT_TYPE.exec(line.text);
  if (!match) return false;
  const from = line.from + match[1].length;
  view.dispatch({ changes: { from, to: from + match[2].length, insert: type }, userEvent: "input.callout-type" });
  return true;
}
