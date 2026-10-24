"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EditorView } from "@codemirror/view";
import { EditorSelection } from "@codemirror/state";
import { findLinkAtPos, type LinkType } from "../utils/link-detection";
import { FILE_LINK_EVENT } from "../utils/open-link";
import { findDateAtPos } from "../utils/date-detection";
import { DateMatch } from "../types";

interface Pos {
  top: number;
  left: number;
}

interface LinkPillState {
  url: string;
  label: string;
  type: LinkType;
  pos: Pos;
  range: { start: number; end: number };
}

interface UseCodeMirrorFeaturesOptions {
  viewRef: React.RefObject<EditorView | null>;
  // The view once created (it's built asynchronously): DOM listeners attach
  // when it arrives, not on mount, when `viewRef` is still empty.
  editorView: EditorView | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onWikiLinkClick?: (name: string) => void;
  // A Markdown link to a vault path (`[Editor](./app/editor/README.md)`).
  onFileLinkClick?: (href: string) => void;
}

// Links and dates sit on one line: only the line at `pos` is searched, not the
// whole note, so a caret move doesn't copy and scan every character.
function findOnLine<T extends { start: number; end: number }>(
  view: EditorView,
  pos: number,
  find: (text: string, pos: number) => T | null,
): T | null {
  const line = view.state.doc.lineAt(pos);
  const match = find(line.text, pos - line.from);
  return match && { ...match, start: match.start + line.from, end: match.end + line.from };
}

// Positioned-widget layer (Step 4): link pill and date picker. Detection is
// cursor-driven, not hover-driven; positions come from `view.coordsAtPos`,
// converted to containerRef-relative coordinates for the existing
// LinkPill/DatePickerCallout components.
export function useCodeMirrorFeatures({ viewRef, editorView, containerRef, onWikiLinkClick, onFileLinkClick }: UseCodeMirrorFeaturesOptions) {
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
    const link = findOnLine(view, pos, findLinkAtPos);
    if (!link) return null;
    const p = posToXY(view, pos);
    const pillWidth = 70;
    return {
      url: link.value,
      label: link.label ?? "",
      type: link.type,
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
    const pos = sel.head;

    setLinkPill(sel.empty ? buildLinkPill(view, pos) : null);

    const dm = findOnLine(view, pos, findDateAtPos);
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

  // A web link opens in a new tab; a file link or wikilink opens its note here.
  const openLink = useCallback((type: LinkType, value: string) => {
    if (type === "url") window.open(value, "_blank", "noopener,noreferrer");
    else if (type === "file") onFileLinkClick?.(value);
    else onWikiLinkClick?.(value);
  }, [onWikiLinkClick, onFileLinkClick]);

  // The link pill's Open (and Ctrl/Cmd+Shift+Enter); false when no pill shows.
  const openPillLink = useCallback(() => {
    if (!linkPill) return false;
    openLink(linkPill.type, linkPill.url);
    setLinkPill(null);
    return true;
  }, [linkPill, openLink]);

  // Ctrl/Cmd+click opens a link; a table cell's rendered file links arrive as
  // FILE_LINK_EVENT (see openCellLink).
  useEffect(() => {
    const view = editorView;
    if (!view) return;
    const dom = view.dom;
    const handleMouseDown = (e: MouseEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      const pos = view.posAtCoords({ x: e.clientX, y: e.clientY });
      if (pos == null) return;
      const link = findOnLine(view, pos, findLinkAtPos);
      if (!link) return;
      e.preventDefault();
      openLink(link.type, link.value);
    };
    const handleFileLink = (e: Event) => openLink("file", (e as CustomEvent<string>).detail);
    dom.addEventListener("mousedown", handleMouseDown, true);
    dom.addEventListener(FILE_LINK_EVENT, handleFileLink);
    return () => {
      dom.removeEventListener("mousedown", handleMouseDown, true);
      dom.removeEventListener(FILE_LINK_EVENT, handleFileLink);
    };
  }, [editorView, openLink]);

  // Escape dismisses the open link/date popup.
  useEffect(() => {
    const view = editorView;
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
  }, [editorView, isDateExpanded, linkPill, dismissPill]);

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
      // A picked day keeps the time an ISO datetime already had.
      formatted = dateMatch.rawString.startsWith("@due(") ? `@due(${iso})` : iso + dateMatch.rawString.slice(10);
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
    openPillLink,
    handleSaveLink,
    dateMatch, setDateMatch, isDateExpanded, setIsDateExpanded, dateMenuPos, handleDateSelect,
    onCursorActivity,
  };
}
