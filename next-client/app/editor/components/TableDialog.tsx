"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
import { IoTrashOutline, IoCalculatorOutline, IoChevronBackOutline, IoChevronForwardOutline } from "react-icons/io5";
import DialogModal from "../../components/DialogModal/DialogModal";
import Button from "../../components/Button";
import type { Alignment } from "../utils/tableParser";
import type { SortState } from "../utils/tableSorter";

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

const ALIGN_LABELS: Record<Alignment, string> = { left: "L", center: "C", right: "R" };

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
  currencyCode = "USD",
}: TableDialogProps) {
  const firstInputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const colCount = headers.length;
  const [focusedCell, setFocusedCell] = useState<FocusedCell>({ rowIdx: -1, colIdx: 0 });
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const getCellEl = (selector: string) =>
    document.querySelector<HTMLInputElement>(selector);

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
        let el: HTMLInputElement | null = null;
        let targetRow = -1;
        let targetCol = 0;
        if (focusRow !== undefined && focusCol !== undefined) {
          // findTableAtPos's cursorRow is 0-indexed where 0 = header, 1 = separator,
          // 2 = first data row. The dialog indexes headers as -1, data rows as 0...n.
          targetRow = focusRow === 0 ? -1 : focusRow - 2;
          targetCol = focusCol;

          if (targetRow < 0) {
            el = getCellEl(`[data-hcell="${focusCol}"]`);
          } else {
            el = getCellEl(`[data-dcell="${targetRow}-${focusCol}"]`);
          }
        }
        setFocusedCell({ rowIdx: targetRow, colIdx: targetCol });
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

  const isHeaderFocused = focusedCell.rowIdx === -1;
  const focusedCol = focusedCell.colIdx;

  const handleAddTotal = useCallback(() => {
    const newRowIdx = rows.length;
    onAddRow();
    setTimeout(() => onCellChange(newRowIdx, focusedCol, "Total:"), 50);
  }, [rows.length, onAddRow, onCellChange, focusedCol]);

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
              <tr>
                {headers.map((header, ci) => {
                  const isSorted = sortState?.colIdx === ci;
                  const sortDir = isSorted ? sortState!.direction : null;
                  const isHeaderCellFocused = isHeaderFocused && focusedCol === ci;

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
                        ${isSorted
                          ? "bg-sage/10 dark:bg-sage/5"
                          : "bg-paper-softgray dark:bg-paper-dark-surface/60"}
                      `}
                    >
                      <div className="flex flex-col">
                        {/* Header input row — sort chevron lives here; insert/remove are in the toolbar below */}
                        <div className="flex items-center gap-0 pl-2 pr-0.5 pt-1.5 pb-0.5">
                          <input
                            ref={ci === 0 ? firstInputRef : undefined}
                            data-hcell={ci}
                            type="text"
                            value={header}
                            onChange={(e) => onHeaderChange(ci, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, -1, ci)}
                            onFocus={() => setFocusedCell({ rowIdx: -1, colIdx: ci })}
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
                        </div>

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
              </tr>
            </thead>

            <tbody>
              {rows.map((row, ri) => {
                const isFocusedRow = focusedCell.rowIdx === ri;
                const rowBg = ri % 2 === 1 ? "bg-paper-softgray/50 dark:bg-paper-dark-surface/20" : "";
                return (
                  <tr key={ri} className={`${rowBg} transition-colors`}>
                    {row.map((cell, ci) => {
                      const isSortedCol = sortState?.colIdx === ci;
                      const isFocusedCell = isFocusedRow && focusedCol === ci;
                      return (
                        <td
                          key={ci}
                          className={`
                            relative border border-zinc-200 dark:border-zinc-700 p-0 transition-colors
                            ${isFocusedCell ? "ring-2 ring-inset ring-sage z-10" : ""}
                            ${isFocusedCell
                              ? "bg-sage/10 dark:bg-sage/15"
                              : isSortedCol
                                ? "bg-sage/5 dark:bg-sage/5"
                                : ""}
                            ${cell.trim().startsWith("Total:") ? "bg-paper-softgray/80 dark:bg-paper-dark-surface/40" : ""}
                          `}
                        >
                          {cell.trim().startsWith("Total:") && !isFocusedCell ? (
                            <div
                              className="w-full px-2 py-1.5 text-ui-footnote tabular-nums font-semibold text-ink-light dark:text-ink-dark cursor-text"
                              style={{ textAlign: alignments[ci] }}
                              onClick={() => {
                                setFocusedCell({ rowIdx: ri, colIdx: ci });
                                setTimeout(() => getCellEl(`[data-dcell="${ri}-${ci}"]`)?.focus(), 0);
                              }}
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
                              onFocus={() => setFocusedCell({ rowIdx: ri, colIdx: ci })}
                              placeholder="…"
                              style={{ textAlign: alignments[ci] }}
                              className="w-full px-2 py-1.5 bg-transparent text-ui-footnote tabular-nums text-ink-light dark:text-ink-dark focus:outline-none placeholder:text-beige dark:placeholder:text-fg-faint"
                            />
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
                  label="Add a Total: row for the focused column"
                  onClick={handleAddTotal}
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
    </DialogModal>
  );
}
