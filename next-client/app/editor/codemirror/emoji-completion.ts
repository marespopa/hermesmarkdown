import type { Completion, CompletionContext, CompletionResult } from "@codemirror/autocomplete";
import { EditorSelection } from "@codemirror/state";
import { inCode } from "./html-paste";
import { loadEmojiIndex, loadedEmojiIndex, matchEmojis, type EmojiEntry } from "./emoji-index";

type Open = "{" | ":";

// One Completion per emoji and opening character, made on first use and
// kept, so a key press only searches and doesn't rebuild ~1,900 options.
const completions: Record<Open, Completion[]> = { "{": [], ":": [] };

function completionFor(entry: EmojiEntry, open: Open): Completion {
  const close = open === "{" ? "}" : ":";
  const { name, emoji } = entry;
  return (completions[open][entry.index] ??= {
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
  });
}

// `{` menu of every emoji (emoji-index.ts: the curated EMOJI_SHORTCODES, then
// the full Unicode list by CLDR name): `{fi` offers 🔥 fire, and picking one
// inserts the emoji, as typing `{fire}` would (shortcode-expand.ts). A bare
// `{` opens it with every emoji, narrowed as you type a name, alias or
// keyword; `{{` is the template field menu's, and code is left alone. `:`
// opens it too, at a word's start and once a letter follows (`:fi`), so a
// colon in prose or a time stays quiet. The menu renders only the options
// around the selected one (`maxRenderedOptions`, extensions.ts).
export function createEmojiSource() {
  return (context: CompletionContext): CompletionResult | null | Promise<CompletionResult | null> => {
    const typed = context.matchBefore(/\{[\w+-]*$/) ?? context.matchBefore(/:[a-z][\w+-]*$/i);
    if (!typed) return null;
    const open = typed.text[0] as Open;
    const charBefore = context.state.sliceDoc(typed.from - 1, typed.from);
    if (open === "{" ? charBefore === "{" : charBefore.trim() !== "") return null;
    if (inCode(context.state, context.pos)) return null;

    const complete = (entries: EmojiEntry[]): CompletionResult | null => {
      const matches = matchEmojis(entries, typed.text.slice(1));
      if (matches.length === 0) return null;
      const options = matches.map((entry) => completionFor(entry, open));
      return { from: typed.from, to: context.pos, options, filter: false };
    };
    const entries = loadedEmojiIndex();
    return entries ? complete(entries) : loadEmojiIndex().then(complete);
  };
}
