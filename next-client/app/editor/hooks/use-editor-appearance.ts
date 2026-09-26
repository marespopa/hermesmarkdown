"use client";

import { useState, useEffect, useMemo, useRef, RefObject } from "react";
import { useAtomValue } from "jotai";
import {
  atom_editorFontFamily,
  atom_lineHeight,
  atom_renderedFontSize,
} from "@/app/atoms/atoms";

// Breakpoints below are keyed off the *pane's* own width (measured via
// ResizeObserver), not window.innerWidth — a Tailwind md:/xl: prefix reacts
// to the whole viewport, so with the vault sidebar open (or in a split pane)
// the editor kept centering its max-width column as if it had the full
// window to itself, leaving an oversized, sidebar-unaware margin.

export function useEditorAppearance(isSplit = false) {
  const fontFamily = useAtomValue(atom_editorFontFamily);
  const fontSize = useAtomValue(atom_renderedFontSize);
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

  // Base horizontal inset on the pane itself so split panes use their own width.
  const contentPaddingX = useMemo(() => {
    if (paneWidth < 640) return 16;
    if (isSplit) return paneWidth < 900 ? 16 : 24;
    if (paneWidth >= 1280) return 32;
    if (paneWidth >= 1024) return 24;
    return 20;
  }, [isSplit, paneWidth]);

  return {
    fontFamily,
    displayFontSize,
    lineHeight,
    windowWidth,
    paneRef: paneRef as RefObject<HTMLDivElement | null>,
    contentPaddingX,
  };
}
