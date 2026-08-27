"use client";

import { useCallback, useRef, useState } from "react";
import type { EditorView } from "@codemirror/view";
import { EditorSelection } from "@codemirror/state";

interface Pos {
  top: number;
  left: number;
}

interface UseCodeMirrorCodeLanguagePickerOptions {
  viewRef: React.RefObject<EditorView | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function useCodeMirrorCodeLanguagePicker({
  viewRef,
  containerRef,
}: UseCodeMirrorCodeLanguagePickerOptions) {
  const [languagePickerInfo, setLanguagePickerInfo] = useState(false);
  const [pickerPos, setPickerPos] = useState<Pos>({ top: 0, left: 0 });
  const [query, setQuery] = useState("");
  const rangeRef = useRef<{ from: number; to: number } | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const deactivate = useCallback(() => {
    rangeRef.current = null;
    setLanguagePickerInfo(false);
    setQuery("");
  }, []);

  const onCursorActivity = useCallback((view: EditorView) => {
    const range = rangeRef.current;
    const selection = view.state.selection.main;
    if (!range || !selection.empty) {
      if (range) deactivate();
      return;
    }

    const line = view.state.doc.lineAt(selection.head);
    const cursorOffset = selection.head - line.from;
    const beforeCursor = line.text.slice(0, cursorOffset);
    if (!/^```[\w+#-]*$/.test(beforeCursor) || cursorOffset < 3 || line.text.length !== cursorOffset) {
      deactivate();
      return;
    }

    const wrapperRect = containerRef.current?.getBoundingClientRect();
    const caretCoords = view.coordsAtPos(selection.head);
    if (wrapperRect && caretCoords) {
      setPickerPos({
        top: caretCoords.top - wrapperRect.top - 26 + (containerRef.current?.scrollTop ?? 0),
        left: caretCoords.left - wrapperRect.left,
      });
    }
    rangeRef.current = { from: line.from + 3, to: selection.head };
    setQuery(beforeCursor.slice(3));
    setLanguagePickerInfo(true);
  }, [containerRef, deactivate]);

  const activate = useCallback((view: EditorView, pos: number) => {
    rangeRef.current = { from: pos, to: pos };
    setQuery("");
    setLanguagePickerInfo(true);
    const wrapperRect = containerRef.current?.getBoundingClientRect();
    const caretCoords = view.coordsAtPos(pos);
    if (wrapperRect && caretCoords) {
      setPickerPos({
        top: caretCoords.top - wrapperRect.top - 26 + (containerRef.current?.scrollTop ?? 0),
        left: caretCoords.left - wrapperRect.left,
      });
    }
  }, [containerRef]);

  const changeQuery = useCallback((value: string) => {
    const view = viewRef.current;
    const range = rangeRef.current;
    if (!view || !range) return;
    view.dispatch({
      changes: { from: range.from, to: range.to, insert: value },
      selection: EditorSelection.cursor(range.from + value.length),
      userEvent: "input.code-language",
    });
  }, [viewRef]);

  const selectLanguage = useCallback((language: string) => {
    const view = viewRef.current;
    const range = rangeRef.current;
    if (!view || !range) return;
    const openingLine = view.state.doc.lineAt(range.from);
    const bodyLine = view.state.doc.line(openingLine.number + 1);
    view.dispatch({
      changes: { from: range.from, to: range.to, insert: language },
      selection: EditorSelection.cursor(bodyLine.from + language.length - (range.to - range.from)),
      userEvent: "input.code-language",
    });
    deactivate();
    view.focus();
  }, [deactivate, viewRef]);

  return {
    languagePickerInfo,
    pickerPos,
    query,
    pickerRef,
    activate,
    onCursorActivity,
    changeQuery,
    selectLanguage,
    deactivate,
  };
}