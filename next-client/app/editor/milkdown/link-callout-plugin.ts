import type { Ctx } from "@milkdown/kit/ctx";
import type { EditorView } from "@milkdown/kit/prose/view";
import type { Node as ProseNode, Mark, MarkType } from "@milkdown/kit/prose/model";
import { Plugin } from "@milkdown/kit/prose/state";
import { $ctx, $prose } from "@milkdown/kit/utils";
import { linkSchema } from "@milkdown/kit/preset/commonmark";

export interface MilkdownLinkInfo {
  href: string;
  label: string;
  start: number;
  end: number;
  // Viewport-relative coordinates (from view.coordsAtPos) — same split as
  // table-callout-plugin.ts's MilkdownTableInfo, left to the caller
  // (use-milkdown-link.ts) to translate into container-relative
  // positioning for the floating LinkPill.
  caretTop: number;
  caretLeft: number;
}

type LinkCalloutUpdateHandler = (info: MilkdownLinkInfo | null, view: EditorView) => void;

export const onLinkCalloutUpdateCtx = $ctx<LinkCalloutUpdateHandler | undefined, "onLinkCalloutUpdate">(
  undefined,
  "onLinkCalloutUpdate",
);

export function configureLinkCalloutUpdate(ctx: Ctx, onUpdate?: LinkCalloutUpdateHandler) {
  ctx.set(onLinkCalloutUpdateCtx.key, onUpdate);
}

function hasMarkAt(doc: ProseNode, pos: number, markType: MarkType): boolean {
  const node = doc.resolve(pos).nodeAfter;
  return !!node && !!markType.isInSet(node.marks);
}

function computeLinkInfo(ctx: Ctx, view: EditorView): MilkdownLinkInfo | null {
  const { state } = view;
  if (!state.selection.empty) return null;

  const $from = state.selection.$from;
  const linkType = linkSchema.type(ctx);
  const beforeNode = $from.nodeBefore;
  const afterNode = $from.nodeAfter;
  const mark: Mark | null =
    (beforeNode && linkType.isInSet(beforeNode.marks)) ||
    (afterNode && linkType.isInSet(afterNode.marks)) ||
    null;
  if (!mark) return null;

  // Marks don't know their own range, so walk outward from the cursor one
  // character at a time while the same mark is still present — matches
  // preset-commonmark's own updateLinkCommand, which finds a link's extent
  // the same way.
  const parentStart = $from.start();
  const parentEnd = $from.end();
  let start = $from.pos;
  let end = $from.pos;
  while (start > parentStart && hasMarkAt(state.doc, start - 1, linkType)) start -= 1;
  while (end < parentEnd && hasMarkAt(state.doc, end, linkType)) end += 1;
  if (start >= end) return null;

  const label = state.doc.textBetween(start, end, "\n");
  const caretCoords = view.coordsAtPos($from.pos);

  return {
    href: (mark.attrs.href as string) || "",
    label,
    start,
    end,
    caretTop: caretCoords.top,
    caretLeft: caretCoords.left,
  };
}

// Rendered-mode counterpart to use-codemirror-features.ts's findLinkAtPos:
// tracks whether the cursor sits inside a real link mark so a floating
// LinkPill can follow it, the same way tableCalloutPlugin tracks tables.
// Implemented as a $prose plugin's `view()` lifecycle (not read in React)
// because it needs `view.coordsAtPos`, which only exists on the live
// EditorView.
export const linkCalloutPlugin = $prose((ctx) => {
  return new Plugin({
    view: (view: EditorView) => {
      const notify = () => ctx.get(onLinkCalloutUpdateCtx.key)?.(computeLinkInfo(ctx, view), view);
      notify();
      return { update: notify };
    },
  });
});
