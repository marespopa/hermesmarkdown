"use client";

import { useCallback, useRef } from "react";
import { useAtom } from "jotai";
import type { EditorView } from "@codemirror/view";
import { atom_frontmatterCollapsedByDefault } from "@/app/atoms/atoms";
import {
  FRONTMATTER_TOGGLE_EVENT,
  findFrontmatterFoldRange,
  toggleFrontmatterFold,
} from "../codemirror/frontmatter-fold";

export function useCodeMirrorFrontmatterFold() {
  // A click on the Properties row is remembered: notes opened later start
  // that way. The note already open keeps its own state.
  const [collapseByDefault, setCollapseByDefault] = useAtom(atom_frontmatterCollapsedByDefault);
  const collapseByDefaultRef = useRef(collapseByDefault);
  collapseByDefaultRef.current = collapseByDefault;

  // A note opens as the last Properties row click left one.
  const onViewCreated = useCallback((view: EditorView) => {
    const range = findFrontmatterFoldRange(view.state.doc.toString());
    if (collapseByDefaultRef.current && range) {
      toggleFrontmatterFold(view, range, true, { animate: false });
    }
    // Only the row click counts, not the caret moving in.
    view.dom.addEventListener(FRONTMATTER_TOGGLE_EVENT, (event) => {
      setCollapseByDefault((event as CustomEvent<{ collapsed: boolean }>).detail.collapsed);
    });
  }, [setCollapseByDefault]);

  return { onViewCreated };
}
