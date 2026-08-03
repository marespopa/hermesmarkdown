"use client";

import { useCallback, useRef, useState } from "react";
import type { Ctx } from "@milkdown/kit/ctx";
import type { EditorView } from "@milkdown/kit/prose/view";
import { TODO_TAGS } from "../components/constants";
import type { MilkdownTagInfo } from "../milkdown/lifecycle-tag-callout-plugin";
import { onUserInputCtx } from "../milkdown/user-input-tracker";

interface Pos {
  top: number;
  left: number;
}

interface UseMilkdownTagCalloutOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

const CALLOUT_MIN_WIDTH = 160;

// Rendered-mode counterpart to use-codemirror-features.ts's
// workflowMatch/todoMatch state, wired to the segmented-picker
// TagStatusCallout instead of Source mode's prev/next WorkflowPill.
// lifecycle-tag-callout-plugin.ts does the ProseMirror-side cursor
// tracking; this hook turns that into React state, floating callout
// positioning (clamped to stay on-screen on narrow/mobile viewports), and
// a "jump straight to this state" handler.
export function useMilkdownTagCallout({ containerRef }: UseMilkdownTagCalloutOptions) {
  const [tagInfo, setTagInfo] = useState<MilkdownTagInfo | null>(null);
  const [calloutPos, setCalloutPos] = useState<Pos>({ top: 0, left: 0 });
  const viewRef = useRef<EditorView | null>(null);
  const ctxRef = useRef<Ctx | null>(null);

  const handleTagUpdate = useCallback((info: MilkdownTagInfo | null, view: EditorView, ctx: Ctx) => {
    viewRef.current = view;
    ctxRef.current = ctx;
    setTagInfo(info);
    if (!info) return;

    const wrapperRect = containerRef.current?.getBoundingClientRect();
    if (!wrapperRect) return;
    const scrollTop = containerRef.current?.scrollTop ?? 0;
    // Same `position: absolute` inside a scrolling container caveat as
    // use-milkdown-table.ts/use-milkdown-link.ts: top is measured against
    // the scrollable content box, so scrollTop has to be added back in.
    const caretTop = info.caretTop - wrapperRect.top + scrollTop;
    const caretLeft = info.caretLeft - wrapperRect.left;
    const containerWidth = containerRef.current?.clientWidth ?? 500;
    setCalloutPos({
      // Clamped so the callout never renders above the scrolled-to-top
      // edge of the content box (a real risk on short mobile viewports,
      // where the caret can sit close to the top of the visible pane).
      top: Math.max(caretTop - 40, scrollTop + 4),
      left: Math.max(4, Math.min(caretLeft, containerWidth - CALLOUT_MIN_WIDTH - 4)),
    });
  }, [containerRef]);

  const handleSelectState = useCallback((newTag: string) => {
    const view = viewRef.current;
    if (!view || !tagInfo) return;
    const { state } = view;
    let tr = state.tr.insertText(`#${newTag}`, tagInfo.start, tagInfo.end);

    // #todo/#prog/#done tags mirror the checkbox on their own line in
    // Source mode too — but here the checkbox is a real list_item
    // `checked` attr, not raw "[ ]"/"[x]" text, so sync that instead of
    // splicing a character.
    if (!tagInfo.isWorkflow && TODO_TAGS.includes(tagInfo.tag)) {
      const $pos = state.doc.resolve(tagInfo.start);
      for (let d = $pos.depth; d >= 0; d--) {
        const node = $pos.node(d);
        if (node.type.name !== "list_item" || node.attrs.checked == null) continue;
        const itemPos = $pos.before(d);
        tr = tr.setNodeMarkup(itemPos, undefined, { ...node.attrs, checked: newTag === "done" });
        break;
      }
    }

    // Clicking a pill in the floating TagStatusCallout never fires
    // beforeinput/paste/cut/drop on the contentEditable (it's a React
    // button living outside the ProseMirror DOM, and its mousedown is
    // preventDefault()-ed), so userInputTrackerPlugin never sees this
    // interaction. Without notifying here, EditorHost's
    // hasUserInteractedRef stays false and markdownUpdated's write-back
    // silently drops this change — same failure mode fixed for the
    // checkbox click in plugins.ts's handleCheckboxChange.
    ctxRef.current?.get(onUserInputCtx.key)?.();
    view.dispatch(tr);
    setTagInfo(null);
  }, [tagInfo]);

  const handleDismissTag = useCallback(() => setTagInfo(null), []);

  return {
    tagInfo,
    calloutPos,
    onTagCalloutUpdate: handleTagUpdate,
    handleSelectState,
    handleDismissTag,
  };
}
