"use client";

import { useCallback, useState } from "react";
import type { EditorView } from "@codemirror/view";
import { findCalloutFoldRanges, toggleCalloutFold, isRangeFolded, setCalloutFoldSign } from "../codemirror/callout-fold";
import { detailsFoldRanges, setDetailsOpen } from "../codemirror/details-fold";

interface Chevron {
  blockId: string;
  kind: "callout" | "details";
  top: number;
  collapsed: boolean;
  bodyFrom: number;
  bodyTo: number;
  /** Offset of the `<details` tag (details only). */
  openFrom?: number;
}

interface UseCodeMirrorCalloutFoldOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

// Step 8: Obsidian callout collapse/expand, rewritten (not ported) onto
// CM6's native fold service — see codemirror/callout-fold.ts for why this
// is simpler than the old text-mutation approach. Raw HTML `<details>`
// sections (codemirror/details-fold.ts) fold the same way, so this hook
// covers both. It only tracks what the chevron buttons need to render
// (header-line position + collapse state); CM6 itself owns hiding/showing
// the folded text.
function sameChevrons(a: Chevron[], b: Chevron[]): boolean {
  return a.length === b.length && a.every((c, i) =>
    c.blockId === b[i].blockId && c.kind === b[i].kind && c.top === b[i].top && c.collapsed === b[i].collapsed
      && c.bodyFrom === b[i].bodyFrom && c.bodyTo === b[i].bodyTo && c.openFrom === b[i].openFrom);
}

export function useCodeMirrorCalloutFold({ containerRef }: UseCodeMirrorCalloutFoldOptions) {
  const [chevrons, setChevrons] = useState<Chevron[]>([]);

  const recompute = useCallback((view: EditorView) => {
    const ranges = [
      ...findCalloutFoldRanges(view.state.doc.toString()).map((r) => ({ ...r, kind: "callout" as const, openFrom: undefined })),
      ...detailsFoldRanges(view.state.doc).map((r) => ({ ...r, kind: "details" as const })),
    ];
    // Coordinates before the wrapper rect: coordsAtPos can flush a pending
    // CodeMirror measure (e.g. a pending scrollIntoView) that
    // scrolls the canvas, which would leave an earlier wrapper rect stale.
    const positioned = ranges.map((r) => ({ r, coords: view.coordsAtPos(r.titleOffset) }));
    const wrapperRect = containerRef.current?.getBoundingClientRect();
    if (!wrapperRect) return;

    // Folds outside CodeMirror's rendered viewport have no coordinates
    // yet; they get a chevron once scrolled near (see onViewportChange).
    // Placing them at top 0 instead stacked them all on the note's first line.
    const next: Chevron[] = positioned.flatMap(({ r, coords }) => {
      if (!coords) return [];
      return [{
        blockId: r.blockId,
        kind: r.kind,
        top: coords.top - wrapperRect.top,
        collapsed: isRangeFolded(view.state, r.bodyFrom, r.bodyTo),
        bodyFrom: r.bodyFrom,
        bodyTo: r.bodyTo,
        openFrom: r.openFrom,
      }];
    });
    // This runs on every caret move; keeping the same list when nothing
    // moved spares the editor a React render per keystroke (most notes have
    // no callouts at all).
    setChevrons((current) => (sameChevrons(current, next) ? current : next));
  }, [containerRef]);

  // Seeds initial fold state (callouts marked `> [!type]-` start collapsed,
  // matching Obsidian; `<details>` without `open` start collapsed, as in
  // HTML) once the view is created, then computes the chevron list for the
  // first render.
  const onViewCreated = useCallback((view: EditorView) => {
    const ranges = [...findCalloutFoldRanges(view.state.doc.toString()), ...detailsFoldRanges(view.state.doc)];
    for (const r of ranges) {
      if (r.initiallyCollapsed) toggleCalloutFold(view, r.bodyFrom, r.bodyTo, true);
    }
    recompute(view);
  }, [recompute]);

  // Folding also writes the callout's `-`/`+` sign (or the section's `open`
  // attribute), so the note reopens the same way (here and elsewhere). The
  // edit shifts the body range, so it is looked up again afterwards.
  const toggle = useCallback((view: EditorView, blockId: string) => {
    const chevron = chevrons.find((c) => c.blockId === blockId);
    if (!chevron) return;
    const collapse = !chevron.collapsed;
    if (chevron.kind === "details" && chevron.openFrom !== undefined) {
      setDetailsOpen(view, chevron.openFrom, !collapse);
      const range = detailsFoldRanges(view.state.doc).find((r) => r.blockId === blockId);
      if (range) toggleCalloutFold(view, range.bodyFrom, range.bodyTo, collapse);
      recompute(view);
      return;
    }
    const titleOffset = view.state.doc.lineAt(chevron.bodyFrom).from;
    setCalloutFoldSign(view, titleOffset, collapse);
    const range = findCalloutFoldRanges(view.state.doc.toString()).find((r) => r.titleOffset === titleOffset);
    if (range) toggleCalloutFold(view, range.bodyFrom, range.bodyTo, collapse);
    recompute(view);
  }, [chevrons, recompute]);

  return {
    chevrons,
    toggle,
    onCursorActivity: recompute,
    onViewCreated,
  };
}
