import type { Ctx } from "@milkdown/kit/ctx";
import type { EditorView } from "@milkdown/kit/prose/view";
import { Plugin } from "@milkdown/kit/prose/state";
import { $ctx, $prose } from "@milkdown/kit/utils";
import { WORKFLOW_TAGS, TODO_TAGS } from "../components/constants";
import { matchesFor } from "./lifecycle-tags";

export interface MilkdownTagInfo {
  tag: string;
  isWorkflow: boolean;
  start: number;
  end: number;
  // Viewport-relative coordinates (from view.coordsAtPos) — same split as
  // link-callout-plugin.ts's MilkdownLinkInfo, left to the caller
  // (use-milkdown-tag-callout.ts) to translate into container-relative
  // positioning for the floating TagStatusCallout.
  caretTop: number;
  caretLeft: number;
}

type TagCalloutUpdateHandler = (info: MilkdownTagInfo | null, view: EditorView) => void;

export const onTagCalloutUpdateCtx = $ctx<TagCalloutUpdateHandler | undefined, "onTagCalloutUpdate">(
  undefined,
  "onTagCalloutUpdate",
);

export function configureTagCalloutUpdate(ctx: Ctx, onUpdate?: TagCalloutUpdateHandler) {
  ctx.set(onTagCalloutUpdateCtx.key, onUpdate);
}

export function tagStates(isWorkflow: boolean): string[] {
  return isWorkflow ? WORKFLOW_TAGS : TODO_TAGS;
}

function computeTagInfo(view: EditorView): MilkdownTagInfo | null {
  const { state } = view;
  if (!state.selection.empty) return null;

  const $pos = state.selection.$from;
  const text = $pos.parent.textContent;
  const offset = $pos.parentOffset;
  // Inclusive at both ends, matching use-codemirror-features.ts's Source
  // mode detection — the cursor sitting right at either edge of the tag
  // still counts as "on" it, but a click that lands on the surrounding
  // text (to edit before/after the tag) resolves outside this range and
  // leaves the selection alone instead of popping a callout.
  const match = matchesFor(text).find((m) => offset >= m.start && offset <= m.end);
  if (!match) return null;

  const parentStart = $pos.start();
  const start = parentStart + match.start;
  const end = parentStart + match.end;
  const caretCoords = view.coordsAtPos(start);

  return {
    tag: match.tag,
    isWorkflow: match.isWorkflow,
    start,
    end,
    caretTop: caretCoords.top,
    caretLeft: caretCoords.left,
  };
}

// Rendered-mode counterpart to use-codemirror-features.ts's workflow/todo
// tag detection: tracks whether the cursor sits inside a #draft-style or
// #todo-style tag so a floating TagStatusCallout (segmented state picker)
// can follow it, the same way link-callout-plugin.ts tracks link marks.
// Clicking a tag simply places the cursor inside it (default ProseMirror
// behavior) — no handleClick needed — which is what drives this via the
// view's `update` lifecycle.
export const lifecycleTagCalloutPlugin = $prose((ctx) => {
  return new Plugin({
    view: (view: EditorView) => {
      const notify = () => ctx.get(onTagCalloutUpdateCtx.key)?.(computeTagInfo(view), view);
      notify();
      return { update: notify };
    },
  });
});
