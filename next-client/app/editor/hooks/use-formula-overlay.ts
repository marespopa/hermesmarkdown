"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import getCaretCoordinates from "textarea-caret";
import { findAllTables } from "../utils/table-detection";
import { getTableCellOffsets } from "../utils/table-cell-offsets";
import { extractTableSource, parseTableLenient, type Alignment, type TableData } from "../utils/tableParser";
import { evaluateTable, isFormulaCell, FormulaError } from "../utils/formula-engine";

export interface FormulaBadge {
  key: string;
  top: number;
  left: number;
  width: number;
  height: number;
  text: string;
  isError: boolean;
  alignment: Alignment;
}

interface UseFormulaOverlayProps {
  value: string;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  // textareaRef.current is only assigned in a regular (not layout) effect
  // once react-simple-code-editor's <textarea> actually mounts, so it's
  // still null during this hook's very first layout effect. textareaMounted
  // flips true right after that assignment — depending on it forces a
  // recompute once the ref is actually usable (same trick already used for
  // positioning the callout chevrons in useMarkdownEditor.ts).
  textareaMounted?: boolean;
  isActivePane?: boolean;
}

// Renders live computed values for every formula cell in every table in the
// document — except the single cell the caret is currently inside, so its
// raw `=SUM(...)` text stays visible and editable (the same raw-vs-display
// split the Table Dialog uses for computed cells).
export function useFormulaOverlay({
  value,
  textareaRef,
  textareaMounted,
  isActivePane = true,
}: UseFormulaOverlayProps) {
  const [formulaBadges, setFormulaBadges] = useState<FormulaBadge[]>([]);

  const recompute = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea || !isActivePane) {
      setFormulaBadges((prev) => (prev.length ? [] : prev));
      return;
    }

    // A non-collapsed selection isn't "inside" any one cell, so badges stay
    // visible everywhere while the user is just selecting text elsewhere.
    const hasCollapsedCaret = textarea.selectionStart === textarea.selectionEnd;
    const caretPos = textarea.selectionStart;

    // Pre-parse all tables and build a heading→data map so cross-table
    // references like =SUM(Income!B) can be resolved during evaluation.
    const allBlocks = findAllTables(value);
    const namedTables = new Map<string, TableData>();
    const pairs: Array<{ block: (typeof allBlocks)[number]; data: TableData }> = [];
    for (const block of allBlocks) {
      const src = extractTableSource(block.lines, block.tableStart, block.tableEnd);
      const d = parseTableLenient(src);
      if (!d) continue;
      pairs.push({ block, data: d });
      if (block.heading) namedTables.set(block.heading, d);
    }

    const next: FormulaBadge[] = [];
    for (const { block: table, data } of pairs) {
      const offsets = getTableCellOffsets(table);
      const formulaResults = evaluateTable(data, namedTables);

      for (const cell of offsets) {
        if (!isFormulaCell(cell.text)) continue;
        if (hasCollapsedCaret && caretPos >= cell.fullStart && caretPos <= cell.fullEnd) continue;

        const computed = formulaResults.get(`${cell.row}_${cell.col}`);
        if (!computed) continue;

        const startCoords = getCaretCoordinates(textarea, cell.fullStart);
        const endCoords = getCaretCoordinates(textarea, cell.fullEnd);

        next.push({
          key: `${table.tableStart}_${cell.row}_${cell.col}`,
          top: startCoords.top,
          left: startCoords.left,
          width: Math.max(endCoords.left - startCoords.left, 4),
          height: startCoords.height || 20,
          text: computed.display,
          isError: computed.value instanceof FormulaError,
          alignment: data.alignments[cell.col] ?? "left",
        });
      }
    }

    setFormulaBadges(next);
  }, [value, textareaRef, textareaMounted, isActivePane]);

  // Recompute on every edit (formula results or table boundaries may have
  // changed) and on every caret move (toggles which cell's badge is hidden).
  useLayoutEffect(() => {
    recompute();
  }, [recompute]);

  useEffect(() => {
    document.addEventListener("selectionchange", recompute);
    return () => document.removeEventListener("selectionchange", recompute);
  }, [recompute]);

  return { formulaBadges };
}
