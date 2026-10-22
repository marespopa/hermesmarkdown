import type { EditorView } from "@codemirror/view";

export interface ScrollBox {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}

function ratioOf(box: ScrollBox): number {
  const max = box.scrollHeight - box.clientHeight;
  if (max <= 0) return 0;
  return Math.min(1, Math.max(0, box.scrollTop / max));
}

// The scrollTop that puts `dst` at the same fraction of its scroll range as
// `src`. A box that can't scroll counts as ratio 0.
export function ratioScrollTop(src: ScrollBox, dst: ScrollBox): number {
  const max = dst.scrollHeight - dst.clientHeight;
  if (max <= 0) return 0;
  return ratioOf(src) * max;
}

// For the same note on both sides: the document line (and fraction into it)
// at the top of `src` is aligned to the top of `dst`. `srcTop`/`dstTop` are
// viewport y of the line each side aligns at (scroller top + top room).
export function anchorScrollTop(args: {
  srcView: Pick<EditorView, "lineBlockAtHeight" | "documentTop">;
  srcTop: number;
  dstView: Pick<EditorView, "lineBlockAt" | "documentTop">;
  dstTop: number;
  dstScrollTop: number;
}): number {
  const { srcView, srcTop, dstView, dstTop, dstScrollTop } = args;
  const block = srcView.lineBlockAtHeight(srcTop - srcView.documentTop);
  const frac = block.height > 0 ? (srcTop - srcView.documentTop - block.top) / block.height : 0;
  const target = dstView.lineBlockAt(block.from);
  const y = target.top + Math.min(1, Math.max(0, frac)) * target.height;
  return dstScrollTop + (dstView.documentTop + y) - dstTop;
}
