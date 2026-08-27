"use client";

import { useState, useEffect, useMemo, useRef, RefObject } from "react";
import { useAtomValue } from "jotai";
import {
  atom_editorWidth,
  atom_editorContentWidth,
  atom_lineHeight,
  atom_renderedFontSize,
  MONO_FONT_STACK,
} from "@/app/atoms/atoms";

// Breakpoints below are keyed off the *pane's* own width (measured via
// ResizeObserver), not window.innerWidth — a Tailwind md:/xl: prefix reacts
// to the whole viewport, so with the vault sidebar open (or in a split pane)
// the editor kept centering its max-width column as if it had the full
// window to itself, leaving an oversized, sidebar-unaware margin.
export function useEditorAppearance(isSplit = false) {
  // Source's font family is fixed monospace, not user-configurable — see
  // MONO_FONT_STACK's comment in ui-atoms.ts. Size and line-height still
  // follow the shared Settings controls.
  const fontFamily = MONO_FONT_STACK;
  const fontSize = useAtomValue(atom_renderedFontSize);
  const editorWidth = useAtomValue(atom_editorWidth);
  const editorContentWidth = useAtomValue(atom_editorContentWidth);
  const lineHeight = useAtomValue(atom_lineHeight);

  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200,
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const paneRef = useRef<HTMLElement | null>(null);
  const [paneWidth, setPaneWidth] = useState(windowWidth);

  useEffect(() => {
    const el = paneRef.current;
    if (!el) return;
    setPaneWidth(el.getBoundingClientRect().width);
    const observer = new ResizeObserver((entries) => setPaneWidth(entries[0].contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const displayFontSize = useMemo(() => {
    return fontSize;
  }, [fontSize]);

  // Numeric max-width for the centered column, resolved against paneWidth.
  const maxContentWidth = useMemo(() => {
    if (editorWidth === "narrow") {
      return paneWidth >= 768 ? 600 : undefined;
    }
    if (editorContentWidth !== null && paneWidth >= 768) {
      return editorContentWidth;
    }
    if (paneWidth >= 1280) return 860;
    if (paneWidth >= 768) return 760;
    return undefined;
  }, [editorContentWidth, editorWidth, paneWidth]);

  // A split pane can be narrower than the md breakpoint while the window
  // itself is still wide, so it keeps the sm padding at every width instead
  // of dropping it the way a full-width pane does past md.
  const contentPaddingX = useMemo(() => {
    if (paneWidth >= 640) return isSplit ? 24 : paneWidth >= 768 ? 0 : 24;
    return 16;
  }, [isSplit, paneWidth]);

  // Padding used when word wrap is off (editor scrolls horizontally instead
  // of centering a fixed-width column).
  const noWrapPaddingX = useMemo(() => {
    if (paneWidth >= 768) return 40;
    if (paneWidth >= 640) return 24;
    return 16;
  }, [paneWidth]);

  return {
    fontFamily,
    displayFontSize,
    lineHeight,
    windowWidth,
    paneRef: paneRef as RefObject<HTMLDivElement | null>,
    maxContentWidth,
    contentPaddingX,
    noWrapPaddingX,
  };
}
