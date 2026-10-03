"use client";

import { useCallback, useEffect, useState } from "react";
import type { EditorView } from "@codemirror/view";
import {
  findFrontmatterFoldRange,
  isFrontmatterFolded,
  toggleFrontmatterFold,
} from "../codemirror/frontmatter-fold";

interface FrontmatterChevron {
  blockId: string;
  top: number;
  collapsed: boolean;
  range: ReturnType<typeof findFrontmatterFoldRange>;
}

export function useCodeMirrorFrontmatterFold({
  viewRef,
  containerRef,
  collapseByDefault,
}: {
  viewRef: React.RefObject<EditorView | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  collapseByDefault: boolean;
}) {
  const [chevrons, setChevrons] = useState<FrontmatterChevron[]>([]);
  // `null` when the file has no frontmatter. Independent of the chevron,
  // which needs on-screen coordinates.
  const [collapsed, setCollapsed] = useState<boolean | null>(null);

  const recompute = useCallback((view: EditorView) => {
    const range = findFrontmatterFoldRange(view.state.doc.toString());
    setCollapsed(range ? isFrontmatterFolded(view.state) : null);
    // coordsAtPos first: it can flush a pending CodeMirror measure — e.g. the
    // scrollIntoView of an Edit/Preview switch — which scrolls the canvas. A
    // wrapper rect read before that is stale and put the chevron above the sheet.
    const coords = range ? view.coordsAtPos(range.titleOffset) : null;
    const wrapperRect = containerRef.current?.getBoundingClientRect();
    if (!range || !coords || !wrapperRect) {
      setChevrons([]);
      return;
    }

    setChevrons([{
      blockId: "frontmatter",
      top: coords.top - wrapperRect.top,
      collapsed: isFrontmatterFolded(view.state),
      range,
    }]);
  }, [containerRef]);

  const onViewCreated = useCallback((view: EditorView) => {
    const range = findFrontmatterFoldRange(view.state.doc.toString());
    if (collapseByDefault && range) {
      toggleFrontmatterFold(view, range, true);
    }
    recompute(view);
  }, [collapseByDefault, recompute]);

  // The preference is app-wide and live: flipping it (Settings, the palette's
  // "… properties in every note") collapses or expands every open editor, and
  // files opened later follow it via onViewCreated. The summary row and the
  // chevron only change the one note.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const range = findFrontmatterFoldRange(view.state.doc.toString());
    if (range && isFrontmatterFolded(view.state) !== collapseByDefault) {
      toggleFrontmatterFold(view, range, collapseByDefault);
    }
    recompute(view);
  }, [collapseByDefault, recompute, viewRef]);

  const toggle = useCallback((view: EditorView) => {
    const chevron = chevrons[0];
    if (!chevron?.range) return;
    toggleFrontmatterFold(view, chevron.range, !chevron.collapsed);
    recompute(view);
  }, [chevrons, recompute]);

  return { chevrons, collapsed, toggle, onCursorActivity: recompute, onViewCreated };
}
