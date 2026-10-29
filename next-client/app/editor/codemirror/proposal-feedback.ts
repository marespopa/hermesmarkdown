import { RangeSetBuilder } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, WidgetType } from "@codemirror/view";

export type ProposalDecision = "accepted" | "rejected";
export interface ProposalRange { from: number; to: number; insert?: string; active?: boolean; onDecide?: (decision: ProposalDecision) => void; }

// Accept / Reject for the active hunk, right where it is. Buttons keep the
// editor's focus (mousedown is cancelled) and are labelled for screen readers;
// the keyboard route is Mod-Alt-A / Mod-Alt-R (ProposalReview).
class HunkControlsWidget extends WidgetType {
  constructor(readonly onDecide: (decision: ProposalDecision) => void) { super(); }
  eq() { return true; }
  toDOM() {
    const el = document.createElement("span");
    el.className = "cm-ai-controls";
    el.setAttribute("role", "group");
    el.setAttribute("aria-label", "Proposed change");
    for (const [decision, label, keys] of [["accepted", "Accept", "Mod-Alt-A"], ["rejected", "Reject", "Mod-Alt-R"]] as const) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.setAttribute("aria-label", `${label} this change (${keys})`);
      button.addEventListener("mousedown", (event) => event.preventDefault());
      button.addEventListener("click", () => this.onDecide(decision));
      el.append(button);
    }
    return el;
  }
  ignoreEvent() { return false; }
}

// The proposed replacement text, shown as faint inline "ghost" text after the
// source it would replace. It is display-only: it is never part of the document.
class GhostInsertWidget extends WidgetType {
  constructor(readonly text: string, readonly active: boolean) { super(); }
  eq(other: GhostInsertWidget) { return other.text === this.text && other.active === this.active; }
  toDOM() {
    const el = document.createElement("span");
    el.className = this.active ? "cm-ai-ghost cm-ai-ghost-active" : "cm-ai-ghost";
    el.textContent = this.text.replace(/\n$/, "");
    el.setAttribute("aria-label", `Proposed text: ${el.textContent}`);
    return el;
  }
}

// A deliberately quiet marker for source text covered by a pending AI hunk.
// Insert-only hunks mark the character at their insertion point instead.
export function proposalFeedback(ranges: ProposalRange[], docLength = Number.MAX_SAFE_INTEGER): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  if (!ranges.length) return builder.finish();
  for (const range of [...ranges].sort((a, b) => a.from - b.from)) {
    const from = Math.min(range.from, docLength);
    const end = Math.min(range.to, docLength);
    const to = Math.min(range.to === range.from ? range.from + 1 : range.to, docLength);
    const deleting = end > from;
    if (from < to) builder.add(from, to, Decoration.mark({ class: `${range.active ? "cm-ai-proposal-active" : "cm-ai-proposal"}${deleting ? " cm-ai-proposal-delete" : ""}` }));
    const at = Math.max(end, to);
    if (range.insert?.trim()) builder.add(at, at, Decoration.widget({ widget: new GhostInsertWidget(range.insert, !!range.active), side: 1 }));
    if (range.active && range.onDecide) builder.add(at, at, Decoration.widget({ widget: new HunkControlsWidget(range.onDecide), side: 2 }));
  }
  return builder.finish();
}

export const proposalFeedbackTheme = EditorView.baseTheme({
  ".cm-ai-proposal": { backgroundColor: "color-mix(in srgb, var(--sage-light) 55%, transparent)", borderBottom: "1px dashed var(--sage)" },
  ".cm-ai-proposal-delete": { textDecoration: "line-through" },
  ".cm-ai-ghost": { color: "var(--sage)", backgroundColor: "color-mix(in srgb, var(--sage-light) 40%, transparent)", whiteSpace: "pre-wrap", pointerEvents: "none" },
  ".cm-ai-controls": { marginLeft: "0.5em", display: "inline-flex", gap: "0.25em", verticalAlign: "baseline", fontSize: "0.8em" },
  ".cm-ai-controls button": { cursor: "pointer", color: "var(--fg)", backgroundColor: "var(--surface)", border: "1px solid var(--sage)", borderRadius: "6px", padding: "0 0.5em" },
  ".cm-ai-ghost-active": { backgroundColor: "color-mix(in srgb, var(--sage-light) 80%, transparent)" },
  ".cm-ai-proposal-active": { backgroundColor: "color-mix(in srgb, var(--sage-light) 85%, transparent)", outline: "1px solid var(--sage)", outlineOffset: "-1px" },
});
