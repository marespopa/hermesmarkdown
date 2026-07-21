"use client";

import { useCallback, useRef, useState } from "react";
import type { EditorView } from "@milkdown/kit/prose/view";
import type { MilkdownTableInfo } from "../milkdown/table-callout-plugin";
import {
  addRowAction,
  removeRowAction,
  addColumnAction,
  removeColumnAction,
  removeTableAction,
  copyCSVAction,
  sortColumnAction,
  cycleAlignAction,
} from "../milkdown/table-actions";
import type { SortDirection } from "../utils/tableSorter";

interface Pos {
  top: number;
  left: number;
}

interface UseMilkdownTableOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

const CALLOUT_WIDTH = 280;

// Rendered-mode counterpart to use-codemirror-table.ts, wired to the same
// TableCallout component. table-callout-plugin.ts does the ProseMirror-side
// cursor tracking (it has to — it needs the live EditorView for
// coordsAtPos); this hook just turns that into React state and floating
// toolbar positioning, and dispatches table-actions.ts transactions for
// each button.
export function useMilkdownTable({ containerRef }: UseMilkdownTableOptions) {
  const [tableInfo, setTableInfo] = useState<MilkdownTableInfo | null>(null);
  const [calloutPos, setCalloutPos] = useState<Pos>({ top: 0, left: 0 });
  const viewRef = useRef<EditorView | null>(null);

  const handleTableUpdate = useCallback((info: MilkdownTableInfo | null, view: EditorView) => {
    viewRef.current = view;
    setTableInfo(info);
    if (!info) return;

    const wrapperRect = containerRef.current?.getBoundingClientRect();
    if (!wrapperRect) return;
    const caretTop = info.caretTop - wrapperRect.top;
    const caretLeft = info.caretLeft - wrapperRect.left;
    const scrollTop = containerRef.current?.scrollTop ?? 0;
    setCalloutPos({
      top: Math.max(caretTop - 36, scrollTop + 4),
      left: Math.min(caretLeft, (containerRef.current?.clientWidth ?? 500) - CALLOUT_WIDTH),
    });
  }, [containerRef]);

  const withView = useCallback((fn: (view: EditorView) => void) => {
    const view = viewRef.current;
    if (!view) return;
    fn(view);
  }, []);

  const handleRemoveTable = useCallback(() => {
    withView(removeTableAction);
    setTableInfo(null);
  }, [withView]);
  const handleCycleAlign = useCallback(() => {
    if (!tableInfo) return;
    withView((view) => cycleAlignAction(view, tableInfo.tablePos, tableInfo.colIdx));
  }, [withView, tableInfo]);
  const handleCopyCSV = useCallback(() => {
    if (!tableInfo) return;
    withView((view) => copyCSVAction(view, tableInfo.tablePos));
  }, [withView, tableInfo]);
  const handleAddRow = useCallback(() => withView(addRowAction), [withView]);
  const handleRemoveRow = useCallback(() => withView(removeRowAction), [withView]);
  const handleAddColumn = useCallback(() => withView(addColumnAction), [withView]);
  const handleRemoveColumn = useCallback(() => withView(removeColumnAction), [withView]);
  const handleSortColumn = useCallback((direction: Exclude<SortDirection, "none">) => {
    if (!tableInfo) return;
    withView((view) => sortColumnAction(view, tableInfo.tablePos, tableInfo.colIdx, direction));
  }, [withView, tableInfo]);

  return {
    tableInfo,
    calloutPos,
    currentAlignment: tableInfo?.currentAlignment ?? "left",
    isOnHeader: !!tableInfo?.isOnHeader,
    canRemoveRow: !!tableInfo?.canRemoveRow,
    canRemoveCol: !!tableInfo?.canRemoveCol,
    cursorDataRowNumber: tableInfo?.cursorDataRowNumber ?? 0,
    handleRemoveTable,
    handleCycleAlign,
    handleCopyCSV,
    handleAddRow,
    handleRemoveRow,
    handleAddColumn,
    handleRemoveColumn,
    handleSortColumn,
    onTableCalloutUpdate: handleTableUpdate,
  };
}
