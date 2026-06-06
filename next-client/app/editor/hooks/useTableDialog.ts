"use client";

import { useState, useCallback } from "react";
import { parseTableLenient, type TableData, type Alignment } from "../utils/tableParser";
import { serializeTable } from "../utils/tableSerializer";
import { sortRows, nextSortDirection, type SortState, type SortDirection } from "../utils/tableSorter";

type DialogMode = "create" | "edit";

interface InsertContext {
  pos: number;
  filterLen: number;
}

interface EditContext {
  tableStartOffset: number;
  tableEndOffset: number;
  cursorRow?: number;
  cursorCol?: number;
}

interface UseTableDialogProps {
  value: string;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

const DEFAULT_COLS = 3;
const DEFAULT_ROWS = 2;

function makeDefaultData(): TableData {
  return {
    headers: Array.from({ length: DEFAULT_COLS }, (_, i) => `Header ${i + 1}`),
    rows: Array.from({ length: DEFAULT_ROWS }, () => Array(DEFAULT_COLS).fill("")),
    alignments: Array(DEFAULT_COLS).fill("left") as Alignment[],
  };
}

export function useTableDialog({ value, textareaRef }: UseTableDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<DialogMode>("create");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [originalRows, setOriginalRows] = useState<string[][]>([]);
  const [alignments, setAlignments] = useState<Alignment[]>([]);
  const [sortState, setSortState] = useState<SortState | null>(null);
  const [insertCtx, setInsertCtx] = useState<InsertContext | null>(null);
  const [editCtx, setEditCtx] = useState<EditContext | null>(null);
  const [pendingRemoveCol, setPendingRemoveCol] = useState<number | null>(null);
  const [pendingRemoveRow, setPendingRemoveRow] = useState<number | null>(null);

  const resetDialog = useCallback((data: TableData) => {
    setHeaders([...data.headers]);
    const dataCopy = data.rows.map((r) => [...r]);
    setRows(dataCopy);
    setOriginalRows(dataCopy.map((r) => [...r]));
    setAlignments([...data.alignments]);
    setSortState(null);
    setPendingRemoveCol(null);
    setPendingRemoveRow(null);
  }, []);

  const openCreate = useCallback(
    (pos: number, filterLen: number) => {
      resetDialog(makeDefaultData());
      setMode("create");
      setInsertCtx({ pos, filterLen });
      setEditCtx(null);
      setIsOpen(true);
    },
    [resetDialog],
  );

  const openEdit = useCallback(
    (tableSource: string, startOffset: number, endOffset: number, cursorRow?: number, cursorCol?: number) => {
      const parsed = parseTableLenient(tableSource);
      if (!parsed) return;
      resetDialog(parsed);
      setMode("edit");
      setInsertCtx(null);
      setEditCtx({ tableStartOffset: startOffset, tableEndOffset: endOffset, cursorRow, cursorCol });
      setIsOpen(true);
    },
    [resetDialog],
  );

  const close = useCallback(() => {
    setIsOpen(false);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, [textareaRef]);

  const handleHeaderChange = useCallback((colIdx: number, val: string) => {
    setHeaders((h) => h.map((v, i) => (i === colIdx ? val : v)));
  }, []);

  const handleCellChange = useCallback((rowIdx: number, colIdx: number, val: string) => {
    const updater = (r: string[][]) =>
      r.map((row, ri) => ri === rowIdx ? row.map((c, ci) => ci === colIdx ? val : c) : row);
    setRows(updater);
    setOriginalRows(updater);
  }, []);

  const handleAlignmentChange = useCallback((colIdx: number, alignment: Alignment) => {
    setAlignments((a) => a.map((v, i) => (i === colIdx ? alignment : v)));
  }, []);

  const handleAddColumn = useCallback(() => {
    setHeaders((h) => [...h, `Header ${h.length + 1}`]);
    setRows((r) => r.map((row) => [...row, ""]));
    setOriginalRows((r) => r.map((row) => [...row, ""]));
    setAlignments((a) => [...a, "left"]);
    setSortState(null);
    setPendingRemoveCol(null);
  }, []);

  const handleAddRow = useCallback((colCount: number) => {
    const newRow = Array(colCount).fill("");
    setRows((r) => [...r, [...newRow]]);
    setOriginalRows((r) => [...r, [...newRow]]);
  }, []);

  const doRemoveColumn = useCallback((colIdx: number) => {
    const remove = <T,>(arr: T[]) => arr.filter((_, i) => i !== colIdx);
    setHeaders(remove);
    setAlignments(remove);
    setRows((r) => r.map((row) => remove(row)));
    setOriginalRows((r) => r.map((row) => remove(row)));
    setSortState(null);
    setPendingRemoveCol(null);
  }, []);

  const handleRemoveColumn = useCallback(
    (colIdx: number) => {
      const hasContent =
        headers[colIdx]?.trim() ||
        rows.some((r) => r[colIdx]?.trim());
      if (hasContent) {
        setPendingRemoveCol(colIdx);
        return;
      }
      doRemoveColumn(colIdx);
    },
    [headers, rows, doRemoveColumn],
  );

  const handleConfirmRemoveColumn = useCallback(() => {
    if (pendingRemoveCol !== null) doRemoveColumn(pendingRemoveCol);
  }, [pendingRemoveCol, doRemoveColumn]);

  const handleCancelRemoveColumn = useCallback(() => {
    setPendingRemoveCol(null);
  }, []);

  const doRemoveRow = useCallback((rowIdx: number) => {
    setRows((r) => r.filter((_, i) => i !== rowIdx));
    setOriginalRows((r) => r.filter((_, i) => i !== rowIdx));
    setPendingRemoveRow(null);
  }, []);

  const handleRemoveRow = useCallback(
    (rowIdx: number) => {
      if (rows[rowIdx]?.some((c) => c.trim())) {
        setPendingRemoveRow(rowIdx);
        return;
      }
      doRemoveRow(rowIdx);
    },
    [rows, doRemoveRow],
  );

  const handleConfirmRemoveRow = useCallback(() => {
    if (pendingRemoveRow !== null) doRemoveRow(pendingRemoveRow);
  }, [pendingRemoveRow, doRemoveRow]);

  const handleCancelRemoveRow = useCallback(() => {
    setPendingRemoveRow(null);
  }, []);

  const handleSortColumn = useCallback(
    (colIdx: number) => {
      const currentDir: SortDirection =
        sortState?.colIdx === colIdx ? sortState.direction : "none";
      const newDir = nextSortDirection(currentDir);

      if (newDir === "none") {
        setRows([...originalRows]);
        setSortState(null);
      } else {
        setRows(sortRows([...originalRows], colIdx, newDir));
        setSortState({ colIdx, direction: newDir });
      }
    },
    [sortState, originalRows],
  );

  const getMarkdownPreview = useCallback((): string => {
    return serializeTable({ headers, rows, alignments }, true);
  }, [headers, rows, alignments]);

  const handleInsert = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea || !insertCtx) return;

    const { pos, filterLen } = insertCtx;
    const markdown = getMarkdownPreview();
    const before = value.substring(0, pos - filterLen);
    const after = value.substring(pos);

    // Ensure a blank line separates the table from surrounding content
    const prefix = before.length > 0 && !before.endsWith("\n") ? "\n" : "";
    const suffix = after.length > 0 && !after.startsWith("\n") ? "\n" : "";

    const textToInsert = prefix + markdown + suffix;
    
    close();

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(pos - filterLen, pos);
      document.execCommand("insertText", false, textToInsert);

      const newPos = pos - filterLen + prefix.length + 2; // +2 puts cursor after '| '
      setTimeout(() => {
        textarea.setSelectionRange(newPos, newPos);
      }, 0);
    }, 0);
  }, [value, insertCtx, getMarkdownPreview, close, textareaRef]);

  const handleUpdate = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea || !editCtx) return;

    const markdown = getMarkdownPreview();
    const { tableStartOffset, tableEndOffset } = editCtx;
    close();

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(tableStartOffset, tableEndOffset);
      document.execCommand("insertText", false, markdown);

      setTimeout(() => {
        textarea.setSelectionRange(tableStartOffset + 2, tableStartOffset + 2); // +2 puts cursor after '| '
      }, 0);
    }, 0);
  }, [editCtx, getMarkdownPreview, close, textareaRef]);

  return {
    isOpen,
    mode,
    headers,
    rows,
    alignments,
    sortState,
    editCtx,
    pendingRemoveCol,
    pendingRemoveRow,
    openCreate,
    openEdit,
    close,
    handleHeaderChange,
    handleCellChange,
    handleAlignmentChange,
    handleAddColumn,
    handleAddRow,
    handleRemoveColumn,
    handleConfirmRemoveColumn,
    handleCancelRemoveColumn,
    handleRemoveRow,
    handleConfirmRemoveRow,
    handleCancelRemoveRow,
    handleSortColumn,
    getMarkdownPreview,
    handleInsert,
    handleUpdate,
  };
}
