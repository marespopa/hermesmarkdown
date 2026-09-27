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
    const result = sel.empty ? findTableInState(view.state, sel.head) : null;

    const prev = lastTableRef.current;
    // Same table = same start. Row count changes (adding a row, a totals
    // row) must not look like leaving the table.
    const sameTable = !!prev && !!result && prev.tableStartOffset === result.tableStartOffset;

    if (prev && !sameTable) {
      lastTableRef.current = null;
      // Deferred to a microtask: this callback runs inside CM6's
      // updateListener, which is still mid-way through the current
      // EditorView.update() call — dispatching synchronously from there
      // throws "Calls to EditorView.update are not allowed while an
      // update is in progress".
      queueMicrotask(() => realignExitedTable(view, prev));
      return;
    }

    lastTableRef.current = result;
  }, []);

  return { onCursorActivity: detectTableExit };
}
