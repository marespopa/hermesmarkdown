"use client";

import { useCallback, useRef } from "react";
import type { EditorView } from "@codemirror/view";
import type { TableInfo } from "../utils/table-detection";
import { findTableInState, realignExitedTable } from "../codemirror/table-commands";

// Tables are edited in an inline grid (codemirror/table-display.tsx) whose
// row/column/table menus hang off the table's own edges
// (codemirror/table-handles.ts). The grid keeps the hidden CM caret inside
// the focused cell, so all this hook still does is notice when that caret
// leaves a table and realign the table's source column widths then — never
// mid-edit, where it would just churn the document.
export function useCodeMirrorTable() {
  const lastTableRef = useRef<TableInfo | null>(null);

  const detectTableExit = useCallback((view: EditorView) => {
    const sel = view.state.selection.main;
    const pos = sel.head;
    const result = sel.empty ? findTableInState(view.state, pos) : null;

    const prev = lastTableRef.current;
    const sameTable =
      !!prev && !!result && prev.tableStart === result.tableStart && prev.tableEnd === result.tableEnd;

    if (prev && !sameTable) {
      lastTableRef.current = null;
      // Deferred to a microtask: this callback runs inside CM6's
      // updateListener, which is still mid-way through the current
      // EditorView.update() call — dispatching synchronously from there
      // throws "Calls to EditorView.update are not allowed while an
      // update is in progress".
      queueMicrotask(() => realignExitedTable(view, prev, pos));
      return;
    }

    lastTableRef.current = result;
  }, []);

  return { onCursorActivity: detectTableExit };
}
