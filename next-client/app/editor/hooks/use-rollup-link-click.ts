"use client";

import { useCallback, useEffect, useRef } from "react";
import type { EditorView } from "@codemirror/view";
import { parseRollupItem } from "@/app/utils/rollup/items";
import { requestRollupItem } from "../utils/worklog-events";

// A press counts as "on this line" for this long (the link opens on mousedown).
const POINTER_MS = 1_000;

// In a rollup sheet, a day link on an item line (`… · [[2026-10-06]]`) opens
// that day with the caret on the task instead of at the top. The line is the
// one under the latest press (Ctrl/Cmd+click, recorded before the editor's own
// handlers run) or else the caret's (the link pill, Ctrl/Cmd+Shift+Enter).
// Every other link goes to `onWikiLinkClick` unchanged.
export function useRollupLinkClick(
  viewRef: { current: EditorView | null },
  filePath: string,
  isRollup: boolean,
  onWikiLinkClick?: (name: string) => void,
) {
  const pointer = useRef<{ line: string; at: number } | null>(null);

  useEffect(() => {
    if (!isRollup) return;
    const onPress = (event: MouseEvent) => {
      const view = viewRef.current;
      if (!view || !(event.target instanceof Node) || !view.dom.contains(event.target)) return;
      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
      pointer.current = pos == null ? null : { line: view.state.doc.lineAt(pos).text, at: Date.now() };
    };
    window.addEventListener("mousedown", onPress, true);
    return () => window.removeEventListener("mousedown", onPress, true);
  }, [isRollup, viewRef]);

  return useCallback((name: string) => {
    const view = viewRef.current;
    if (isRollup && view && /^\d{4}-\d{2}-\d{2}$/.test(name)) {
      const pressed = pointer.current && Date.now() - pointer.current.at < POINTER_MS ? pointer.current.line : null;
      const line = pressed ?? view.state.doc.lineAt(view.state.selection.main.head).text;
      if (parseRollupItem(line)?.date === name) {
        requestRollupItem({ path: filePath, line, action: "open" });
        return;
      }
    }
    onWikiLinkClick?.(name);
  }, [viewRef, isRollup, filePath, onWikiLinkClick]);
}
