import { startCompletion, type Completion, type CompletionContext, type CompletionResult } from "@codemirror/autocomplete";
import { EditorSelection, type EditorState } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import type { FrontmatterVocabulary } from "@/app/editor/utils/frontmatter-vocabulary";
import { frontmatterRangeOf } from "./frontmatter-block";

// The frontmatter's completion menu, as you type inside the `---` block:
// - a key at the start of a line (`ti` → `title: `), the common keys and the
//   ones the vault uses, without those the block already has;
// - a tag in `tags: [wo` or a `- wo` item under `tags:`, the vault's tags
//   most used first, without those already in the list;
// - a value the vault repeats after other keys (`status: d` → `draft`).
// Nothing is inserted until an option is picked.

export interface FrontmatterCompletionCallbacks {
  frontmatterVocabulary?: () => FrontmatterVocabulary;
}

const KEY_LINE = /^([A-Za-z_][\w-]*):\s*/;
const LIST_KEYS = new Set(["tags", "aliases"]);

// Whether `pos` is on a line between the frontmatter's opening and closing `---`.
function inFrontmatterBody(state: EditorState, pos: number): boolean {
  const range = frontmatterRangeOf(state.doc);
  if (!range) return false;
  const line = state.doc.lineAt(pos).number;
  return line > 1 && line < state.doc.lineAt(range.closeTo).number;
}

// The top-level key a `- item` line belongs to: the nearest unindented
// `key:` line above it.
function parentKey(state: EditorState, lineNumber: number): string | null {
  for (let n = lineNumber - 1; n > 1; n--) {
    const text = state.doc.line(n).text;
    if (/^\s/.test(text) || text.trim() === "") continue;
    return KEY_LINE.exec(text)?.[1] ?? null;
  }
  return null;
}

// The keys already in the block, other than on the caret's line.
function presentKeys(state: EditorState, caretLine: number): Set<string> {
  const keys = new Set<string>();
  const range = frontmatterRangeOf(state.doc);
  if (!range) return keys;
  const last = state.doc.lineAt(range.closeTo).number;
  for (let n = 2; n < last; n++) {
    if (n === caretLine) continue;
    const key = KEY_LINE.exec(state.doc.line(n).text)?.[1];
    if (key) keys.add(key);
  }
  return keys;
}

function insertAt(view: EditorView, from: number, to: number, insert: string, caret = from + insert.length) {
  view.dispatch({ changes: { from, to, insert }, selection: EditorSelection.cursor(caret), userEvent: "input.complete" });
}

// After the key press that picked an option, so the menu opens anew.
function reopenMenu(view: EditorView) {
  setTimeout(() => {
    if (view.dom.isConnected) startCompletion(view);
  }, 0);
}

function keyOption(key: string, values: string[]): Completion {
  return {
    label: key,
    detail: LIST_KEYS.has(key) ? "list" : values.length ? values.slice(0, 3).join(", ") : undefined,
    apply: (view, _completion, from, to) => {
      // `tags: [|]`, then the tag menu; `status: |`, then its values.
      const list = LIST_KEYS.has(key);
      const insert = list ? `${key}: []` : `${key}: `;
      insertAt(view, from, to, insert, from + insert.length - (list ? 1 : 0));
      reopenMenu(view);
    },
  };
}

function valueOption(value: string, kind: "tag" | "value"): Completion {
  return { label: value, type: kind };
}

export function createFrontmatterSource(callbacksRef: { current: FrontmatterCompletionCallbacks }) {
  return (context: CompletionContext): CompletionResult | null => {
    const { state, pos } = context;
    if (!inFrontmatterBody(state, pos)) return null;
    const callbacks = callbacksRef.current;
    const vocabulary = callbacks.frontmatterVocabulary?.() ?? { keys: [], tags: [], values: {} };
    const line = state.doc.lineAt(pos);
    const before = line.text.slice(0, pos - line.from);

    // A tag: `tags: [a, wo`, `tags: wo`, or `  - wo` under `tags:`.
    const inlineTags = /^tags:\s*\[?((?:[^,\]]*,)*)\s*([^,\]\s]*)$/.exec(before);
    const listItem = /^\s+-\s*(\S*)$/.exec(before);
    const listKey = listItem ? parentKey(state, line.number) : null;
    if (inlineTags || listKey === "tags") {
      const typed = inlineTags ? inlineTags[2] : listItem![1];
      const have = new Set(
        (inlineTags ? line.text.replace(/^tags:\s*\[?/, "").replace(/\].*$/, "").split(",") : [])
          .map((tag) => tag.trim().replace(/^#/, ""))
          .filter((tag) => tag && tag !== typed),
      );
      if (listKey === "tags") {
        for (let n = line.number - 1; n > 1 && /^\s+-/.test(state.doc.line(n).text); n--) {
          have.add(state.doc.line(n).text.replace(/^\s+-\s*/, "").trim());
        }
      }
      // An empty item waits for a letter, unless the menu was asked for
      // (picking `tags`, Ctrl+Space).
      if (!typed && !context.explicit) return null;
      const options = vocabulary.tags.filter((tag) => !have.has(tag)).map((tag) => valueOption(tag, "tag"));
      return options.length ? { from: pos - typed.length, to: pos, options, validFor: /^[\p{L}\p{N}_/-]*$/u } : null;
    }

    // A value after `key: `.
    const keyed = KEY_LINE.exec(before);
    if (keyed) {
      const key = keyed[1];
      const typed = before.slice(keyed[0].length);
      // Like an empty tag item, an empty value waits unless the menu was asked for.
      if (!typed && !context.explicit) return null;
      const values = vocabulary.values[key] ?? [];
      if (!values.length || !/^[\p{L}\p{N}_-]*$/u.test(typed)) return null;
      return { from: pos - typed.length, options: values.map((value) => valueOption(value, "value")), validFor: /^[\p{L}\p{N}_-]*$/u };
    }

    // A key at the start of a line, with nothing after the caret.
    if (line.text.slice(pos - line.from).trim() !== "") return null;
    const typedKey = /^[A-Za-z_][\w-]*$/.exec(before)?.[0] ?? (context.explicit && before === "" ? "" : null);
    if (typedKey === null) return null;
    const present = presentKeys(state, line.number);
    const options = vocabulary.keys.filter((key) => !present.has(key)).map((key) => keyOption(key, vocabulary.values[key] ?? []));
    return options.length ? { from: line.from, options, validFor: /^[\w-]*$/ } : null;
  };
}
