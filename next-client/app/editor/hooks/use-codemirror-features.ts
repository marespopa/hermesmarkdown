"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EditorView } from "@codemirror/view";
import { EditorSelection } from "@codemirror/state";
import { findLinkAtPos } from "../utils/link-detection";
import { findDateAtPos } from "../utils/date-detection";
import { DateMatch } from "../types";

interface Pos {
  top: number;
  left: number;
}

interface LinkPillState {
  url: string;
  label: string;
  type: "url" | "wiki";
  pos: Pos;
  range: { start: number; end: number };
}

interface UseCodeMirrorFeaturesOptions {
  viewRef: React.RefObject<EditorView | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onWikiLinkClick?: (name: string) => void;
}

// Positioned-widget layer (Step 4): link pill and date picker. Detection is
// cursor-driven, not hover-driven; positions come from `view.coordsAtPos`,
// converted to containerRef-relative coordinates for the existing
// LinkPill/DatePickerCallout components.
export function useCodeMirrorFeatures({ viewRef, containerRef, onWikiLinkClick }: UseCodeMirrorFeaturesOptions) {
  const [linkPill, setLinkPill] = useState<LinkPillState | null>(null);
  const pillRangeRef = useRef<{ start: number; end: number } | null>(null);
  pillRangeRef.current = linkPill?.range ?? null;

  const [dateMatch, setDateMatch] = useState<DateMatch | null>(null);
  const [isDateExpanded, setIsDateExpanded] = useState(false);
  const [dateMenuPos, setDateMenuPos] = useState({ top: 0, left: 0, endLeft: 0 });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const posToXY = useCallback((view: EditorView, pos: number): Pos => {
    const coords = view.coordsAtPos(pos);
    const wrapperRect = containerRef.current?.getBoundingClientRect();
    if (!coords || !wrapperRect) return { top: 0, left: 0 };
    return { top: coords.top - wrapperRect.top, left: coords.left - wrapperRect.left };
  }, [containerRef]);

  const buildLinkPill = useCallback((view: EditorView, pos: number): LinkPillState | null => {
    const link = findLinkAtPos(view.state.doc.toString(), pos);
    if (!link) return null;
    const p = posToXY(view, pos);
    const pillWidth = 70;
    return {
      url: link.value,
      label: link.label ?? "",
      type: link.type as "url" | "wiki",
      range: { start: link.start, end: link.end },
      pos: {
        top: p.top - 14 - 2,
        left: Math.min(p.left + 8, (containerRef.current?.clientWidth ?? 500) - pillWidth),
      },
    };
  }, [posToXY, containerRef]);

  const dismissPill = useCallback(() => {
    setLinkPill(null);
  }, []);

  const runDetection = useCallback((view: EditorView) => {
    const sel = view.state.selection.main;
    const value = view.state.doc.toString();
    const pos = sel.head;

    setLinkPill(sel.empty ? buildLinkPill(view, pos) : null);

    const dm = findDateAtPos(value, pos);
    if (dm) {
      const p = posToXY(view, pos);
      const pEnd = posToXY(view, dm.end);
      setDateMatch(dm);
      setDateMenuPos({ top: p.top - 14, left: p.left, endLeft: pEnd.left });
    } else {
      setDateMatch(null);
      setIsDateExpanded(false);
    }
  }, [posToXY, buildLinkPill]);

  const onCursorActivity = useCallback((view: EditorView) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runDetection(view), 50);
  }, [runDetection]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  // Ctrl/Cmd+click opens a URL link or navigates a wikilink.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const dom = view.dom;
    const handleMouseDown = (e: MouseEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      const pos = view.posAtCoords({ x: e.clientX, y: e.clientY });
      if (pos == null) return;
      const link = findLinkAtPos(view.state.doc.toString(), pos);
      if (!link) return;
      e.preventDefault();
      if (link.type === "url") {
        window.open(link.value, "_blank", "noopener,noreferrer");
      } else if (onWikiLinkClick) {
        onWikiLinkClick(link.value);
      }
    };
    dom.addEventListener("mousedown", handleMouseDown, true);
    return () => dom.removeEventListener("mousedown", handleMouseDown, true);
  }, [viewRef, onWikiLinkClick]);

  // Escape dismisses the open link/date popup.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const dom = view.dom;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (linkPill) { dismissPill(); return; }
        if (isDateExpanded) { setIsDateExpanded(false); return; }
      }
    };
    dom.addEventListener("keydown", handleKeyDown, true);
    return () => dom.removeEventListener("keydown", handleKeyDown, true);
  }, [viewRef, isDateExpanded, linkPill, dismissPill]);

  const dispatchReplace = useCallback((from: number, to: number, insert: string) => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch(view.state.update({
      changes: { from, to, insert },
      selection: EditorSelection.cursor(from + insert.length),
      userEvent: "input.replace",
    }));
    view.focus();
  }, [viewRef]);

  const handleSaveLink = useCallback((newLabel: string, newUrl: string) => {
    const range = pillRangeRef.current;
    if (!range) return;
    dispatchReplace(range.start, range.end, `[${newLabel}](${newUrl})`);
    dismissPill();
  }, [dispatchReplace, dismissPill]);

  const handleDateSelect = useCallback((newDate: Date) => {
    if (!dateMatch) return;
    const y = newDate.getFullYear();
    const m = String(newDate.getMonth() + 1).padStart(2, "0");
    const d = String(newDate.getDate()).padStart(2, "0");
    const iso = `${y}-${m}-${d}`;
    let formatted = "";
    if (dateMatch.format === "iso") {
      formatted = dateMatch.rawString.startsWith("@due(") ? `@due(${iso})` : iso;
    } else if (dateMatch.format === "wiki") formatted = `[[${iso}]]`;
    else if (dateMatch.format === "slashed") formatted = `${m}/${d}/${y}`;
    else if (dateMatch.format === "dotted") formatted = `${d}.${m}.${y}`;
    dispatchReplace(dateMatch.start, dateMatch.end, formatted);
    setDateMatch(null);
    setIsDateExpanded(false);
  }, [dateMatch, dispatchReplace]);

  return {
    pillUrl: linkPill?.url ?? null,
    pillLabel: linkPill?.label ?? "",
    pillPos: linkPill?.pos ?? { top: 0, left: 0 },
    pillType: linkPill?.type ?? null,
    dismissPill,
    handleSaveLink,
    dateMatch, setDateMatch, isDateExpanded, setIsDateExpanded, dateMenuPos, handleDateSelect,
    onCursorActivity,
  };
}
