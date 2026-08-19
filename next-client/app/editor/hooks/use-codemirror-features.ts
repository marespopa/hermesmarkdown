"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EditorView } from "@codemirror/view";
import { EditorSelection } from "@codemirror/state";
import { findLinkAtPos } from "../utils/link-detection";
import { findDateAtPos } from "../utils/date-detection";
import { REGEX_TODO_TAGS, REGEX_TODO_STATUS_TAGS, REGEX_CHECKBOX } from "../components/regex";
import { TAG_CYCLE, TAG_CYCLE_PREV, TODO_CYCLE, TODO_CYCLE_PREV } from "../components/constants";
import { DateMatch } from "../types";

interface Pos {
  top: number;
  left: number;
}

interface WorkflowMatch {
  tag: string;
  start: number;
  end: number;
  isFmStatus?: boolean;
}

interface TodoMatch {
  tag: string;
  start: number;
  end: number;
}

interface UseCodeMirrorFeaturesOptions {
  viewRef: React.RefObject<EditorView | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onWikiLinkClick?: (name: string) => void;
}

// Positioned-widget layer (Step 4): link pill, date picker, workflow/todo
// tag cycling. Detection is cursor-driven (mirrors the old
// use-link-pill.ts/use-editor-sync.ts, which listened to the textarea's
// `selectionchange`) rather than mouse-hover-driven; position is computed
// via CM6's native `view.coordsAtPos` instead of the textarea-caret
// library, converted to coordinates relative to containerRef so the
// existing LinkPill/WorkflowPill/DatePickerCallout components (which take
// a plain {top,left} prop) work unmodified.
export function useCodeMirrorFeatures({ viewRef, containerRef, onWikiLinkClick }: UseCodeMirrorFeaturesOptions) {
  const [pillUrl, setPillUrl] = useState<string | null>(null);
  const [pillLabel, setPillLabel] = useState("");
  const [pillPos, setPillPos] = useState<Pos>({ top: 0, left: 0 });
  const [pillType, setPillType] = useState<"url" | "wiki" | null>(null);
  const pillRangeRef = useRef<{ start: number; end: number } | null>(null);

  const [dateMatch, setDateMatch] = useState<DateMatch | null>(null);
  const [isDateExpanded, setIsDateExpanded] = useState(false);
  const [dateMenuPos, setDateMenuPos] = useState({ top: 0, left: 0, endLeft: 0 });

  const [workflowMatch, setWorkflowMatch] = useState<WorkflowMatch | null>(null);
  const [workflowMenuPos, setWorkflowMenuPos] = useState<Pos>({ top: 0, left: 0 });
  const [todoMatch, setTodoMatch] = useState<TodoMatch | null>(null);
  const [todoMenuPos, setTodoMenuPos] = useState<Pos>({ top: 0, left: 0 });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const posToXY = useCallback((view: EditorView, pos: number): Pos => {
    const coords = view.coordsAtPos(pos);
    const wrapperRect = containerRef.current?.getBoundingClientRect();
    if (!coords || !wrapperRect) return { top: 0, left: 0 };
    return { top: coords.top - wrapperRect.top, left: coords.left - wrapperRect.left };
  }, [containerRef]);

  const runDetection = useCallback((view: EditorView) => {
    const sel = view.state.selection.main;
    const value = view.state.doc.toString();
    const pos = sel.head;

    if (!sel.empty) {
      setPillUrl(null);
    } else {
      const link = findLinkAtPos(value, pos);
      if (link) {
        const p = posToXY(view, pos);
        const pillWidth = 70;
        setPillLabel(link.label ?? "");
        setPillType(link.type as "url" | "wiki");
        pillRangeRef.current = { start: link.start, end: link.end };
        setPillPos({
          top: p.top - 14 - 2,
          left: Math.min(p.left + 8, (containerRef.current?.clientWidth ?? 500) - pillWidth),
        });
        setPillUrl(link.value);
      } else {
        setPillUrl(null);
      }
    }

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

    const line = view.state.doc.lineAt(pos);
    const lineStart = line.from;
    const currentLine = line.text;
    const localPos = pos - lineStart;

    REGEX_TODO_TAGS.lastIndex = 0;
    let wfMatch: RegExpExecArray | null;
    let foundWorkflow = false;
    while ((wfMatch = REGEX_TODO_TAGS.exec(currentLine)) !== null) {
      const tagStart = wfMatch.index;
      const tagEnd = tagStart + wfMatch[0].length;
      if (localPos >= tagStart && localPos <= tagEnd) {
        const p = posToXY(view, lineStart + tagStart);
        setWorkflowMatch({ tag: wfMatch[1].toLowerCase(), start: lineStart + tagStart, end: lineStart + tagEnd });
        setWorkflowMenuPos({ top: p.top - 14, left: Math.max(0, p.left - 4) });
        foundWorkflow = true;
        break;
      }
    }
    if (!foundWorkflow) {
      const fmEnd = value.indexOf("\n---", 3);
      const inFrontmatter = fmEnd !== -1 && lineStart > 0 && lineStart + currentLine.length <= fmEnd + 4;
      const fmStatusMatch = inFrontmatter
        ? currentLine.match(/^status:\s+(draft|review|active|archived)\s*$/)
        : null;
      if (fmStatusMatch) {
        const valueOffset = currentLine.indexOf(fmStatusMatch[1]);
        const tagStart = lineStart + valueOffset;
        const p = posToXY(view, tagStart);
        setWorkflowMatch({ tag: fmStatusMatch[1], start: tagStart, end: tagStart + fmStatusMatch[1].length, isFmStatus: true });
        setWorkflowMenuPos({ top: p.top - 14, left: Math.max(0, p.left - 4) });
      } else {
        setWorkflowMatch(null);
      }
    }

    REGEX_TODO_STATUS_TAGS.lastIndex = 0;
    let tdMatch: RegExpExecArray | null;
    let foundTodo = false;
    while ((tdMatch = REGEX_TODO_STATUS_TAGS.exec(currentLine)) !== null) {
      const tagStart = tdMatch.index;
      const tagEnd = tagStart + tdMatch[0].length;
      if (localPos >= tagStart && localPos <= tagEnd) {
        const p = posToXY(view, lineStart + tagStart);
        setTodoMatch({ tag: tdMatch[1].toLowerCase(), start: lineStart + tagStart, end: lineStart + tagEnd });
        setTodoMenuPos({ top: p.top - 14, left: Math.max(0, p.left - 4) });
        foundTodo = true;
        break;
      }
    }
    if (!foundTodo) setTodoMatch(null);
  }, [posToXY, containerRef]);

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
        if (pillUrl) { setPillUrl(null); return; }
        if (isDateExpanded) { setIsDateExpanded(false); return; }
      }
    };
    dom.addEventListener("keydown", handleKeyDown, true);
    return () => dom.removeEventListener("keydown", handleKeyDown, true);
  }, [viewRef, isDateExpanded, pillUrl]);

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
    setPillUrl(null);
  }, [dispatchReplace]);

  const handleDateSelect = useCallback((newDate: Date) => {
    if (!dateMatch) return;
    const y = newDate.getFullYear();
    const m = String(newDate.getMonth() + 1).padStart(2, "0");
    const d = String(newDate.getDate()).padStart(2, "0");
    let formatted = "";
    if (dateMatch.format === "iso") formatted = `${y}-${m}-${d}`;
    else if (dateMatch.format === "wiki") formatted = `[[${y}-${m}-${d}]]`;
    else if (dateMatch.format === "slashed") formatted = `${m}/${d}/${y}`;
    else if (dateMatch.format === "dotted") formatted = `${d}.${m}.${y}`;
    dispatchReplace(dateMatch.start, dateMatch.end, formatted);
    setDateMatch(null);
    setIsDateExpanded(false);
  }, [dateMatch, dispatchReplace]);

  const handleWorkflowCycle = useCallback((direction: "prev" | "next") => {
    if (!workflowMatch) return;
    const cycle = direction === "next" ? TAG_CYCLE : TAG_CYCLE_PREV;
    const nextTag = workflowMatch.isFmStatus ? cycle[workflowMatch.tag] : `#${cycle[workflowMatch.tag]}`;
    dispatchReplace(workflowMatch.start, workflowMatch.end, nextTag);
  }, [workflowMatch, dispatchReplace]);

  const handleTodoCycle = useCallback((direction: "prev" | "next") => {
    const view = viewRef.current;
    if (!todoMatch || !view) return;
    const cycle = direction === "next" ? TODO_CYCLE : TODO_CYCLE_PREV;
    const nextTagName = cycle[todoMatch.tag];
    const nextTag = `#${nextTagName}`;

    // If the tag sits on a checkbox task line, keep the checkbox state in
    // sync with the #done status (and revert it otherwise).
    const line = view.state.doc.lineAt(todoMatch.start);
    const checkboxMatch = REGEX_CHECKBOX.exec(line.text);

    if (checkboxMatch) {
      const charIdx = line.from + checkboxMatch[1].length;
      const desiredState = nextTagName === "done" ? "x" : " ";
      view.dispatch(view.state.update({
        changes: [
          { from: charIdx, to: charIdx + 1, insert: desiredState },
          { from: todoMatch.start, to: todoMatch.end, insert: nextTag },
        ],
        userEvent: "input.replace",
      }));
      view.focus();
      return;
    }

    dispatchReplace(todoMatch.start, todoMatch.end, nextTag);
  }, [todoMatch, dispatchReplace, viewRef]);

  return {
    pillUrl, pillLabel, pillPos, pillType, setPillUrl, handleSaveLink,
    dateMatch, setDateMatch, isDateExpanded, setIsDateExpanded, dateMenuPos, handleDateSelect,
    workflowMatch, workflowMenuPos, handleWorkflowCycle,
    todoMatch, todoMenuPos, handleTodoCycle,
    onCursorActivity,
  };
}
