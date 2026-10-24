import { Facet, type EditorState } from "@codemirror/state";
import type { EditorView, KeyBinding } from "@codemirror/view";
import toast from "react-hot-toast";
import { syntaxTree } from "@codemirror/language";
import type { SyntaxNode } from "@lezer/common";
import { canFormat, formatCode, formatLanguageOf } from "@/app/utils/format-code";
import { changedRange } from "@/app/utils/text-diff";
import { resolvePrettierConfig, type PrettierConfigResult } from "@/app/utils/prettier-config";
import { contentStore } from "@/app/atoms/atoms";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";

// Format Code (Shift+Alt+F, or the palette): in a code file, the whole file;
// in a note, the fenced code block under the caret, by its language. Only
// when asked, never on save. The result goes in as one edit covering just
// the changed span, so it's one undo step and the caret stays put; if the
// text changed while Prettier ran, nothing is applied. The project's
// Prettier config (prettier-config.ts) is read each time, so edits to it
// apply at once.

// The open file's vault path: a code file's language, and where to look
// for the project's Prettier config.
export const editorFilePath = Facet.define<string, string>({ combine: (values) => values[0] ?? "" });

export type FormatResult =
  | { status: "formatted"; note?: string }
  | { status: "unchanged"; note?: string }
  | { status: "unsupported"; reason: string }
  | { status: "failed"; reason: string };

interface Target {
  from: number;
  to: number;
  language: string;
  // A fence's line prefix (list indent, `> `), taken off and put back.
  prefix: string;
  isFence: boolean;
}

function fenceAt(state: EditorState, pos: number): SyntaxNode | null {
  for (const side of [-1, 1] as const) {
    for (let node: SyntaxNode | null = syntaxTree(state).resolve(pos, side); node; node = node.parent) {
      if (node.name === "FencedCode") return node;
    }
  }
  return null;
}

function targetFor(state: EditorState, isNote: boolean): Target | { reason: string } {
  if (!isNote) {
    const language = formatLanguageOf(state.facet(editorFilePath), true);
    return { from: 0, to: state.doc.length, language, prefix: "", isFence: false };
  }
  const fence = fenceAt(state, state.selection.main.head);
  if (!fence) return { reason: "Put the caret in a code block to format it" };
  const info = fence.getChild("CodeInfo");
  const text = fence.getChild("CodeText");
  if (!text) return { reason: "The code block is empty" };
  const language = info ? formatLanguageOf(state.sliceDoc(info.from, info.to), false) : "";
  const fenceLine = state.doc.lineAt(fence.from);
  const prefix = /^[\s>]*/.exec(fenceLine.text)![0];
  return {
    from: state.doc.lineAt(text.from).from,
    to: state.doc.lineAt(text.to).to,
    language,
    prefix,
    isFence: true,
  };
}

const stripPrefix = (code: string, prefix: string) =>
  prefix ? code.split("\n").map((line) => line.startsWith(prefix) ? line.slice(prefix.length) : line.trimStart()).join("\n") : code;

const addPrefix = (code: string, prefix: string) =>
  prefix ? code.split("\n").map((line) => line ? prefix + line : prefix.trimEnd()).join("\n") : code;

type OptionsLoader = (filePath: string) => Promise<PrettierConfigResult>;

const projectOptions: OptionsLoader = (filePath) =>
  resolvePrettierConfig(contentStore.get(atom_vaultHandle), filePath);

export async function formatCodeInEditor(view: EditorView, isNote: boolean, loadOptions: OptionsLoader = projectOptions): Promise<FormatResult> {
  const state = view.state;
  const target = targetFor(state, isNote);
  if ("reason" in target) return { status: "unsupported", reason: target.reason };
  if (!canFormat(target.language)) {
    return { status: "unsupported", reason: target.language ? `No formatter for ${target.language}` : "This code has no language to format by" };
  }
  const original = state.sliceDoc(target.from, target.to);
  let formatted: string | null;
  let note: string | undefined;
  try {
    const config = await loadOptions(state.facet(editorFilePath));
    note = config.note;
    formatted = await formatCode(stripPrefix(original, target.prefix), target.language, config.options);
  } catch (err) {
    const message = err instanceof Error ? err.message.split("\n")[0] : String(err);
    return { status: "failed", reason: message };
  }
  if (formatted === null) return { status: "unsupported", reason: `No formatter for ${target.language}` };
  // Typing went on while Prettier ran: its result is for older text.
  if (view.state.doc !== state.doc) return { status: "unchanged", note };
  const next = addPrefix(target.isFence ? formatted.replace(/\n+$/, "") : formatted, target.prefix);
  const change = changedRange(original, next);
  if (!change) return { status: "unchanged", note };
  view.dispatch({
    changes: { from: target.from + change.from, to: target.from + change.to, insert: change.insert },
    userEvent: "input.format",
  });
  return { status: "formatted", note };
}

// Runs Format Code with feedback: a "Formatting…" toast only when loading
// Prettier makes it slow (the first time), then the outcome.
export async function runFormatCode(view: EditorView, isNote: boolean): Promise<FormatResult> {
  let loadingId: string | undefined;
  const timer = setTimeout(() => { loadingId = toast.loading("Formatting…"); }, 250);
  const result = await formatCodeInEditor(view, isNote);
  clearTimeout(timer);
  if (loadingId) toast.dismiss(loadingId);
  if (result.status === "formatted") toast.success(result.note ? `Formatted. ${result.note}` : "Formatted", { duration: result.note ? 4000 : 1500 });
  else if (result.status === "unchanged") toast(result.note ? `Already formatted. ${result.note}` : "Already formatted", { duration: result.note ? 4000 : 1500 });
  else toast.error(result.reason);
  return result;
}

export const formatCodeKeymap = (isNote: boolean): KeyBinding[] => [
  { key: "Shift-Alt-f", run: (view) => { void runFormatCode(view, isNote); return true; }, preventDefault: true },
];
