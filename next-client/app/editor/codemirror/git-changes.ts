// Git Changes (Settings → Editor → View): an inline diff against the file at
// HEAD, the way a pull request shows it. Added and changed lines get a green
// tint and a +, and the lines they replaced or that were deleted sit above
// them, read-only, on a red tint with a −. The baseline
// (HEAD's text) arrives through `setGitBaseline` from use-git-baseline.ts;
// the diff is @codemirror/merge's `unifiedMergeView` without its accept /
// reject controls, gutter or word highlights, updated incrementally as you type.
import { getOriginalDoc, originalDocChangeEffect, unifiedMergeView } from "@codemirror/merge";
import { ChangeSet, Compartment, EditorState, type Extension, StateEffect, StateField, Text } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

/** Over this many lines the file shows no diff. */
export const MAX_GIT_LINES = 20000;

/** HEAD's text, null for "no baseline" (every line added), or "off" (no diff). */
export type GitBaseline = { text: string | null } | "off";

export const setGitBaseline = StateEffect.define<GitBaseline>();

interface GitChangesValue {
  baseline: GitBaseline;
  /** Whether the diff view is installed. */
  active: boolean;
}

const isActive = (baseline: GitBaseline, doc: Text) => baseline !== "off" && doc.lines <= MAX_GIT_LINES;

export const gitChangesField = StateField.define<GitChangesValue>({
  create: () => ({ baseline: "off", active: false }),
  update(value, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(setGitBaseline)) return { baseline: effect.value, active: isActive(effect.value, transaction.newDoc) };
    }
    return value;
  },
});

function originalText(baseline: { text: string | null }): Text {
  return baseline.text === null ? Text.empty : Text.of(baseline.text.split(/\r?\n/));
}

// Whole-line tints with a + / − in the leading margin, as a pull request's
// unified diff shows them. No word highlights: on rewritten lines they mark
// nearly every word.
const SIGN = { position: "absolute", left: "-1.25em", width: "1em", textAlign: "center", fontFamily: "var(--font-code)", fontWeight: "400" };
const gitChangesTheme = EditorView.theme({
  // Selectors one step more specific than the merge view's own base theme.
  "&.cm-merge-b .cm-content .cm-changedLine": { position: "relative", backgroundColor: "color-mix(in srgb, var(--task-done) 22%, transparent)" },
  "&.cm-merge-b .cm-content .cm-changedLine::before": { ...SIGN, content: '"+"', color: "var(--task-done)" },
  "&.cm-merge-b .cm-content .cm-deletedChunk": { backgroundColor: "color-mix(in srgb, var(--danger) 16%, transparent)", userSelect: "none" },
  "&.cm-merge-b .cm-content .cm-deletedChunk .cm-deletedLine": { position: "relative", color: "var(--fg-muted)" },
  "&.cm-merge-b .cm-content .cm-deletedChunk .cm-deletedLine::before": { ...SIGN, content: '"−"', color: "var(--danger)" },
});

function diffView(original: Text): Extension {
  return [unifiedMergeView({ original, mergeControls: false, gutter: false, highlightChanges: false, syntaxHighlightDeletions: false }), gitChangesTheme];
}

const diffCompartment = new Compartment();

// A new baseline installs the diff view, replaces the original it compares
// with (the view keeps its first original when reconfigured), or removes it.
const applyBaseline = EditorState.transactionExtender.of((transaction) => {
  const effect = transaction.effects.find((e) => e.is(setGitBaseline));
  if (!effect) return null;
  const was = transaction.startState.field(gitChangesField).active;
  const baseline: GitBaseline = effect.value;
  if (baseline === "off" || !isActive(baseline, transaction.newDoc)) return was ? { effects: diffCompartment.reconfigure([]) } : null;
  const original = originalText(baseline);
  if (!was) return { effects: diffCompartment.reconfigure(diffView(original)) };
  const old = getOriginalDoc(transaction.startState);
  if (old.eq(original)) return null;
  const changes = ChangeSet.of({ from: 0, to: old.length, insert: original }, old.length);
  return { effects: originalDocChangeEffect(transaction.startState, changes) };
});

export function gitChanges(): Extension {
  return [gitChangesField, applyBaseline, diffCompartment.of([])];
}
