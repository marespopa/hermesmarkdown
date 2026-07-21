"use client";

import { useCallback, useRef, useState } from "react";
import type { EditorView } from "@milkdown/kit/prose/view";
import { TextSelection } from "@milkdown/kit/prose/state";
import type { MilkdownLinkInfo } from "../milkdown/link-callout-plugin";

interface Pos {
  top: number;
  left: number;
}

interface UseMilkdownLinkOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

const PILL_WIDTH = 70;

// Rendered-mode counterpart to use-codemirror-features.ts's link pill
// state, wired to the same LinkPill component. link-callout-plugin.ts does
// the ProseMirror-side cursor tracking (it needs the live EditorView for
// coordsAtPos); this hook just turns that into React state, floating pill
// positioning, and a save/dismiss handler that replaces the link mark's
// text+attrs directly, mirroring updateLinkCommand.
export function useMilkdownLink({ containerRef }: UseMilkdownLinkOptions) {
  const [linkInfo, setLinkInfo] = useState<MilkdownLinkInfo | null>(null);
  const [pillPos, setPillPos] = useState<Pos>({ top: 0, left: 0 });
  const viewRef = useRef<EditorView | null>(null);

  const handleLinkUpdate = useCallback((info: MilkdownLinkInfo | null, view: EditorView) => {
    viewRef.current = view;
    setLinkInfo(info);
    if (!info) return;

    const wrapperRect = containerRef.current?.getBoundingClientRect();
    if (!wrapperRect) return;
    const scrollTop = containerRef.current?.scrollTop ?? 0;
    // See use-milkdown-table.ts's identical comment: this pill is `position:
    // absolute` inside the scrollable container, so its `top` is measured
    // against the scrollable content box, not the currently visible viewport
    // slice — scrollTop has to be added back in or the pill drifts away from
    // the actual cursor as soon as the pane is scrolled.
    const caretTop = info.caretTop - wrapperRect.top + scrollTop;
    const caretLeft = info.caretLeft - wrapperRect.left;
    setPillPos({
      top: caretTop - 14 - 2,
      left: Math.min(caretLeft + 8, (containerRef.current?.clientWidth ?? 500) - PILL_WIDTH),
    });
  }, [containerRef]);

  const handleOpenLink = useCallback(() => {
    if (!linkInfo?.href) return;
    window.open(linkInfo.href, "_blank", "noopener,noreferrer");
  }, [linkInfo]);

  const handleSaveLink = useCallback((newLabel: string, newUrl: string) => {
    const view = viewRef.current;
    if (!view || !linkInfo) return;
    const { state } = view;
    const mark = state.schema.marks.link.create({ href: newUrl });
    const text = state.schema.text(newLabel || newUrl, [mark]);
    const tr = state.tr.replaceWith(linkInfo.start, linkInfo.end, text);
    tr.setSelection(TextSelection.near(tr.doc.resolve(linkInfo.start + text.nodeSize)));
    view.dispatch(tr);
    view.focus();
    setLinkInfo(null);
  }, [linkInfo]);

  const handleDismissLink = useCallback(() => setLinkInfo(null), []);

  return {
    linkInfo,
    pillPos,
    onLinkCalloutUpdate: handleLinkUpdate,
    handleOpenLink,
    handleSaveLink,
    handleDismissLink,
  };
}
