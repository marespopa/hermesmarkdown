"use client";

import { useCallback, useEffect, useState } from "react";
import type { EditorView } from "@codemirror/view";
import { CALLOUT_TYPE_MENU_EVENT, calloutTypeAt, setCalloutType, type CalloutTypeMenuRequest } from "../codemirror/callout-type";
import { resolveCalloutType } from "../constants/callouts";

interface CalloutTypeMenuState {
  /** The title line's start. */
  pos: number;
  x: number;
  y: number;
  /** The current type, resolved (aliases to their type). */
  current: string;
}

interface UseCodeMirrorCalloutTypeOptions {
  viewRef: React.RefObject<EditorView | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

// Opens the callout type menu when the editor asks (CALLOUT_TYPE_MENU_EVENT)
// and writes the picked type into the callout's title line.
export function useCodeMirrorCalloutType({ viewRef, containerRef }: UseCodeMirrorCalloutTypeOptions) {
  const [menu, setMenu] = useState<CalloutTypeMenuState | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleRequest = (event: Event) => {
      const view = viewRef.current;
      const { pos, anchor } = (event as CustomEvent<CalloutTypeMenuRequest>).detail;
      if (!view) return;
      const type = calloutTypeAt(view, pos);
      if (type === null) return;
      const lineFrom = view.state.doc.lineAt(pos).from;
      const coords = anchor ?? view.coordsAtPos(lineFrom);
      if (!coords) return;
      setMenu({ pos: lineFrom, x: coords.left, y: coords.bottom + 4, current: resolveCalloutType(type) });
    };
    container.addEventListener(CALLOUT_TYPE_MENU_EVENT, handleRequest);
    return () => container.removeEventListener(CALLOUT_TYPE_MENU_EVENT, handleRequest);
  }, [containerRef, viewRef]);

  const close = useCallback(() => setMenu(null), []);

  const select = useCallback((type: string) => {
    const view = viewRef.current;
    if (view && menu) setCalloutType(view, menu.pos, type);
    setMenu(null);
    view?.focus();
  }, [menu, viewRef]);

  return { menu, select, close };
}
