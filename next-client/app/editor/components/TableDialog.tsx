"use client";

import React, { useRef, useEffect, useCallback } from "react";
import DialogModal from "../../components/DialogModal/DialogModal";
import Button from "../../components/Button";
import type { Alignment } from "../utils/tableParser";
import type { SortState } from "../utils/tableSorter";

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
  onAddColumn: () => void;
  onRemoveColumn: (colIdx: number) => void;
  onConfirmRemoveColumn: () => void;
  onCancelRemoveColumn: () => void;
  onAddRow: () => void;
  onRemoveRow: (rowIdx: number) => void;
  onConfirmRemoveRow: () => void;
  onCancelRemoveRow: () => void;
  onInsert: () => void;
  onUpdate: () => void;
  onClose: () => void;
  focusRow?: number;
  focusCol?: number;
}

const ALIGN_LABELS: Record<Alignment, string> = { left: "L", center: "C", right: "R" };

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
  const colCount = headers.length;

  const getCellEl = (selector: string) =>
    document.querySelector<HTMLInputElement>(selector);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => {
        let el: HTMLInputElement | null = null;
        if (focusRow !== undefined && focusCol !== undefined) {
          // If focusRow is -1, it means the header row.
          // Note: cursorRow is 0-indexed where 0 = header, 1 = separator, 2 = first data row.
          // Wait, findTableAtPos calculates cursorRow based on lines!
          // We need to map cursorRow to the Dialog's indexing:
          // In the dialog, headers are -1, data rows are 0...n.
          // Let's just pass focusRow and focusCol straight to getCellEl. Wait, I should do the math.
          
          let targetRow = focusRow - 2; // because 0=header, 1=sep, 2=data row 0
          if (focusRow === 0) targetRow = -1; // header

          if (targetRow < 0) {
            el = getCellEl(`[data-hcell="${focusCol}"]`);
          } else {
            el = getCellEl(`[data-dcell="${targetRow}-${focusCol}"]`);
          }
        }
        (el || firstInputRef.current)?.focus();
      }, 120);
      return () => clearTimeout(t);
    }
  }, [isOpen, focusRow, focusCol]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, rowIdx: number, colIdx: number) => {
      if (e.key === "Enter") { e.stopPropagation(); return; }
      if (e.key !== "Tab") return;

      e.preventDefault();
      const isHeader = rowIdx < 0;
      const lastCol = colIdx === colCount - 1;
      const lastRow = rowIdx === rows.length - 1;

      if (!e.shiftKey) {
        if (!lastCol) {
          (isHeader
            ? getCellEl(`[data-hcell="${colIdx + 1}"]`)
            : getCellEl(`[data-dcell="${rowIdx}-${colIdx + 1}"]`))?.focus();
        } else if (isHeader) {
          getCellEl(`[data-dcell="0-0"]`)?.focus();
        } else if (!lastRow) {
          getCellEl(`[data-dcell="${rowIdx + 1}-0"]`)?.focus();
        } else {
          onAddRow();
          setTimeout(() => getCellEl(`[data-dcell="${rows.length}-0"]`)?.focus(), 40);
        }
      } else {
        if (colIdx > 0) {
          (isHeader
            ? getCellEl(`[data-hcell="${colIdx - 1}"]`)
            : getCellEl(`[data-dcell="${rowIdx}-${colIdx - 1}"]`))?.focus();
        } else if (isHeader) {
          getCellEl(`[data-dcell="${rows.length - 1}-${colCount - 1}"]`)?.focus();
        } else if (rowIdx === 0) {
          getCellEl(`[data-hcell="${colCount - 1}"]`)?.focus();
        } else {
          getCellEl(`[data-dcell="${rowIdx - 1}-${colCount - 1}"]`)?.focus();
        }
      }
    },
    [colCount, rows.length, onAddRow],
  );

  const title = mode === "create" ? "Insert Table" : "Edit Table";
  const confirmLabel = mode === "create" ? "Insert Table" : "Update Table";
  const onConfirm = mode === "create" ? onInsert : onUpdate;

  return (
    <DialogModal
      isOpened={isOpen}
      onClose={onClose}
      styles="!max-w-2xl w-full"
      ariaLabelledBy="td-title"
    >
      <div className="flex flex-col gap-4 min-h-0">
        <h2
          id="td-title"
          className="text-ui-body font-semibold text-zinc-900 dark:text-zinc-100 pr-8"
        >
          {title}
        </h2>

        {/* Scrollable cell grid */}
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700 max-h-[50vh] overflow-y-auto">
          <table className="border-collapse w-max min-w-full text-left">
            <thead>
              <tr>
                {headers.map((header, ci) => {
                  const isSorted = sortState?.colIdx === ci;
                  const sortDir = isSorted ? sortState!.direction : null;

                  return (
                    <th
                      key={ci}
                      aria-sort={
                        isSorted
                          ? sortDir === "asc" ? "ascending" : "descending"
                          : "none"
                      }
                      className={`
                        group border border-zinc-200 dark:border-zinc-700 p-0 min-w-[130px] align-top
                        transition-colors duration-150
                        ${isSorted
                          ? "bg-blue-50/70 dark:bg-blue-950/25"
                          : "bg-zinc-50 dark:bg-zinc-800/60"}
                      `}
                    >
                      <div className="flex flex-col">
                        {/* Header input row — sort chevron + remove live here */}
                        <div className="flex items-center gap-0 pl-2 pr-0.5 pt-1.5 pb-0.5">
                          <input
                            ref={ci === 0 ? firstInputRef : undefined}
                            data-hcell={ci}
                            type="text"
                            value={header}
                            onChange={(e) => onHeaderChange(ci, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, -1, ci)}
                            placeholder={`Header ${ci + 1}`}
                            className={`
                              flex-1 min-w-0 bg-transparent text-ui-footnote font-semibold tabular-nums
                              focus:outline-none placeholder:text-zinc-300 dark:placeholder:text-zinc-600
                              ${isSorted
                                ? "text-blue-700 dark:text-blue-300"
                                : "text-zinc-900 dark:text-zinc-100"}
                            `}
                          />

                          {/* Sort chevron — invisible until hover or sorted */}
                          <button
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
                                ? "text-blue-600 dark:text-blue-400 opacity-100"
                                : "text-zinc-400 dark:text-zinc-500 opacity-40 sm:opacity-0 sm:group-hover:opacity-40 hover:!opacity-100 focus-within:opacity-40 hover:text-zinc-700 dark:hover:text-zinc-200"}
                            `}
                          >
                            {sortDir === "desc" ? "↓" : "↑"}
                          </button>

                          {/* Remove column — faint until hover */}
                          <button
                            type="button"
                            onClick={() => onRemoveColumn(ci)}
                            aria-label="Remove column"
                            className="
                              flex-shrink-0 w-8 h-8 sm:w-5 sm:h-5 flex items-center justify-center rounded
                              text-[14px] sm:text-[11px] leading-none transition-all duration-150
                              text-zinc-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400
                              opacity-40 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100
                            "
                          >
                            ×
                          </button>
                        </div>

                        {/* Inline confirmation for non-empty column removal */}
                        {pendingRemoveCol === ci && (
                          <div className="px-2 py-0.5 text-ui-micro text-amber-700 dark:text-amber-400 flex items-center gap-1 flex-wrap">
                            <span>Has content.</span>
                            <button
                              onClick={onConfirmRemoveColumn}
                              className="underline hover:text-red-600 transition-colors"
                            >
                              Remove
                            </button>
                            <button
                              onClick={onCancelRemoveColumn}
                              className="underline hover:text-zinc-600 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        )}

                        {/* Alignment toggle */}
                        <div className="flex border-t border-zinc-200 dark:border-zinc-700 mt-0.5">
                          {(["left", "center", "right"] as Alignment[]).map((a) => (
                            <button
                              key={a}
                              type="button"
                              onClick={() => onAlignmentChange(ci, a)}
                              aria-label={`Align ${a}`}
                              aria-pressed={alignments[ci] === a}
                              className={`
                                flex-1 text-ui-micro py-2 sm:py-0.5 transition-colors
                                ${alignments[ci] === a
                                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold"
                                  : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200"}
                              `}
                            >
                              {ALIGN_LABELS[a]}
                            </button>
                          ))}
                        </div>
                      </div>
                    </th>
                  );
                })}

                {/* Add column */}
                <th className="border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 w-9 p-0">
                  <button
                    type="button"
                    onClick={onAddColumn}
                    aria-label="Add column"
                    title="Add column"
                    className="w-full h-full min-h-[60px] text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-ui-title-1"
                  >
                    +
                  </button>
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => {
                    const isSortedCol = sortState?.colIdx === ci;
                    return (
                      <td
                        key={ci}
                        className={`
                          border border-zinc-200 dark:border-zinc-700 p-0 transition-colors
                          ${isSortedCol ? "bg-blue-50/25 dark:bg-blue-950/10" : ""}
                        `}
                      >
                        <input
                          data-dcell={`${ri}-${ci}`}
                          type="text"
                          value={cell}
                          onChange={(e) => onCellChange(ri, ci, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, ri, ci)}
                          placeholder="…"
                          style={{ textAlign: alignments[ci] }}
                          className="w-full px-2 py-1.5 bg-transparent text-ui-footnote tabular-nums text-zinc-900 dark:text-zinc-100 focus:outline-none placeholder:text-zinc-300 dark:placeholder:text-zinc-600"
                        />
                      </td>
                    );
                  })}

                  {/* Remove row */}
                  <td className="border border-zinc-200 dark:border-zinc-700 w-9 p-0 align-middle">
                    {pendingRemoveRow === ri ? (
                      <div className="flex flex-col items-center py-0.5 gap-0.5">
                        <button
                          onClick={onConfirmRemoveRow}
                          aria-label="Confirm remove row"
                          className="text-ui-micro text-red-500 hover:text-red-700 dark:text-red-400 underline"
                        >
                          ×
                        </button>
                        <button
                          onClick={onCancelRemoveRow}
                          aria-label="Cancel remove row"
                          className="text-ui-micro text-zinc-400 hover:text-zinc-700 underline"
                        >
                          ↩
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onRemoveRow(ri)}
                        aria-label="Remove row"
                        className="w-full h-full min-h-[44px] sm:min-h-[32px] text-zinc-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 transition-colors"
                      >
                        ×
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {/* Add row */}
              <tr>
                <td
                  colSpan={colCount + 1}
                  className="border border-zinc-200 dark:border-zinc-700 p-0"
                >
                  <button
                    type="button"
                    onClick={onAddRow}
                    aria-label="Add row"
                    className="w-full py-2.5 sm:py-1.5 text-ui-micro text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    + Add row
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Markdown preview */}
        <details>
          <summary className="text-ui-micro text-zinc-400 dark:text-zinc-500 cursor-pointer select-none hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
            Markdown preview
          </summary>
          <pre className="mt-1.5 p-2.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg text-ui-micro font-mono text-zinc-500 dark:text-zinc-400 overflow-x-auto whitespace-pre">
            {markdownPreview}
          </pre>
        </details>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outlined" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </DialogModal>
  );
}
