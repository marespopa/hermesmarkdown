"use client";

import { useCallback, useState } from "react";
import type { EditorView } from "@codemirror/view";
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
    // Coordinates before the wrapper rect: coordsAtPos can flush a pending
    // CodeMirror measure (e.g. a pending scrollIntoView) that
    // scrolls the canvas, which would leave an earlier wrapper rect stale.
    const positioned = ranges.map((r) => ({ r, coords: view.coordsAtPos(r.titleOffset) }));
    const wrapperRect = containerRef.current?.getBoundingClientRect();
    if (!wrapperRect) return;

    // Callouts outside CodeMirror's rendered viewport have no coordinates
    // yet; they get a chevron once scrolled near (see onViewportChange).
    // Placing them at top 0 instead stacked them all on the note's first line.
    setChevrons(positioned.flatMap(({ r, coords }) => {
      if (!coords) return [];
      return [{
        blockId: r.blockId,
        top: coords.top - wrapperRect.top,
        collapsed: isRangeFolded(view.state, r.bodyFrom, r.bodyTo),
        bodyFrom: r.bodyFrom,
        bodyTo: r.bodyTo,
      }];
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
