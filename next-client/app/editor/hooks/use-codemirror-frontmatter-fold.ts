"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAtom } from "jotai";
import type { EditorView } from "@codemirror/view";
import { atom_frontmatterCollapsedByDefault, atom_frontmatterCollapsedByFile } from "@/app/atoms/atoms";
import {
  FRONTMATTER_TOGGLE_EVENT,
  findFrontmatterFoldRange,
  isFrontmatterFolded,
  toggleFrontmatterFold,
} from "../codemirror/frontmatter-fold";

// Editors open per file, so the shared entry is dropped once the last one
// showing that file closes and a reopened note follows the default again.
const openEditorCounts = new Map<string, number>();

export function useCodeMirrorFrontmatterFold({
  viewRef,
  filePath,
}: {
  viewRef: React.RefObject<EditorView | null>;
  filePath: string;
}) {
  // A click on the Properties row is remembered: notes opened later start
  // that way. Already-open notes keep their own state.
  const [collapseByDefault, setCollapseByDefault] = useAtom(atom_frontmatterCollapsedByDefault);
  const collapseByDefaultRef = useRef(collapseByDefault);
  collapseByDefaultRef.current = collapseByDefault;

  // Split panes showing the same file share its collapsed state; drafts are
  // all "draft", so each keeps its own.
  const shareKey = filePath === "draft" ? null : filePath;
  const [collapsedByFile, setCollapsedByFile] = useAtom(atom_frontmatterCollapsedByFile);
  const sharedCollapsed = shareKey ? collapsedByFile[shareKey] : undefined;
  const sharedCollapsedRef = useRef(sharedCollapsed);
  sharedCollapsedRef.current = sharedCollapsed;

  const recompute = useCallback((view: EditorView) => {
    const range = findFrontmatterFoldRange(view.state.doc.toString());
    const folded = range ? isFrontmatterFolded(view.state) : null;
    // Whatever changed it here (the header row, caret moving in, how notes
    // open) becomes the file's state for the other panes.
    if (shareKey && folded !== null) {
      setCollapsedByFile((prev) => (prev[shareKey] === folded ? prev : { ...prev, [shareKey]: folded }));
    }
  }, [setCollapsedByFile, shareKey]);

  // A note already open in another pane opens the way it shows there;
  // otherwise as the last Properties row click left it.
  const onViewCreated = useCallback((view: EditorView) => {
    const range = findFrontmatterFoldRange(view.state.doc.toString());
    if ((sharedCollapsedRef.current ?? collapseByDefaultRef.current) && range) {
      toggleFrontmatterFold(view, range, true, { animate: false });
    }
    // Only the row click counts, not the caret moving in or a split pane following.
    view.dom.addEventListener(FRONTMATTER_TOGGLE_EVENT, (event) => {
      setCollapseByDefault((event as CustomEvent<{ collapsed: boolean }>).detail.collapsed);
    });
    recompute(view);
  }, [recompute, setCollapseByDefault]);

  useEffect(() => {
    if (!shareKey) return;
    openEditorCounts.set(shareKey, (openEditorCounts.get(shareKey) ?? 0) + 1);
    return () => {
      const remaining = (openEditorCounts.get(shareKey) ?? 1) - 1;
      if (remaining > 0) {
        openEditorCounts.set(shareKey, remaining);
        return;
      }
      openEditorCounts.delete(shareKey);
      setCollapsedByFile((prev) => {
        if (!(shareKey in prev)) return prev;
        const next = { ...prev };
        delete next[shareKey];
        return next;
      });
    };
  }, [setCollapsedByFile, shareKey]);

  // Another pane on the same file collapsed or expanded it: follow.
  useEffect(() => {
    const view = viewRef.current;
    if (!view || sharedCollapsed === undefined) return;
    const range = findFrontmatterFoldRange(view.state.doc.toString());
    if (range && isFrontmatterFolded(view.state) !== sharedCollapsed) {
      toggleFrontmatterFold(view, range, sharedCollapsed);
      recompute(view);
    }
  }, [recompute, sharedCollapsed, viewRef]);

  return { onCursorActivity: recompute, onViewCreated };
}
