"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useAtom, useSetAtom } from "jotai";
import getCaretCoordinates from "textarea-caret";
import {
  atom_cursorPosition,
  atom_selectionCount,
} from "@/app/atoms/atoms";
import { findDateAtPos } from "../utils/date-detection";
import { DateMatch } from "../types";
import { REGEX_TODO_TAGS, REGEX_TODO_STATUS_TAGS } from "../components/regex";

interface UseEditorSyncProps {
  value: string;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  isDateExpanded: boolean;
  setIsDateExpanded: (expanded: boolean) => void;
}

export function useEditorSync({
  value,
  textareaRef,
  setIsDateExpanded,
}: UseEditorSyncProps) {
  const [, setCursorPosition] = useAtom(atom_cursorPosition);
  const setSelectionCount = useSetAtom(atom_selectionCount);
  
  const [activeLineIndex, setActiveLineIndex] = useState(0);
  const [dateMatch, setDateMatch] = useState<DateMatch | null>(null);
  const dateMatchRef = useRef<DateMatch | null>(null);
  const [dateMenuPos, setDateMenuPos] = useState({ top: 0, left: 0, endLeft: 0 });

  const [workflowMatch, setWorkflowMatch] = useState<{ tag: string; start: number; end: number; isFmStatus?: boolean } | null>(null);
  const [workflowMenuPos, setWorkflowMenuPos] = useState({ top: 0, left: 0 });

  const [todoMatch, setTodoMatch] = useState<{ tag: string; start: number; end: number } | null>(null);
  const [todoMenuPos, setTodoMenuPos] = useState({ top: 0, left: 0 });

  const dateDetectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (dateDetectionTimeoutRef.current) {
        clearTimeout(dateDetectionTimeoutRef.current);
      }
    };
  }, []);

  const syncActiveLine = useCallback(() => {
    if (!isMountedRef.current || !textareaRef.current) return;
    const pos = textareaRef.current.selectionStart;
    const textUpToCursor = value.substring(0, pos);
    const lines = textUpToCursor.split("\n");
    const lineIndex = lines.length - 1;
    setActiveLineIndex(lineIndex);
    setCursorPosition({
      line: lines.length,
      col: lines[lineIndex].length + 1,
    });

    const selEnd = textareaRef.current.selectionEnd;
    if (selEnd !== pos) {
      const sel = value.substring(Math.min(pos, selEnd), Math.max(pos, selEnd));
      setSelectionCount(sel.trim() ? sel.trim().split(/\s+/).filter(Boolean).length : 0);
    } else {
      setSelectionCount(0);
    }

    if (dateDetectionTimeoutRef.current)
      clearTimeout(dateDetectionTimeoutRef.current);
    dateDetectionTimeoutRef.current = setTimeout(() => {
      if (!textareaRef.current) return;
      const match = findDateAtPos(value, pos);
      if (match) {
        if (!dateMatchRef.current || dateMatchRef.current.start !== match.start) {
          setDateMatch(match);
          dateMatchRef.current = match;
        } else {
          setDateMatch(match);
          dateMatchRef.current = match;
        }

        const caretStart = getCaretCoordinates(textareaRef.current, match.start);
        const caretEnd = getCaretCoordinates(textareaRef.current, match.end);
        const caretHeight = caretStart.height || 22;

        setDateMenuPos({
          top: (caretStart.top || 0) + caretHeight / 2 - 14,
          left: caretStart.left || 0,
          endLeft: caretEnd.left || 0,
        });
      } else {
        setDateMatch(null);
        dateMatchRef.current = null;
        setIsDateExpanded(false);
      }

      // Workflow tag detection
      const textBefore = value.substring(0, pos);
      const lineStart = textBefore.lastIndexOf("\n") + 1;
      const lineEnd = value.indexOf("\n", pos) === -1 ? value.length : value.indexOf("\n", pos);
      const currentLine = value.substring(lineStart, lineEnd);

      REGEX_TODO_TAGS.lastIndex = 0;
      let wfMatch: RegExpExecArray | null;
      let foundWorkflow = false;
      while ((wfMatch = REGEX_TODO_TAGS.exec(currentLine)) !== null) {
        const tagStart = lineStart + wfMatch.index;
        const tagEnd = tagStart + wfMatch[0].length;
        if (pos >= tagStart && pos <= tagEnd) {
          const tag = wfMatch[1].toLowerCase();
          if (!textareaRef.current) break;
          const caretEnd = getCaretCoordinates(textareaRef.current, tagEnd);
          const caretHeight = caretEnd.height || 22;
          setWorkflowMatch({ tag, start: tagStart, end: tagEnd });
          setWorkflowMenuPos({
            top: (caretEnd.top || 0) + caretHeight / 2 - 14,
            left: Math.max(0, (caretEnd.left || 0) - 4),
          });
          foundWorkflow = true;
          break;
        }
      }
      if (!foundWorkflow) {
        // Frontmatter status: detect `status: draft|review|active|archived` inside the FM block
        const fmEnd = value.indexOf("\n---", 3);
        const inFrontmatter = fmEnd !== -1 && lineStart > 0 && lineEnd <= fmEnd + 4;
        const fmStatusMatch = inFrontmatter
          ? currentLine.match(/^status:\s+(draft|review|active|archived)\s*$/)
          : null;
        if (fmStatusMatch) {
          const valueOffset = currentLine.indexOf(fmStatusMatch[1]);
          const tagStart = lineStart + valueOffset;
          const tagEnd = tagStart + fmStatusMatch[1].length;
          if (!textareaRef.current) {
            setWorkflowMatch(null);
          } else {
            const caretEnd = getCaretCoordinates(textareaRef.current, tagEnd);
            const caretHeight = caretEnd.height || 22;
            setWorkflowMatch({ tag: fmStatusMatch[1], start: tagStart, end: tagEnd, isFmStatus: true });
            setWorkflowMenuPos({
              top: (caretEnd.top || 0) + caretHeight / 2 - 14,
              left: Math.max(0, (caretEnd.left || 0) - 4),
            });
          }
        } else {
          setWorkflowMatch(null);
        }
      }

      // Todo status tag detection (#todo / #prog / #done)
      REGEX_TODO_STATUS_TAGS.lastIndex = 0;
      let tdMatch: RegExpExecArray | null;
      let foundTodo = false;
      while ((tdMatch = REGEX_TODO_STATUS_TAGS.exec(currentLine)) !== null) {
        const tagStart = lineStart + tdMatch.index;
        const tagEnd = tagStart + tdMatch[0].length;
        if (pos >= tagStart && pos <= tagEnd) {
          const tag = tdMatch[1].toLowerCase();
          if (!textareaRef.current) break;
          const caretEnd = getCaretCoordinates(textareaRef.current, tagEnd);
          const caretHeight = caretEnd.height || 22;
          setTodoMatch({ tag, start: tagStart, end: tagEnd });
          setTodoMenuPos({
            top: (caretEnd.top || 0) + caretHeight / 2 - 14,
            left: Math.max(0, (caretEnd.left || 0) - 4),
          });
          foundTodo = true;
          break;
        }
      }
      if (!foundTodo) setTodoMatch(null);
    }, 50);
  }, [value, setCursorPosition, setSelectionCount, textareaRef, setIsDateExpanded]);

  const syncScroll = useCallback(() => {
    // Feature removed to prevent jumpy scrolling
  }, []);

  useEffect(() => {
    const handleSelectionChange = () => {
      if (document.activeElement !== textareaRef.current) return;
      syncActiveLine();
      syncScroll();
    };
    document.addEventListener("selectionchange", handleSelectionChange);
    const timer1 = setTimeout(() => {
      syncActiveLine();
      syncScroll();
    }, 350);
    const timer2 = setTimeout(() => {
      syncActiveLine();
      syncScroll();
    }, 700);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      clearTimeout(timer1);
      clearTimeout(timer2);
      if (dateDetectionTimeoutRef.current) {
        clearTimeout(dateDetectionTimeoutRef.current);
      }
    };
  }, [syncActiveLine, syncScroll, textareaRef]);

  return {
    activeLineIndex,
    dateMatch,
    setDateMatch,
    dateMenuPos,
    workflowMatch,
    setWorkflowMatch,
    workflowMenuPos,
    todoMatch,
    todoMenuPos,
    syncActiveLine,
    syncScroll,
  };
}
