"use client";

import { useCallback, useRef } from "react";
import { useStore } from "jotai";
import type { DecorationSet, EditorView } from "@codemirror/view";
import { foldedRanges } from "@codemirror/language";
import { atom_headingFolds } from "@/app/atoms/ui-atoms";
import { headingFoldKeys, restoreHeadingFolds } from "../codemirror/heading-fold";

// Keeps a note's folded heading sections for the visit: a note opens with
// the headings it had folded when it was last open (atom_headingFolds, by
// path). Folding itself lives in codemirror/heading-fold.ts.
export function useCodeMirrorHeadingFold(filePath: string) {
  const store = useStore();
  const filePathRef = useRef(filePath);
  filePathRef.current = filePath;
  // The fold set last saved: a caret move or an edit without folds to
  // carry costs one comparison.
  const savedRef = useRef<DecorationSet | null>(null);

  const onViewCreated = useCallback((view: EditorView) => {
    restoreHeadingFolds(view, store.get(atom_headingFolds)[filePathRef.current] ?? []);
    savedRef.current = foldedRanges(view.state);
  }, [store]);

  const onCursorActivity = useCallback((view: EditorView) => {
    const ranges = foldedRanges(view.state);
    if (ranges === savedRef.current) return;
    savedRef.current = ranges;
    const keys = headingFoldKeys(view.state);
    const path = filePathRef.current;
    const current = store.get(atom_headingFolds);
    if ((current[path] ?? []).join("\n") === keys.join("\n")) return;
    store.set(atom_headingFolds, { ...current, [path]: keys });
  }, [store]);

  return { onViewCreated, onCursorActivity };
}
