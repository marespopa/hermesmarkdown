"use client";

import { useCallback, useRef, useState } from "react";
import type { EditorView } from "@codemirror/view";
import { findTableAtPos, TableInfo } from "../utils/table-detection";
import {
  removeTableAction,
  cycleAlignAction,
  copyCSVAction,
  addRowAction,
  removeRowAction,
  addColumnAction,
  removeColumnAction,
  sortColumnAction,
  getCurrentAlignment,
  realignExitedTable,
} from "../codemirror/table-commands";
import type { SortDirection } from "../utils/tableSorter";

interface Pos {
  top: number;
  left: number;
}

interface UseCodeMirrorTableOptions {
  viewRef: React.RefObject<EditorView | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

const CALLOUT_WIDTH = 280;

// Step 7: the TableCallout toolbar's React-facing state. Cell nav (Tab/
// Enter/arrows) is handled entirely inside CM6's keymap (table-commands.ts)
// without touching React state — this hook only tracks which table the
// caret is in, for positioning the floating toolbar, and realigns a table's
// column widths the moment the caret leaves it (matches the old
// use-table-callout.ts's lastTableRef/realignExitedTable dance).
export function useCodeMirrorTable({ viewRef, containerRef }: UseCodeMirrorTableOptions) {
  const [tableInfo, setTableInfo] = useState<TableInfo | null>(null);
  const [calloutPos, setCalloutPos] = useState<Pos>({ top: 0, left: 0 });
  const lastTableRef = useRef<TableInfo | null>(null);

  const detectTableAtCaret = useCallback((view: EditorView) => {
    const sel = view.state.selection.main;
    const pos = sel.head;
    const result = sel.empty ? findTableAtPos(view.state.doc.toString(), pos) : null;

    const prev = lastTableRef.current;
    const sameTable =
      !!prev && !!result && prev.tableStart === result.tableStart && prev.tableEnd === result.tableEnd;

    if (prev && !sameTable) {
      lastTableRef.current = null;
      setTableInfo(null);
      // Deferred to a microtask: this callback runs inside CM6's
      // updateListener, which is still mid-way through the current
      // EditorView.update() call — dispatching synchronously from there
      // throws "Calls to EditorView.update are not allowed while an
      // update is in progress". Queuing it lets the current update cycle
      // finish first.
      queueMicrotask(() => realignExitedTable(view, prev, pos));
      return;
    }

    if (!result) {
      setTableInfo(null);
      return;
    }

    const wrapperRect = containerRef.current?.getBoundingClientRect();
    const caretCoords = view.coordsAtPos(pos);
    if (wrapperRect && caretCoords) {
      const caretTop = caretCoords.top - wrapperRect.top;
      const caretBottom = caretCoords.bottom - wrapperRect.top;
      const caretLeft = caretCoords.left - wrapperRect.left;
      const scrollTop = containerRef.current?.scrollTop ?? 0;
      // Prefer sitting just above the caret's row; if there isn't room (the
      // row is near the top of the visible/scrolled area), drop the toolbar
      // below the row instead of clamping it upward — clamping used to pin
      // the panel right on top of the row being edited, covering the caret.
      const above = caretTop - 36;
      const top = above >= scrollTop + 4 ? above : caretBottom + 8;
      setCalloutPos({
        top,
        left: Math.min(caretLeft, (containerRef.current?.clientWidth ?? 500) - CALLOUT_WIDTH),
      });
    }

    lastTableRef.current = result;
    setTableInfo(result);
  }, [containerRef]);

  const currentAlignment = tableInfo ? getCurrentAlignment(tableInfo) : "none";
  const isOnHeader = !!tableInfo && tableInfo.lineIdx === tableInfo.tableStart;
  const canRemoveRow = !!tableInfo && tableInfo.lineIdx > tableInfo.tableStart + 1;
  const cursorDataRowNumber = tableInfo && canRemoveRow ? tableInfo.lineIdx - tableInfo.tableStart - 1 : 0;
  const colCount = tableInfo
    ? Math.max(0, (tableInfo.lines[tableInfo.tableStart]?.split("|").length ?? 2) - 2)
    : 0;
  const canRemoveCol = colCount > 1;

  const withView = useCallback((fn: (view: EditorView, info: TableInfo) => void) => {
    const view = viewRef.current;
    if (!view || !tableInfo) return;
    fn(view, tableInfo);
  }, [viewRef, tableInfo]);

  const handleRemoveTable = useCallback(() => {
    withView(removeTableAction);
    setTableInfo(null);
  }, [withView]);
  const handleCycleAlign = useCallback(() => withView(cycleAlignAction), [withView]);
  const handleCopyCSV = useCallback(() => { if (tableInfo) copyCSVAction(tableInfo); }, [tableInfo]);
  const handleAddRow = useCallback(() => withView(addRowAction), [withView]);
  const handleRemoveRow = useCallback(() => withView(removeRowAction), [withView]);
  const handleAddColumn = useCallback(() => withView(addColumnAction), [withView]);
  const handleRemoveColumn = useCallback(() => withView(removeColumnAction), [withView]);
  const handleSortColumn = useCallback((direction: Exclude<SortDirection, "none">) => {
    withView((view, info) => sortColumnAction(view, info, direction));
  }, [withView]);

  return {
    tableInfo,
    setTableInfo,
    calloutPos,
    currentAlignment,
    isOnHeader,
    canRemoveRow,
    canRemoveCol,
    cursorDataRowNumber,
    handleRemoveTable,
    handleCycleAlign,
    handleCopyCSV,
    handleAddRow,
    handleRemoveRow,
    handleAddColumn,
    handleRemoveColumn,
    handleSortColumn,
    onCursorActivity: detectTableAtCaret,
  };
}
