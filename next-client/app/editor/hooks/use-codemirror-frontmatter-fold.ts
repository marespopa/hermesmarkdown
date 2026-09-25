"use client";

import { useCallback, useState } from "react";
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
  containerRef,
  collapseByDefault,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  collapseByDefault: boolean;
}) {
  const [chevrons, setChevrons] = useState<FrontmatterChevron[]>([]);

  const recompute = useCallback((view: EditorView) => {
    const range = findFrontmatterFoldRange(view.state.doc.toString());
    const wrapperRect = containerRef.current?.getBoundingClientRect();
    if (!range || !wrapperRect) {
      setChevrons([]);
      return;
    }

    const coords = view.coordsAtPos(range.titleOffset);
    if (!coords) {
      setChevrons([]);
      return;
    }

    setChevrons([{
      blockId: "frontmatter",
      top: coords.top - wrapperRect.top,
      collapsed: isFrontmatterFolded(view.state, range),
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

  const toggle = useCallback((view: EditorView) => {
    const chevron = chevrons[0];
    if (!chevron?.range) return;
    toggleFrontmatterFold(view, chevron.range, !chevron.collapsed);
    recompute(view);
  }, [chevrons, recompute]);

  return { chevrons, toggle, onCursorActivity: recompute, onViewCreated };
}
