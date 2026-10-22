"use client";

import { useState, useEffect, useMemo, useRef, RefObject } from "react";
import { useAtomValue } from "jotai";
import {
  atom_editorFontFamily,
  atom_lineHeight,
  atom_renderedFontSize,
} from "@/app/atoms/atoms";

// Room the hanging margin marks need, in units of the editor's font size.
export const MARGIN_MARKS_ROOM = 2.25;

// Breakpoints below are keyed off the pane's own width (measured via
// ResizeObserver), not window.innerWidth: the sidebar takes room from it.

export function useEditorAppearance() {
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

  // Generous page margins: the text column (--editor-measure, editor-typography.scss)
  // caps line length on wide panes; these keep mid-width panes from running
  // text into the sheet's edges.
  const contentPaddingX = useMemo(() => {
    if (paneWidth < 640) return 20;
    if (paneWidth >= 1280) return 56;
    return 48;
  }, [paneWidth]);

  // The leading margin also holds the heading `#`s and quote `>`s that hang
  // outside the text (`.cm-marginMarks`, live-markers-theme.ts): at most about
  // two letters of body text (`###### `, or H1's larger `# `, at 60%), so
  // never less than that, in step with the text size. Narrow panes have the
  // smallest margins; without this the marks spill past the sheet.
  const contentPaddingLeft = `max(${contentPaddingX}px, calc(var(--editor-font-size, 17px) * ${MARGIN_MARKS_ROOM}))`;

  return {
    fontFamily,
    displayFontSize,
    lineHeight,
    windowWidth,
    paneRef: paneRef as RefObject<HTMLDivElement | null>,
    contentPaddingX,
    contentPaddingLeft,
  };
}
