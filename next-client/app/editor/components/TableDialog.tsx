"use client";

import React, { useRef, useEffect, useCallback } from "react";
import DialogModal from "../../components/DialogModal/DialogModal";
import Button from "../../components/Button";
import type { Alignment } from "../utils/tableParser";
import type { SortState } from "../utils/tableSorter";

type DialogMode = "create" | "edit";

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", JPY: "¥", INR: "₹", CAD: "C$", AUD: "A$", RON: "RON",
};
const SUFFIX_CURRENCIES = new Set(["RON"]);

function computeColTotal(rows: string[][], colIdx: number, totalRowIdx: number, currencyCode: string): string {
  const symbol = CURRENCY_SYMBOLS[currencyCode] || "$";
  const isSuffix = SUFFIX_CURRENCIES.has(currencyCode);
  const esc = symbol.replace(/[.$*+?()[\]{}|]/g, "\\$&");
  const re = new RegExp(isSuffix ? `-?[\\d,]+(?:\\.\\d+)?\\s?${esc}` : `-?${esc}\\s?[\\d,]+(?:\\.\\d+)?`, "g");

  let total = 0;
  for (let ri = 0; ri < rows.length; ri++) {
    if (ri === totalRowIdx) continue;
    const cell = rows[ri][colIdx] || "";
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(cell)) !== null) {
      total += parseFloat(m[0].replace(/,/g, "").replace(new RegExp(esc, "g"), "").trim()) || 0;
    }
  }

  const formatted = total.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return isSuffix ? `${formatted} ${symbol}` : `${symbol}${formatted}`;
}

interface TableDialogProps {
  isOpen: boolean;
  mode: DialogMode;
  currencyCode?: string;
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
  currencyCode = "USD",
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
      styles="w-full !max-w-5xl"
      ariaLabelledBy="td-title"
      mobileSheet
    >
      <div className="flex flex-col gap-4 min-h-0">
        <h2
          id="td-title"
          className="text-ui-body font-semibold text-ink-light dark:text-ink-dark pr-8"
        >
          {title}
        </h2>

        {/* Scrollable cell grid */}
        <div className="overflow-x-auto rounded-xl border border-edge max-h-[50vh] overflow-y-auto">
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
                        group border border-edge p-0 min-w-[130px] align-top
                        transition-colors duration-150
                        ${isSorted
                          ? "bg-sage/10 dark:bg-sage/5"
                          : "bg-paper-softgray dark:bg-paper-dark-surface/60"}
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
                                ? "text-sage dark:text-sage"
                                : "text-ink-light dark:text-ink-dark"}
                            `}
                          />

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

                          {/* Add total row for this column */}
                          <Button
                            variant="bare"
                            type="button"
                            onClick={() => {
                              const newRowIdx = rows.length;
                              onAddRow();
                              setTimeout(() => onCellChange(newRowIdx, ci, "Total:"), 50);
                            }}
                            aria-label="Add total row for this column"
                            title="Add total row"
                            className="
                              flex-shrink-0 w-8 h-8 sm:w-6 sm:h-6 flex items-center justify-center rounded
                              text-[11px] leading-none transition-all duration-150
                              text-stone opacity-40 sm:opacity-0 sm:group-hover:opacity-40 hover:!opacity-100 focus-within:opacity-40 hover:text-sage dark:hover:text-sage
                            "
                          >
                            Σ
                          </Button>

                          {/* Remove column — faint until hover */}
                          <Button
                            variant="icon"
                            type="button"
                            onClick={() => onRemoveColumn(ci)}
                            aria-label="Remove column"
                            className="
                              flex-shrink-0 w-8 h-8 sm:w-5 sm:h-5 flex items-center justify-center rounded
                              text-[14px] sm:text-[11px] leading-none transition-all duration-150
                              text-stone hover:text-red-500 dark:text-stone dark:hover:text-red-400
                              opacity-40 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100
                            "
                          >
                            ×
                          </Button>
                        </div>

                        {/* Inline confirmation for non-empty column removal */}
                        {pendingRemoveCol === ci && (
                          <div className="px-2 py-0.5 text-ui-micro text-amber-700 dark:text-amber-400 flex items-center gap-1 flex-wrap">
                            <span>Has content.</span>
                            <Button
                              variant="bare"
                              onClick={onConfirmRemoveColumn}
                              className="underline hover:text-red-600 transition-colors"
                            >
                              Remove
                            </Button>
                            <Button
                              variant="bare"
                              onClick={onCancelRemoveColumn}
                              className="underline hover:text-ink-muted transition-colors"
                            >
                              Cancel
                            </Button>
                          </div>
                        )}

                        {/* Alignment toggle */}
                        <div className="flex border-t border-edge mt-0.5">
                          {(["left", "center", "right"] as Alignment[]).map((a) => (
                            <Button
                              key={a}
                              variant="bare"
                              type="button"
                              onClick={() => onAlignmentChange(ci, a)}
                              aria-label={`Align ${a}`}
                              aria-pressed={alignments[ci] === a}
                              className={`
                                flex-1 text-ui-micro py-2 sm:py-0.5 transition-colors
                                ${alignments[ci] === a
                                  ? "bg-sage/20 dark:bg-sage/20 text-sage dark:text-sage font-semibold"
                                  : "text-stone hover:text-ink-light dark:hover:text-ink-dark"}
                              `}
                            >
                              {ALIGN_LABELS[a]}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </th>
                  );
                })}

                {/* Add column */}
                <th className="border border-edge bg-paper-softgray dark:bg-paper-dark-surface/60 w-9 p-0">
                  <Button
                    variant="pill-icon"
                    type="button"
                    onClick={onAddColumn}
                    aria-label="Add column"
                    title="Add column"
                    className="w-full h-full min-h-[60px] text-stone hover:text-sage dark:hover:text-sage transition-colors text-ui-title-1"
                  >
                    +
                  </Button>
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
                          ${isSortedCol ? "bg-sage/5 dark:bg-sage/5" : ""}
                          ${cell.trim().startsWith("Total:") ? "bg-paper-softgray/80 dark:bg-paper-dark-surface/40" : ""}
                        `}
                      >
                        {cell.trim().startsWith("Total:") ? (
                          <div
                            className="w-full px-2 py-1.5 text-ui-footnote tabular-nums font-semibold text-ink-light dark:text-ink-dark select-none"
                            style={{ textAlign: alignments[ci] }}
                          >
                            Total: {computeColTotal(rows, ci, ri, currencyCode)}
                          </div>
                        ) : (
                          <input
                            data-dcell={`${ri}-${ci}`}
                            type="text"
                            value={cell}
                            onChange={(e) => onCellChange(ri, ci, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, ri, ci)}
                            placeholder="…"
                            style={{ textAlign: alignments[ci] }}
                            className="w-full px-2 py-1.5 bg-transparent text-ui-footnote tabular-nums text-ink-light dark:text-ink-dark focus:outline-none placeholder:text-beige dark:placeholder:text-fg-faint"
                          />
                        )}
                      </td>
                    );
                  })}

                  {/* Remove row */}
                  <td className="border border-edge w-9 p-0 align-middle">
                    {pendingRemoveRow === ri ? (
                      <div className="flex flex-col items-center py-0.5 gap-0.5">
                        <Button
                          variant="bare"
                          onClick={onConfirmRemoveRow}
                          aria-label="Confirm remove row"
                          className="text-ui-micro text-red-500 hover:text-red-700 dark:text-red-400 underline"
                        >
                          ×
                        </Button>
                        <Button
                          variant="bare"
                          onClick={onCancelRemoveRow}
                          aria-label="Cancel remove row"
                          className="text-ui-micro text-stone hover:text-ink-light underline"
                        >
                          ↩
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="icon"
                        type="button"
                        onClick={() => onRemoveRow(ri)}
                        aria-label="Remove row"
                        className="w-full h-full min-h-[44px] sm:min-h-[32px] text-stone hover:text-red-500 dark:text-stone dark:hover:text-red-400 transition-colors"
                      >
                        ×
                      </Button>
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
                  <Button
                    variant="pill-icon"
                    type="button"
                    onClick={onAddRow}
                    aria-label="Add row"
                    className="w-full py-2.5 sm:py-1.5 text-ui-micro text-stone hover:text-sage dark:hover:text-sage transition-colors"
                  >
                    + Add row
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
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
    </DialogModal>
  );
}
