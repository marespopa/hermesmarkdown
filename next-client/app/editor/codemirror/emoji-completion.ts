import type { Completion, CompletionContext, CompletionResult } from "@codemirror/autocomplete";
import { EditorSelection } from "@codemirror/state";
import { EMOJI_SHORTCODES } from "../components/constants";
import { inCode } from "./html-paste";

// The emoji shortcodes `query` finds: names starting with it, then names
// containing it, each in the list's own order.
export function matchEmojis(query: string): [name: string, emoji: string][] {
  const q = query.toLowerCase();
  const entries = Object.entries(EMOJI_SHORTCODES);
  return [
    ...entries.filter(([name]) => name.startsWith(q)),
    ...entries.filter(([name]) => !name.startsWith(q) && name.includes(q)),
  ];
}

// `{` menu of the emoji shortcodes: `{fi` offers 🔥 fire, and picking one
// inserts the emoji, as typing `{fire}` would (SHORTCODES). A bare `{` opens
// it with every emoji, narrowed as you type the name; `{{` is the template
// field menu's, and code is left alone. `:` opens it too, at a word's start
// and once a letter follows (`:fi`), so a colon in prose or a time stays quiet.
export function createEmojiSource() {
  return (context: CompletionContext): CompletionResult | null => {
    const typed = context.matchBefore(/\{[a-z]*$/i) ?? context.matchBefore(/:[a-z]+$/i);
    if (!typed) return null;
    const open = typed.text[0];
    const charBefore = context.state.sliceDoc(typed.from - 1, typed.from);
    if (open === "{" ? charBefore === "{" : charBefore.trim() !== "") return null;
    if (inCode(context.state, context.pos)) return null;
    const matches = matchEmojis(typed.text.slice(1));
    if (matches.length === 0) return null;
    const close = open === "{" ? "}" : ":";

    const options: Completion[] = matches.map(([name, emoji]) => ({
      label: `${open}${name}${close}`,
      displayLabel: `${emoji.trim()}  ${name}`,
      detail: `${open}${name}${close}`,
      apply: (view, _completion, from, to) => {
        // Through a closing `}` or `:` already after the caret, so it doesn't stay behind.
        const end = view.state.sliceDoc(to, to + 1) === close ? to + 1 : to;
        view.dispatch({
          changes: { from, to: end, insert: emoji },
          selection: EditorSelection.cursor(from + emoji.length),
          userEvent: "input.complete",
        });
      },
    }));
    return { from: typed.from, to: context.pos, options, filter: false };
  };
}
