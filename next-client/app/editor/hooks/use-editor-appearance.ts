"use client";

import { useState, useEffect, useMemo, useRef, RefObject } from "react";
import { useAtomValue } from "jotai";
import {
  atom_editorWidth,
  atom_editorContentWidth,
  atom_editorFontFamily,
  atom_lineHeight,
  atom_renderedFontSize,
} from "@/app/atoms/atoms";

// Breakpoints below are keyed off the *pane's* own width (measured via
// ResizeObserver), not window.innerWidth — a Tailwind md:/xl: prefix reacts
// to the whole viewport, so with the vault sidebar open (or in a split pane)
// the editor kept centering its max-width column as if it had the full
// window to itself, leaving an oversized, sidebar-unaware margin.

// Max-width per preset at the md (>=768) and xl (>=1280) pane breakpoints.
// Narrow is handled separately below since it doesn't grow past 600 at xl.
const PRESET_MAX_WIDTHS: Record<"standard" | "medium" | "wide", { md: number; xl: number }> = {
  standard: { md: 760, xl: 860 },
  medium: { md: 960, xl: 1060 },
  wide: { md: 1160, xl: 1260 },
};

export function useEditorAppearance(isSplit = false) {
  const fontFamily = useAtomValue(atom_editorFontFamily);
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
    const preset = PRESET_MAX_WIDTHS[editorWidth];
    if (paneWidth >= 1280) return preset.xl;
    if (paneWidth >= 768) return preset.md;
    return undefined;
  }, [editorContentWidth, editorWidth, paneWidth]);


  // A split pane can be narrower than the md breakpoint while the window
  // itself is still wide, so it keeps the sm padding at every width instead
  // of dropping it the way a full-width pane does past md. Dropping to 0 is
  // only safe once the centered column actually has room to breathe — at
  // lower resolutions (e.g. a narrow window with the vault sidebar open)
  // maxContentWidth can clamp to paneWidth, leaving mx-auto with no space
  // to create a margin and the text flush against the pane edge.
  const contentPaddingX = useMemo(() => {
    if (paneWidth < 640) return 16;
    if (isSplit) return 24;
    if (paneWidth >= 768 && maxContentWidth !== undefined && paneWidth > maxContentWidth) return 0;
    return 24;
  }, [isSplit, paneWidth, maxContentWidth]);

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
