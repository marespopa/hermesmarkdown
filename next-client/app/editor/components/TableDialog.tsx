"use client";

import React, { useRef, useEffect, useCallback, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { IoTrashOutline, IoCalculatorOutline, IoChevronBackOutline, IoChevronForwardOutline } from "react-icons/io5";
import DialogModal from "../../components/DialogModal/DialogModal";
import Button from "../../components/Button";
import type { Alignment } from "../utils/tableParser";
import type { SortState } from "../utils/tableSorter";
import { evaluateTable, isFormulaCell, colIndexToLetter, type RangeRef } from "../utils/formula-engine";

const AC_FUNCTIONS = ["SUM", "AVERAGE", "MIN", "MAX", "COUNT", "COUNTA", "ABS", "ROUND", "IF", "AND", "OR", "NOT", "CONCAT"];

// Measures the pixel x-coordinate of the caret inside a text <input> in
// viewport space, accounting for text that has scrolled out of view.
function getCaretLeft(input: HTMLInputElement, caretPos: number): number {
  const style = window.getComputedStyle(input);
  const mirror = document.createElement("span");
  mirror.style.cssText = `position:fixed;visibility:hidden;white-space:pre;font:${style.font};letter-spacing:${style.letterSpacing};`;
  mirror.textContent = input.value.slice(0, caretPos);
  document.body.appendChild(mirror);
  const textWidth = mirror.getBoundingClientRect().width;
  document.body.removeChild(mirror);
  const rect = input.getBoundingClientRect();
  const paddingLeft = parseFloat(style.paddingLeft) || 0;
  const x = rect.left + paddingLeft + textWidth - input.scrollLeft;
  return Math.min(Math.max(x, rect.left), rect.right);
}

// Returns the function name being typed at the caret, or null if not in a
// function-name position. Matches letters immediately after = or an operator/paren.
function detectFnAtCaret(value: string, caretPos: number): { query: string; start: number } | null {
  if (!value.startsWith("=") || caretPos < 1) return null;
  const before = value.slice(0, caretPos);
  const m = /(?:^=|[+\-*/,(])([A-Za-z]*)$/.exec(before);
  if (!m) return null;
  const query = m[1];
  const afterEquals = m[0].startsWith("=");
  if (query.length === 0 && !afterEquals) return null;
  return { query: query.toUpperCase(), start: caretPos - query.length };
}

// Plain text ("+ Above" etc.) instead of directional arrow icons — arrows
// read as cursor movement, not as an insert action.
function ToolbarButton({
  children,
  label,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <Button
      variant="bare"
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`
        h-9 sm:h-7 px-3 sm:px-2.5 flex items-center justify-center gap-1 rounded-lg text-ui-micro font-medium no-underline
        text-ink-muted dark:text-stone hover:bg-paper-softgray dark:hover:bg-paper-dark-surface
        ${danger ? "hover:text-red-500 dark:hover:text-red-400" : "hover:text-ink-light dark:hover:text-ink-dark"}
        disabled:opacity-30 disabled:pointer-events-none transition-colors
      `}
    >
      {children}
    </Button>
  );
}

function ToolbarConfirmRemove({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="flex items-center gap-1.5 text-ui-micro text-amber-700 dark:text-amber-400 px-1.5">
      <span>Has content.</span>
      <Button variant="bare" onClick={onConfirm} className="underline hover:text-red-600 transition-colors">Remove</Button>
      <Button variant="bare" onClick={onCancel} className="underline hover:text-ink-muted transition-colors">Cancel</Button>
    </div>
  );
}

type DialogMode = "create" | "edit";

interface TableDialogProps {
  isOpen: boolean;
  mode: DialogMode;
  headers: string[];
  rows: string[][];
  alignments: Alignment[];
  sortState: SortState | null;
  pendingRemoveCol: number | null;
  pendingRemoveRow: number | null;
  markdownPreview: string;
  onHeaderChange: (colIdx: number, val: string) => void;
  onCellChange: (rowIdx: number, colIdx: number, val: string) => void;
  onAlignmentChange: (colIdx: number, alignment: Alignment) => void;
  onSortColumn: (colIdx: number) => void;
  onAddColumn: (atIndex?: number) => void;
  onRemoveColumn: (colIdx: number) => void;
  onConfirmRemoveColumn: () => void;
  onCancelRemoveColumn: () => void;
  onAddRow: (atIndex?: number) => void;
  onRemoveRow: (rowIdx: number) => void;
  onConfirmRemoveRow: () => void;
  onCancelRemoveRow: () => void;
  onInsert: () => void;
  onUpdate: () => void;
  onClose: () => void;
  focusRow?: number;
  focusCol?: number;
}

const ALIGN_LABELS: Record<Alignment, string> = { left: "Left", center: "Center", right: "Right" };

interface FocusedCell {
  rowIdx: number; // -1 = header
  colIdx: number;
}

export function TableDialog({
  isOpen,
  mode,
  headers,
  rows,
  alignments,
  sortState,
  pendingRemoveCol,
  pendingRemoveRow,
  markdownPreview,
  onHeaderChange,
  onCellChange,
  onAlignmentChange,
  onSortColumn,
  onAddColumn,
  onRemoveColumn,
  onConfirmRemoveColumn,
  onCancelRemoveColumn,
  onAddRow,
  onRemoveRow,
  onConfirmRemoveRow,
  onCancelRemoveRow,
  onInsert,
  onUpdate,
  onClose,
  focusRow,
  focusCol,
}: TableDialogProps) {
  const firstInputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const colCount = headers.length;
  const [focusedCell, setFocusedCell] = useState<FocusedCell>({ rowIdx: -1, colIdx: 0 });
  // null = navigation mode (cell selected but not editable); set = the cell
  // currently rendering an <input> for text entry. Single click only selects;
  // double-click (or Enter/F2 from the keyboard) is what opens a cell for edits.
  const [editingCell, setEditingCell] = useState<FocusedCell | null>(null);
  // The fixed corner of an in-progress Shift+Click/Shift+Arrow range
  // selection — null means "just the single focused cell" (no range).
  // The other corner is always the current focusedCell.
  const [selectionAnchor, setSelectionAnchor] = useState<FocusedCell | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Formula autocomplete: which cell is showing the popup and what's typed so far.
  const [acState, setAcState] = useState<{
    rowIdx: number; colIdx: number; query: string; start: number; end: number;
    x: number; top: number; bottom: number; // viewport-space anchor (input top/bottom + caret x)
  } | null>(null);
  const [acActiveIdx, setAcActiveIdx] = useState(0);

  const getCellEl = <T extends HTMLElement = HTMLElement>(selector: string) =>
    document.querySelector<T>(selector);

  const navSelector = (rowIdx: number, colIdx: number) =>
    rowIdx === -1 ? `[data-hcell-nav="${colIdx}"]` : `[data-dcell-nav="${rowIdx}-${colIdx}"]`;
  const inputSelector = (rowIdx: number, colIdx: number) =>
    rowIdx === -1 ? `[data-hcell="${colIdx}"]` : `[data-dcell="${rowIdx}-${colIdx}"]`;

  const focusNavCell = useCallback((rowIdx: number, colIdx: number) => {
    setEditingCell(null);
    setFocusedCell({ rowIdx, colIdx });
    setTimeout(() => getCellEl(navSelector(rowIdx, colIdx))?.focus(), 0);
  }, []);

  // Opens a cell for editing and moves DOM focus to its <input> once it mounts.
  const startEditingCell = useCallback((rowIdx: number, colIdx: number) => {
    setSelectionAnchor(null);
    setFocusedCell({ rowIdx, colIdx });
    setEditingCell({ rowIdx, colIdx });
    setTimeout(() => getCellEl(inputSelector(rowIdx, colIdx))?.focus(), 0);
  }, []);

  // True for every cell inside the rectangle spanning selectionAnchor and
  // focusedCell (or just the focused cell itself when there's no anchor).
  const isCellSelected = useCallback(
    (rowIdx: number, colIdx: number) => {
      if (!selectionAnchor) return rowIdx === focusedCell.rowIdx && colIdx === focusedCell.colIdx;
      const r0 = Math.min(selectionAnchor.rowIdx, focusedCell.rowIdx);
      const r1 = Math.max(selectionAnchor.rowIdx, focusedCell.rowIdx);
      const c0 = Math.min(selectionAnchor.colIdx, focusedCell.colIdx);
      const c1 = Math.max(selectionAnchor.colIdx, focusedCell.colIdx);
      return rowIdx >= r0 && rowIdx <= r1 && colIdx >= c0 && colIdx <= c1;
    },
    [selectionAnchor, focusedCell],
  );

  // Click/arrow-key selection helper: shift extends the range from the cell
  // that was focused before this move; anything else collapses it back to a
  // single cell.
  const updateSelectionAnchor = useCallback(
    (shiftKey: boolean, fromCell: FocusedCell) => {
      if (shiftKey) {
        setSelectionAnchor((prev) => prev ?? fromCell);
      } else {
        setSelectionAnchor(null);
      }
    },
    [],
  );

  // --- Excel/Sheets-style "point mode" ------------------------------------
  // While editing a formula cell, clicking (or shift-clicking, for a range)
  // any other cell inserts its A1 reference at the caret instead of moving
  // focus there — the formula input stays focused and editable throughout.
  const a1RowOf = (rowIdx: number) => (rowIdx === -1 ? 1 : rowIdx + 2);

  const editingCellValue =
    editingCell === null
      ? null
      : editingCell.rowIdx === -1
        ? headers[editingCell.colIdx]
        : rows[editingCell.rowIdx]?.[editingCell.colIdx] ?? "";
  const isPointMode = editingCellValue !== null && isFormulaCell(editingCellValue);

  // The point-mode anchor (first corner of the range being built) and the
  // exact char span in the formula text the last-inserted reference
  // occupies — so a follow-up Shift+click replaces it with a wider range
  // instead of appending a second reference. Cleared whenever editing
  // starts/stops, or the user types anything themselves (see the editing
  // <input>'s onChange below).
  const [pointAnchor, setPointAnchor] = useState<{ row: number; col: number } | null>(null);
  const [pointSpan, setPointSpan] = useState<{ start: number; end: number } | null>(null);
  const [pointRange, setPointRange] = useState<RangeRef | null>(null);

  useEffect(() => {
    setPointAnchor(null);
    setPointSpan(null);
    setPointRange(null);
  }, [editingCell]);

  const isPointSelected = useCallback(
    (rowIdx: number, colIdx: number) => {
      if (!pointRange) return false;
      const r = a1RowOf(rowIdx);
      return r >= pointRange.startRow && r <= pointRange.endRow && colIdx >= pointRange.startCol && colIdx <= pointRange.endCol;
    },
    [pointRange],
  );

  const insertPointReference = useCallback(
    (range: RangeRef, anchor: { row: number; col: number }) => {
      if (!editingCell) return;
      const refText =
        range.startRow === range.endRow && range.startCol === range.endCol
          ? `${colIndexToLetter(range.startCol)}${range.startRow}`
          : `${colIndexToLetter(range.startCol)}${range.startRow}:${colIndexToLetter(range.endCol)}${range.endRow}`;

      const currentValue =
        editingCell.rowIdx === -1 ? headers[editingCell.colIdx] : rows[editingCell.rowIdx]?.[editingCell.colIdx] ?? "";
      const input = getCellEl<HTMLInputElement>(inputSelector(editingCell.rowIdx, editingCell.colIdx));
      const fallbackPos = input?.selectionStart ?? currentValue.length;
      const start = pointSpan?.start ?? fallbackPos;
      const end = pointSpan?.end ?? fallbackPos;
      const newValue = currentValue.slice(0, start) + refText + currentValue.slice(end);

      if (editingCell.rowIdx === -1) onHeaderChange(editingCell.colIdx, newValue);
      else onCellChange(editingCell.rowIdx, editingCell.colIdx, newValue);

      const caret = start + refText.length;
      setPointAnchor(anchor);
      setPointSpan({ start, end: caret });
      setPointRange(range);
      setTimeout(() => {
        const el = getCellEl<HTMLInputElement>(inputSelector(editingCell.rowIdx, editingCell.colIdx));
        el?.focus();
        el?.setSelectionRange(caret, caret);
      }, 0);
    },
    [editingCell, headers, rows, pointSpan, onHeaderChange, onCellChange],
  );

  // Click handler for a single cell/header nav target while point mode is
  // active — builds (or extends, with Shift) the reference rectangle.
  const handlePointClick = useCallback(
    (rowIdx: number, colIdx: number, shiftKey: boolean) => {
      const targetRow = a1RowOf(rowIdx);
      if (shiftKey && pointAnchor) {
        insertPointReference(
          {
            startRow: Math.min(pointAnchor.row, targetRow),
            endRow: Math.max(pointAnchor.row, targetRow),
            startCol: Math.min(pointAnchor.col, colIdx),
            endCol: Math.max(pointAnchor.col, colIdx),
          },
          pointAnchor,
        );
      } else {
        insertPointReference(
          { startRow: targetRow, endRow: targetRow, startCol: colIdx, endCol: colIdx },
          { row: targetRow, col: colIdx },
        );
      }
    },
    [pointAnchor, insertPointReference],
  );

  // Clicking a column letter inserts (or extends) a reference to that whole
  // column's data range — e.g. clicking "B" with 5 rows inserts B2:B6.
  const handlePointColumnClick = useCallback(
    (colIdx: number, shiftKey: boolean) => {
      const lastRow = rows.length > 0 ? rows.length + 1 : 2;
      if (shiftKey && pointAnchor) {
        insertPointReference(
          {
            startRow: Math.min(pointAnchor.row, 2),
            endRow: Math.max(pointAnchor.row, lastRow),
            startCol: Math.min(pointAnchor.col, colIdx),
            endCol: Math.max(pointAnchor.col, colIdx),
          },
          pointAnchor,
        );
      } else {
        insertPointReference({ startRow: 2, endRow: lastRow, startCol: colIdx, endCol: colIdx }, { row: 2, col: colIdx });
      }
    },
    [pointAnchor, insertPointReference, rows.length],
  );

  // Dragging a native scrollbar thumb is wildly inconsistent across OSes
  // (hidden/overlay on macOS, absent on touch) — explicit arrow buttons give
  // every platform the same reliable way to pan a wide table.
  const updateScrollButtons = useCallback(() => {
    const el = gridRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    const t = setTimeout(updateScrollButtons, 50);
    return () => clearTimeout(t);
  }, [headers.length, rows.length, isOpen, updateScrollButtons]);

  const scrollGridBy = useCallback((delta: number) => {
    gridRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => {
        let targetRow = -1;
        let targetCol = 0;
        if (focusRow !== undefined && focusCol !== undefined) {
          // findTableAtPos's cursorRow is 0-indexed where 0 = header, 1 = separator,
          // 2 = first data row. The dialog indexes headers as -1, data rows as 0...n.
          targetRow = focusRow === 0 ? -1 : focusRow - 2;
          targetCol = focusCol;
          // Arrived here via a click inside an existing table in the source
          // textarea — the user already expressed intent to edit, so skip
          // the navigation step and open the cell directly.
          setFocusedCell({ rowIdx: targetRow, colIdx: targetCol });
          setEditingCell({ rowIdx: targetRow, colIdx: targetCol });
          setTimeout(() => getCellEl(inputSelector(targetRow, targetCol))?.focus(), 0);
        } else {
          setFocusedCell({ rowIdx: targetRow, colIdx: targetCol });
          setEditingCell(null);
          (getCellEl(navSelector(targetRow, targetCol)) || firstInputRef.current)?.focus();
        }
      }, 120);
      return () => clearTimeout(t);
    }
  }, [isOpen, focusRow, focusCol]);

  // Move the selection by (dRow, dCol) from a cell, clamped to the grid —
  // used by arrow keys in navigation mode. Header is row -1.
  const clampedMove = useCallback(
    (rowIdx: number, colIdx: number, dRow: number, dCol: number) => {
      const clampRow = (r: number) => Math.max(-1, Math.min(rows.length - 1, r));
      if (dCol !== 0) {
        let newCol = colIdx + dCol;
        let newRow = rowIdx;
        if (newCol < 0) { newCol = colCount - 1; newRow -= 1; }
        else if (newCol >= colCount) { newCol = 0; newRow += 1; }
        return { rowIdx: clampRow(newRow), colIdx: newCol };
      }
      return { rowIdx: clampRow(rowIdx + dRow), colIdx };
    },
    [colCount, rows.length],
  );

  // Tab/Shift+Tab: advance to the next/previous cell, wrapping rows and
  // growing the table with a new row when tabbing past the last cell.
  const tabTarget = useCallback(
    (rowIdx: number, colIdx: number, shiftKey: boolean): FocusedCell | "grow" => {
      const isHeader = rowIdx < 0;
      const lastCol = colIdx === colCount - 1;
      const lastRow = rowIdx === rows.length - 1;

      if (!shiftKey) {
        if (!lastCol) return { rowIdx, colIdx: colIdx + 1 };
        if (isHeader) return { rowIdx: 0, colIdx: 0 };
        if (!lastRow) return { rowIdx: rowIdx + 1, colIdx: 0 };
        return "grow";
      }
      if (colIdx > 0) return { rowIdx, colIdx: colIdx - 1 };
      if (isHeader) return { rowIdx: rows.length - 1, colIdx: colCount - 1 };
      if (rowIdx === 0) return { rowIdx: -1, colIdx: colCount - 1 };
      return { rowIdx: rowIdx - 1, colIdx: colCount - 1 };
    },
    [colCount, rows.length],
  );

  // Keydown while a cell is selected but not editing: arrows move the
  // selection, Enter/F2 opens the cell, Tab/Shift+Tab move (and can grow
  // the table), double-click is handled separately via onDoubleClick.
  const handleNavKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>, rowIdx: number, colIdx: number) => {
      if (e.key === "Enter" || e.key === "F2") {
        e.preventDefault();
        startEditingCell(rowIdx, colIdx);
        return;
      }
      if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const d = clampedMove(
          rowIdx,
          colIdx,
          e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0,
          e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0,
        );
        updateSelectionAnchor(e.shiftKey, { rowIdx, colIdx });
        focusNavCell(d.rowIdx, d.colIdx);
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        setSelectionAnchor(null);
        const target = tabTarget(rowIdx, colIdx, e.shiftKey);
        if (target === "grow") {
          onAddRow();
          setTimeout(() => focusNavCell(rows.length, 0), 40);
        } else {
          focusNavCell(target.rowIdx, target.colIdx);
        }
      }
    },
    [clampedMove, tabTarget, focusNavCell, startEditingCell, updateSelectionAnchor, onAddRow, rows.length],
  );

  // Keydown while a cell's <input> is focused and editable: Escape returns
  // to navigation on the same cell; Tab/Shift+Tab commit and jump straight
  // into editing the next cell (keeps fast spreadsheet-style data entry).
  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, rowIdx: number, colIdx: number) => {
      // Formula autocomplete navigation takes priority when the popup is open.
      if (acState && acState.rowIdx === rowIdx && acState.colIdx === colIdx) {
        const filtered = AC_FUNCTIONS.filter((fn) => fn.startsWith(acState.query));
        if (e.key === "ArrowDown") { e.preventDefault(); setAcActiveIdx((i) => Math.min(i + 1, filtered.length - 1)); return; }
        if (e.key === "ArrowUp") { e.preventDefault(); setAcActiveIdx((i) => Math.max(i - 1, 0)); return; }
        if (e.key === "Enter" && filtered.length > 0) { e.preventDefault(); e.stopPropagation(); insertAcFunction(filtered[acActiveIdx] ?? filtered[0], rowIdx, colIdx); return; }
        if (e.key === "Escape") { e.preventDefault(); setAcState(null); return; }
      }

      if (e.key === "Enter") {
        e.stopPropagation();
        e.preventDefault();
        focusNavCell(rowIdx, colIdx);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        focusNavCell(rowIdx, colIdx);
        return;
      }
      if (e.key !== "Tab") return;

      e.preventDefault();
      const target = tabTarget(rowIdx, colIdx, e.shiftKey);
      if (target === "grow") {
        onAddRow();
        setTimeout(() => startEditingCell(rows.length, 0), 40);
      } else {
        startEditingCell(target.rowIdx, target.colIdx);
      }
    },
    [tabTarget, onAddRow, rows.length, startEditingCell],
  );

  const title = mode === "create" ? "Insert Table" : "Edit Table";
  const confirmLabel = mode === "create" ? "Insert Table" : "Update Table";
  const onConfirm = mode === "create" ? onInsert : onUpdate;

  const isHeaderFocused = focusedCell.rowIdx === -1;
  const focusedCol = focusedCell.colIdx;

  const handleAddFormulaRow = useCallback(() => {
    const newRowIdx = rows.length;
    const colLetter = colIndexToLetter(focusedCol);
    const formula = rows.length > 0 ? `=SUM(${colLetter})` : "=0";
    onAddRow();
    setTimeout(() => onCellChange(newRowIdx, focusedCol, formula), 50);
  }, [rows.length, onAddRow, onCellChange, focusedCol]);

  const insertAcFunction = useCallback((fnName: string, rowIdx: number, colIdx: number) => {
    if (!acState) return;
    const currentValue = rowIdx === -1 ? headers[colIdx] : rows[rowIdx]?.[colIdx] ?? "";
    const newValue = currentValue.slice(0, acState.start) + fnName + "(" + currentValue.slice(acState.end);
    if (rowIdx === -1) onHeaderChange(colIdx, newValue);
    else onCellChange(rowIdx, colIdx, newValue);
    setAcState(null);
    const caretPos = acState.start + fnName.length + 1;
    setTimeout(() => {
      const el = getCellEl<HTMLInputElement>(inputSelector(rowIdx, colIdx));
      el?.focus();
      el?.setSelectionRange(caretPos, caretPos);
    }, 0);
  }, [acState, headers, rows, onHeaderChange, onCellChange]);

  // Recomputed whenever the grid's own data changes — table sizes here are
  // small (tens of cells), so a full recompute per render is cheap and
  // avoids needing an incremental dependency graph.
  const formulaResults = useMemo(
    () => evaluateTable({ headers, rows, alignments }),
    [headers, rows, alignments],
  );

  return (
    <DialogModal
      isOpened={isOpen}
      onClose={onClose}
      styles="w-full !max-w-5xl"
      ariaLabelledBy="td-title"
      mobileSheet
    >
      <div className="flex flex-col gap-3 min-h-0">
        <h2
          id="td-title"
          className="text-ui-body font-semibold text-ink-light dark:text-ink-dark pr-8"
        >
          {title}
        </h2>

        {/* Scrollable cell grid — sticky header keeps sort/align controls
            reachable while scrolling rows; the scrollbar is forced on
            (overflow-scroll, not auto) and styled with strong contrast, plus
            explicit chevron buttons, since dragging a native scrollbar thumb
            is wildly inconsistent across OSes (hidden/overlay on macOS,
            absent on touch). Row/column insert & remove live in the toolbar
            below, not inline, so they can't be hit accidentally while
            scrolling. Square corners (no rounding) so the table's own cell
            borders never look clipped. */}
        <div className="relative border border-edge overflow-hidden">
          <div
            ref={gridRef}
            onScroll={updateScrollButtons}
            className="overflow-scroll max-h-[50vh]
              [&::-webkit-scrollbar]:h-3.5 [&::-webkit-scrollbar]:w-3.5
              [&::-webkit-scrollbar-thumb]:bg-stone/70 [&::-webkit-scrollbar-thumb]:rounded-full
              [&::-webkit-scrollbar-track]:bg-paper-softgray dark:[&::-webkit-scrollbar-track]:bg-paper-dark-surface/40"
          >
          <table className="border-collapse w-max min-w-full text-left">
            <thead className="sticky top-0 z-10">
              {/* A1-style column letters — normally just informational, so
                  formulas like =SUM(B2:D2) can be read off the grid like a
                  spreadsheet. While editing a formula (point mode), these
                  become clickable: click inserts that whole column's data
                  range, Shift+click extends to a multi-column range. The
                  blank corner cell lines up with the row-number gutter below. */}
              <tr>
                <th className="sticky left-0 z-30 border border-edge p-0 w-9 bg-paper-softgray dark:bg-paper-dark-surface" />
                {headers.map((_, ci) => {
                  const isColSelected = isPointSelected(0, ci) || isPointSelected(-1, ci);
                  return (
                    <th
                      key={ci}
                      onMouseDown={isPointMode ? (e) => e.preventDefault() : undefined}
                      onClick={isPointMode ? (e) => handlePointColumnClick(ci, e.shiftKey) : undefined}
                      className={`
                        border border-edge p-0 transition-colors
                        ${isPointMode ? "cursor-pointer hover:bg-sage/20 dark:hover:bg-sage/10" : ""}
                        ${isColSelected
                          ? "ring-2 ring-inset ring-indigo-400 dark:ring-indigo-400 bg-indigo-50 dark:bg-indigo-500/10"
                          : "bg-paper-softgray dark:bg-paper-dark-surface"}
                      `}
                    >
                      <div className="px-2 py-0.5 text-ui-micro font-mono text-stone text-center select-none">
                        {colIndexToLetter(ci)}
                      </div>
                    </th>
                  );
                })}
              </tr>
              <tr>
                {/* Row-number gutter — row 1 is always the header, so formula
                    ranges like B2:D2 read off the same numbers visible here. */}
                <th
                  aria-hidden="true"
                  className="sticky left-0 z-20 border border-edge p-0 w-9 bg-paper-softgray dark:bg-paper-dark-surface"
                >
                  <div className="px-1 py-0.5 text-ui-micro font-mono text-stone text-center select-none">1</div>
                </th>
                {headers.map((header, ci) => {
                  const isSorted = sortState?.colIdx === ci;
                  const sortDir = isSorted ? sortState!.direction : null;
                  const isHeaderCellFocused = isHeaderFocused && focusedCol === ci;
                  const isHeaderCellSelected = isCellSelected(-1, ci);
                  const isHeaderPointSelected = isPointSelected(-1, ci);

                  return (
                    <th
                      key={ci}
                      aria-sort={
                        isSorted
                          ? sortDir === "asc" ? "ascending" : "descending"
                          : "none"
                      }
                      className={`
                        group relative border border-edge p-0 min-w-[130px] align-top
                        transition-colors duration-150
                        ${isHeaderCellFocused ? "ring-2 ring-inset ring-sage z-10" : ""}
                        ${isHeaderPointSelected
                          ? "ring-2 ring-inset ring-indigo-400 bg-indigo-50 dark:bg-indigo-500/10"
                          : isHeaderCellSelected
                            ? "bg-sage/10 dark:bg-sage/15"
                            : isSorted
                              ? "bg-sage/10 dark:bg-sage/5"
                              : "bg-paper-softgray dark:bg-paper-dark-surface/60"}
                      `}
                    >
                      <div className="flex flex-col">
                        {/* Header cell — sort chevron lives here; insert/remove are in the toolbar below */}
                        <div className="flex items-center gap-0 pl-2 pr-0.5 pt-1.5 pb-0.5">
                          {editingCell?.rowIdx === -1 && editingCell.colIdx === ci ? (
                            <input
                              ref={ci === 0 ? firstInputRef : undefined}
                              data-hcell={ci}
                              type="text"
                              autoFocus
                              value={header}
                              onChange={(e) => {
                                setPointAnchor(null);
                                setPointSpan(null);
                                setPointRange(null);
                                onHeaderChange(ci, e.target.value);
                              }}
                              onKeyDown={(e) => handleEditKeyDown(e, -1, ci)}
                              onBlur={() => setEditingCell(null)}
                              placeholder={`Header ${ci + 1}`}
                              className={`
                                flex-1 min-w-0 bg-transparent text-ui-footnote font-semibold tabular-nums
                                focus:outline-none placeholder:text-zinc-300 dark:placeholder:text-zinc-600
                                ${isSorted
                                  ? "text-sage dark:text-sage"
                                  : "text-ink-light dark:text-ink-dark"}
                              `}
                            />
                          ) : (
                            <div
                              data-hcell-nav={ci}
                              tabIndex={0}
                              role="gridcell"
                              onMouseDown={isPointMode ? (e) => e.preventDefault() : undefined}
                              onClick={(e) => {
                                if (isPointMode) {
                                  handlePointClick(-1, ci, e.shiftKey);
                                  return;
                                }
                                updateSelectionAnchor(e.shiftKey, focusedCell);
                                setFocusedCell({ rowIdx: -1, colIdx: ci });
                              }}
                              onDoubleClick={() => startEditingCell(-1, ci)}
                              onKeyDown={(e) => handleNavKeyDown(e, -1, ci)}
                              className={`
                                flex-1 min-w-0 text-ui-footnote font-semibold tabular-nums cursor-default
                                focus:outline-none truncate
                                ${header ? "" : "text-zinc-300 dark:text-zinc-600"}
                                ${isSorted
                                  ? "text-sage dark:text-sage"
                                  : "text-ink-light dark:text-ink-dark"}
                              `}
                            >
                              {header || `Header ${ci + 1}`}
                            </div>
                          )}

                          {/* Sort chevron — invisible until hover or sorted */}
                          <Button
                            variant="bare"
                            type="button"
                            onClick={() => onSortColumn(ci)}
                            aria-label={
                              isSorted
                                ? `Sorted ${sortDir}ending — click to change`
                                : "Sort by this column"
                            }
                            title={
                              isSorted
                                ? `Sorted ${sortDir}ending — click to change`
                                : "Sort ascending"
                            }
                            className={`
                              flex-shrink-0 w-8 h-8 sm:w-6 sm:h-6 flex items-center justify-center rounded
                              text-[11px] leading-none transition-all duration-150
                              ${isSorted
                                ? "text-sage dark:text-sage opacity-100"
                                : "text-stone opacity-40 sm:opacity-0 sm:group-hover:opacity-40 hover:!opacity-100 focus-within:opacity-40 hover:text-ink-light dark:hover:text-ink-dark"}
                            `}
                          >
                            {sortDir === "desc" ? "↓" : "↑"}
                          </Button>
                        </div>

                        {/* Alignment — a quiet dropdown rather than a row of
                            buttons, so it doesn't compete for attention with
                            the header text. Stays faint until changed from
                            the default or hovered/focused. */}
                        <select
                          value={alignments[ci]}
                          onChange={(e) => onAlignmentChange(ci, e.target.value as Alignment)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label="Column alignment"
                          title={`Align: ${alignments[ci]}`}
                          className={`
                            w-full border-t border-edge bg-transparent text-ui-micro text-center
                            py-0.5 cursor-pointer transition-opacity focus:outline-none
                            ${alignments[ci] === "left"
                              ? "text-stone opacity-30 hover:opacity-80 focus:opacity-100"
                              : "text-sage dark:text-sage opacity-70 hover:opacity-100 focus:opacity-100 font-medium"}
                          `}
                        >
                          {(["left", "center", "right"] as Alignment[]).map((a) => (
                            <option key={a} value={a}>
                              {ALIGN_LABELS[a]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {rows.map((row, ri) => {
                const isFocusedRow = focusedCell.rowIdx === ri;
                const rowBg = ri % 2 === 1 ? "bg-paper-softgray/50 dark:bg-paper-dark-surface/20" : "";
                return (
                  <tr key={ri} className={`${rowBg} transition-colors`}>
                    <td
                      aria-hidden="true"
                      className="sticky left-0 z-20 border border-zinc-200 dark:border-zinc-700 p-0 w-9 bg-paper-softgray dark:bg-paper-dark-surface"
                    >
                      <div className="px-1 py-1.5 text-ui-micro font-mono text-stone text-center select-none">
                        {ri + 2}
                      </div>
                    </td>
                    {row.map((cell, ci) => {
                      const isSortedCol = sortState?.colIdx === ci;
                      const isFocusedCell = isFocusedRow && focusedCol === ci;
                      const isEditingCell = editingCell?.rowIdx === ri && editingCell.colIdx === ci;
                      const isFormula = isFormulaCell(cell);
                      const formulaResult = isFormula ? formulaResults.get(`${ri + 2}_${ci}`) : undefined;
                      const isFormulaError = !!formulaResult?.display.startsWith("#");
                      const isCellInSelection = isCellSelected(ri, ci);
                      const isCellPointSelected = isPointSelected(ri, ci);
                      const handleCellClick = (e: React.MouseEvent) => {
                        if (isPointMode && !isEditingCell) {
                          handlePointClick(ri, ci, e.shiftKey);
                          return;
                        }
                        updateSelectionAnchor(e.shiftKey, focusedCell);
                        setFocusedCell({ rowIdx: ri, colIdx: ci });
                      };
                      return (
                        <td
                          key={ci}
                          className={`
                            relative border border-zinc-200 dark:border-zinc-700 p-0 transition-colors
                            ${isFocusedCell ? "ring-2 ring-inset ring-sage z-10" : ""}
                            ${isCellPointSelected
                              ? "ring-2 ring-inset ring-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 z-10"
                              : isFocusedCell || isCellInSelection
                                ? "bg-sage/10 dark:bg-sage/15"
                                : isSortedCol
                                  ? "bg-sage/5 dark:bg-sage/5"
                                  : ""}
                            ${isFormula ? "bg-paper-softgray/30 dark:bg-paper-dark-surface/20" : ""}
                          `}
                        >
                          {isFormula && !isEditingCell ? (
                            <div
                              className={`
                                w-full px-2 py-1.5 text-ui-footnote tabular-nums cursor-default
                                ${isFormulaError ? "text-red-600 dark:text-red-400" : "text-ink-light dark:text-ink-dark"}
                              `}
                              style={{ textAlign: alignments[ci] }}
                              tabIndex={0}
                              role="gridcell"
                              onMouseDown={isPointMode ? (e) => e.preventDefault() : undefined}
                              onClick={handleCellClick}
                              onDoubleClick={() => startEditingCell(ri, ci)}
                              onKeyDown={(e) => handleNavKeyDown(e, ri, ci)}
                            >
                              {formulaResult?.display ?? ""}
                            </div>
                          ) : isEditingCell ? (
                            <input
                              data-dcell={`${ri}-${ci}`}
                              type="text"
                              autoFocus
                              value={cell}
                              onChange={(e) => {
                                setPointAnchor(null);
                                setPointSpan(null);
                                setPointRange(null);
                                onCellChange(ri, ci, e.target.value);
                                const pos = e.target.selectionStart ?? e.target.value.length;
                                const det = detectFnAtCaret(e.target.value, pos);
                                if (det) {
                                  const r = e.target.getBoundingClientRect();
                                  setAcState({ rowIdx: ri, colIdx: ci, query: det.query, start: det.start, end: pos, x: getCaretLeft(e.target, pos), top: r.top, bottom: r.bottom });
                                  setAcActiveIdx(0);
                                } else {
                                  setAcState(null);
                                }
                              }}
                              onKeyDown={(e) => handleEditKeyDown(e, ri, ci)}
                              onBlur={() => { setEditingCell(null); setAcState(null); }}
                              placeholder="…"
                              style={{ textAlign: alignments[ci] }}
                              className="w-full px-2 py-1.5 bg-transparent text-ui-footnote tabular-nums text-ink-light dark:text-ink-dark focus:outline-none placeholder:text-beige dark:placeholder:text-fg-faint"
                            />
                          ) : (
                            <div
                              data-dcell-nav={`${ri}-${ci}`}
                              tabIndex={0}
                              role="gridcell"
                              onMouseDown={isPointMode ? (e) => e.preventDefault() : undefined}
                              onClick={handleCellClick}
                              onDoubleClick={() => startEditingCell(ri, ci)}
                              onKeyDown={(e) => handleNavKeyDown(e, ri, ci)}
                              style={{ textAlign: alignments[ci] }}
                              className={`
                                w-full min-h-[2.125rem] px-2 py-1.5 text-ui-footnote tabular-nums cursor-default
                                focus:outline-none truncate
                                ${cell ? "text-ink-light dark:text-ink-dark" : "text-beige dark:text-fg-faint"}
                              `}
                            >
                              {cell || "…"}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>

          {canScrollLeft && (
            <Button
              variant="icon"
              type="button"
              onClick={() => scrollGridBy(-280)}
              aria-label="Scroll table left"
              title="Scroll left"
              className="absolute left-1.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 bg-white/95 dark:bg-neutral-800/95 shadow-md border border-edge"
            >
              <IoChevronBackOutline />
            </Button>
          )}
          {canScrollRight && (
            <Button
              variant="icon"
              type="button"
              onClick={() => scrollGridBy(280)}
              aria-label="Scroll table right"
              title="Scroll right"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 bg-white/95 dark:bg-neutral-800/95 shadow-md border border-edge"
            >
              <IoChevronForwardOutline />
            </Button>
          )}
        </div>

        {/* Row/column toolbar — acts on whichever cell is focused, kept
            outside the scroll area so it's reachable and can't be triggered
            by accident while scrolling a wide/tall table. Two clearly
            separated segmented groups, uniform icon buttons. */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-xl border border-edge bg-paper-light dark:bg-paper-dark-surface/40 px-1.5 py-1">
            <span className="text-ui-micro font-medium text-stone px-1.5 select-none">Row</span>
            {pendingRemoveRow !== null ? (
              <ToolbarConfirmRemove onConfirm={onConfirmRemoveRow} onCancel={onCancelRemoveRow} />
            ) : (
              <>
                <ToolbarButton
                  label="Insert row above the focused cell"
                  disabled={isHeaderFocused}
                  onClick={() => onAddRow(focusedCell.rowIdx)}
                >
                  + Above
                </ToolbarButton>
                <ToolbarButton
                  label="Insert row below the focused cell"
                  onClick={() => onAddRow(isHeaderFocused ? 0 : focusedCell.rowIdx + 1)}
                >
                  + Below
                </ToolbarButton>
                <ToolbarButton
                  label="Remove focused row"
                  disabled={isHeaderFocused}
                  danger
                  onClick={() => onRemoveRow(focusedCell.rowIdx)}
                >
                  <IoTrashOutline />
                </ToolbarButton>
              </>
            )}
          </div>

          <div className="flex items-center gap-0.5 rounded-xl border border-edge bg-paper-light dark:bg-paper-dark-surface/40 px-1.5 py-1">
            <span className="text-ui-micro font-medium text-stone px-1.5 select-none">Column</span>
            {pendingRemoveCol !== null ? (
              <ToolbarConfirmRemove onConfirm={onConfirmRemoveColumn} onCancel={onCancelRemoveColumn} />
            ) : (
              <>
                <ToolbarButton
                  label="Insert column left of the focused cell"
                  onClick={() => onAddColumn(focusedCol)}
                >
                  + Left
                </ToolbarButton>
                <ToolbarButton
                  label="Insert column right of the focused cell"
                  onClick={() => onAddColumn(focusedCol + 1)}
                >
                  + Right
                </ToolbarButton>
                <ToolbarButton
                  label="Insert a =SUM(...) row for the focused column"
                  onClick={handleAddFormulaRow}
                >
                  <IoCalculatorOutline />
                </ToolbarButton>
                <ToolbarButton
                  label="Remove focused column"
                  disabled={colCount <= 1}
                  danger
                  onClick={() => onRemoveColumn(focusedCol)}
                >
                  <IoTrashOutline />
                </ToolbarButton>
              </>
            )}
          </div>
        </div>

        {/* Markdown preview */}
        <details>
          <summary className="text-ui-micro text-stone cursor-pointer select-none hover:text-ink-muted dark:hover:text-ink-dark transition-colors">
            Markdown preview
          </summary>
          <pre className="mt-1.5 p-2.5 bg-paper-softgray dark:bg-paper-dark-surface/50 rounded-lg text-ui-micro font-mono text-ink-muted dark:text-stone overflow-x-auto whitespace-pre">
            {markdownPreview}
          </pre>
        </details>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outlined" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>

      {/* Formula function autocomplete — portalled to body so fixed coords
          are always relative to the viewport, not the dialog's stacking context. */}
      {(() => {
        if (!acState) return null;
        const filtered = AC_FUNCTIONS.filter((fn) => fn.startsWith(acState.query));
        if (filtered.length === 0) return null;

        // visualViewport reflects the shrunk viewport when the soft keyboard is
        // open on mobile; innerHeight does not.
        const vh = window.visualViewport?.height ?? window.innerHeight;
        const vw = window.visualViewport?.width ?? window.innerWidth;
        const estimatedH = filtered.length * 40;
        const spaceBelow = vh - acState.bottom - 8;
        const showAbove = spaceBelow < estimatedH && acState.top > estimatedH;
        // Clamp left so the dropdown never bleeds off the right edge.
        const left = Math.min(acState.x, vw - 136);
        const posStyle: React.CSSProperties = showAbove
          ? { position: "fixed", bottom: vh - acState.top + 4, left }
          : { position: "fixed", top: acState.bottom + 4, left };

        return createPortal(
          <ul role="listbox" style={posStyle} className="z-[9999] min-w-[8rem] bg-paper-light dark:bg-paper-dark-surface border border-edge rounded-lg shadow-xl py-1">
            {filtered.map((fn, i) => (
              <li
                key={fn}
                role="option"
                aria-selected={i === acActiveIdx}
                onPointerDown={(e) => { e.preventDefault(); insertAcFunction(fn, acState.rowIdx, acState.colIdx); }}
                className={`
                  px-3 py-2.5 sm:py-1.5 text-ui-micro font-mono cursor-pointer select-none
                  ${i === acActiveIdx
                    ? "bg-sage/15 text-ink-light dark:text-ink-dark"
                    : "text-ink-muted dark:text-stone hover:bg-paper-softgray dark:hover:bg-paper-dark-surface/60"}
                `}
              >
                {fn}
              </li>
            ))}
          </ul>,
          document.body,
        );
      })()}
    </DialogModal>
  );
}
