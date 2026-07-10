"use client";

import { useCallback, useState } from "react";
import { EditorView } from "@codemirror/view";
import { findCalloutFoldRanges, toggleCalloutFold, isRangeFolded } from "../codemirror/callout-fold";

interface Chevron {
  blockId: string;
  top: number;
  collapsed: boolean;
  bodyFrom: number;
  bodyTo: number;
}

interface UseCodeMirrorCalloutFoldOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

// Step 8: Obsidian callout collapse/expand, rewritten (not ported) onto
// CM6's native fold service — see codemirror/callout-fold.ts for why this
// is simpler than the old text-mutation approach. This hook only tracks
// what the chevron buttons need to render (title-line position + collapse
// state); CM6 itself owns hiding/showing the folded text.
export function useCodeMirrorCalloutFold({ containerRef }: UseCodeMirrorCalloutFoldOptions) {
  const [chevrons, setChevrons] = useState<Chevron[]>([]);

  const recompute = useCallback((view: EditorView) => {
    const ranges = findCalloutFoldRanges(view.state.doc.toString());
    const wrapperRect = containerRef.current?.getBoundingClientRect();
    if (!wrapperRect) return;

    setChevrons(ranges.map((r) => {
      const coords = view.coordsAtPos(r.titleOffset);
      return {
        blockId: r.blockId,
        top: coords ? coords.top - wrapperRect.top : 0,
        collapsed: isRangeFolded(view.state, r.bodyFrom, r.bodyTo),
        bodyFrom: r.bodyFrom,
        bodyTo: r.bodyTo,
      };
    }));
  }, [containerRef]);

  // Seeds initial fold state (callouts marked `> [!type]-` start collapsed,
  // matching Obsidian) once the view is created, then computes the chevron
  // list for the first render.
  const onViewCreated = useCallback((view: EditorView) => {
    const ranges = findCalloutFoldRanges(view.state.doc.toString());
    for (const r of ranges) {
      if (r.initiallyCollapsed) toggleCalloutFold(view, r.bodyFrom, r.bodyTo, true);
    }
    recompute(view);
  }, [recompute]);

  const toggle = useCallback((view: EditorView, blockId: string) => {
    const chevron = chevrons.find((c) => c.blockId === blockId);
    if (!chevron) return;
    toggleCalloutFold(view, chevron.bodyFrom, chevron.bodyTo, !chevron.collapsed);
    recompute(view);
  }, [chevrons, recompute]);

  return {
    chevrons,
    toggle,
    onCursorActivity: recompute,
    onViewCreated,
  };
}
