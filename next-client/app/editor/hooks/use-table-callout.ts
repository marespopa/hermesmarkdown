"use client";

import { useState, useCallback, useEffect, useLayoutEffect } from "react";
import getCaretCoordinates from "textarea-caret";
import { findTableAtPos, TableInfo } from "../utils/table-detection";
import {
  addRow,
  addColumn,
  removeRow,
  removeColumn,
  cycleAlignment,
  getColumnAlignment,
  tableToCSV,
} from "../utils/table-manipulation";

interface UseTableCalloutProps {
  value: string;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

const CALLOUT_WIDTH = 280;

function computeLineOffset(lines: string[], lineIdx: number): number {
  let offset = 0;
  for (let i = 0; i < lineIdx; i++) offset += lines[i].length + 1; // +1 for \n
  return offset;
}

export function useTableCallout({ value, textareaRef }: UseTableCalloutProps) {
  const [tableInfo, setTableInfo] = useState<TableInfo | null>(null);
  const [calloutPos, setCalloutPos] = useState({ top: 0, left: 0 });
  const detectTableAtCaret = useCallback(() => {

    const textarea = textareaRef.current;
    if (!textarea || document.activeElement !== textarea) return;

    const pos = textarea.selectionStart;
    if (textarea.selectionEnd !== pos) {
      setTableInfo(null);
      return;
    }

    const result = findTableAtPos(value, pos);
    if (!result) {
      setTableInfo(null);
      return;
    }

    const caret = getCaretCoordinates(textarea, result.tableStartOffset);
    setCalloutPos({
      top: (caret.top || 0) - 36,
      left: Math.min(caret.left || 0, textarea.clientWidth - CALLOUT_WIDTH),
    });
    setTableInfo(result);
  }, [value, textareaRef]);

  // Immediately recalculate callout position on value change for smooth animation
  useLayoutEffect(() => {
    detectTableAtCaret();
  }, [value, detectTableAtCaret]);

  useEffect(() => {
    document.addEventListener("selectionchange", detectTableAtCaret);
    return () => document.removeEventListener("selectionchange", detectTableAtCaret);
  }, [detectTableAtCaret]);

  // Replace the table range in the textarea using execCommand so the operation
  // is recorded in the browser's native undo/redo stack.
  const applyTableChange = useCallback(
    (newLines: string[], cursorPos?: number) => {
      const textarea = textareaRef.current;
      if (!tableInfo || !textarea) return;

      // Compute char extent of original table in the document
      const oldTableLineCount = tableInfo.tableEnd - tableInfo.tableStart + 1;
      let tableEndOffset = tableInfo.tableStartOffset;
      for (let i = 0; i < oldTableLineCount; i++) {
        tableEndOffset += tableInfo.lines[tableInfo.tableStart + i].length;
        if (i < oldTableLineCount - 1) tableEndOffset += 1; // \n separator
      }

      // New table line count may differ (e.g. addRow adds one line)
      const lineDelta = newLines.length - tableInfo.lines.length;
      const newTableLineCount = oldTableLineCount + lineDelta;
      const newTableContent = newLines
        .slice(tableInfo.tableStart, tableInfo.tableStart + newTableLineCount)
        .join("\n");

      textarea.focus();
      textarea.setSelectionRange(tableInfo.tableStartOffset, tableEndOffset);
      // execCommand records the change in the browser undo stack
      document.execCommand("insertText", false, newTableContent);

      if (cursorPos !== undefined) {
        // Defer past React's state flush so setSelectionRange isn't overwritten
        setTimeout(() => {
          textarea.setSelectionRange(cursorPos, cursorPos);
        }, 0);
      }
    },
    [tableInfo, textareaRef],
  );

  const handleAddRow = useCallback(() => {
    if (!tableInfo) return;
    const newLines = addRow(tableInfo.lines, tableInfo.tableEnd);
    // Place cursor after `| ` prefix in first cell of the new row
    const newRowIdx = tableInfo.tableEnd + 1;
    const cursorPos = computeLineOffset(newLines, newRowIdx) + 2;
    applyTableChange(newLines, cursorPos);
  }, [tableInfo, applyTableChange]);

  const handleAddCol = useCallback(() => {
    if (!tableInfo) return;
    const newLines = addColumn(tableInfo.lines, tableInfo.tableStart, tableInfo.tableEnd);
    // Place cursor in new (last) cell of the header row
    const headerLineIdx = tableInfo.tableStart;
    const lineOffset = computeLineOffset(newLines, headerLineIdx);
    const line = newLines[headerLineIdx];
    const lastPipe = line.lastIndexOf("|");
    const secondLastPipe = line.lastIndexOf("|", lastPipe - 1);
    // Skip `| ` after second-to-last pipe to land inside the new cell
    const cursorPos = lineOffset + secondLastPipe + 2;
    applyTableChange(newLines, cursorPos);
  }, [tableInfo, applyTableChange]);

  const handleRemoveRow = useCallback(() => {
    if (!tableInfo) return;
    const newLines = removeRow(tableInfo.lines, tableInfo.lineIdx, tableInfo.tableStart);
    // removeRow is a no-op for header/separator rows
    if (newLines === tableInfo.lines) return;
    // After deletion, target the row that now occupies lineIdx (or the one above if last row was removed)
    const targetLineIdx = Math.min(tableInfo.lineIdx, tableInfo.tableEnd - 1);
    const cursorPos = computeLineOffset(newLines, targetLineIdx) + 2;
    applyTableChange(newLines, cursorPos);
  }, [tableInfo, applyTableChange]);

  const handleRemoveCol = useCallback(() => {
    if (!tableInfo) return;
    const newLines = removeColumn(
      tableInfo.lines,
      tableInfo.cursorCol,
      tableInfo.tableStart,
      tableInfo.tableEnd,
    );
    // Stay on the same row; target column is the same index clamped to new count
    const newLine = newLines[tableInfo.lineIdx];
    // Find how many data cells the new row has
    const pipesInLine = (newLine.match(/\|/g) || []).length;
    const newColCount = Math.max(0, pipesInLine - 1);
    const targetCol = Math.min(tableInfo.cursorCol, newColCount - 1);
    // Find the start of targetCol cell within the line
    let pipesSeen = 0;
    let cellStart = 0;
    for (let i = 0; i < newLine.length; i++) {
      if (newLine[i] === "|") {
        pipesSeen++;
        if (pipesSeen === targetCol + 1) {
          cellStart = i + 2; // skip `| `
          break;
        }
      }
    }
    const lineOff = computeLineOffset(newLines, tableInfo.lineIdx);
    applyTableChange(newLines, lineOff + cellStart);
  }, [tableInfo, applyTableChange]);

  const handleCycleAlign = useCallback(() => {
    if (!tableInfo) return;
    const { lines: newLines } = cycleAlignment(
      tableInfo.lines,
      tableInfo.cursorCol,
      tableInfo.tableStart,
    );
    applyTableChange(newLines);
  }, [tableInfo, applyTableChange]);

  const handleCopyCSV = useCallback(() => {
    if (!tableInfo) return;
    const csv = tableToCSV(tableInfo.lines, tableInfo.tableStart, tableInfo.tableEnd);
    navigator.clipboard.writeText(csv).catch(() => {});
  }, [tableInfo]);

  // Tab: jump between table cells in source mode
  // Shift+Tab: jump backward
  const handleTableTab = useCallback(
    (e: KeyboardEvent): boolean => {
      if (e.key !== "Tab" || !tableInfo) return false;

      const textarea = textareaRef.current;
      if (!textarea || document.activeElement !== textarea) return false;

      const line = tableInfo.lines[tableInfo.lineIdx];
      const lineStart = computeLineOffset(tableInfo.lines, tableInfo.lineIdx);
      const posInLine = textarea.selectionStart - lineStart;

      if (!e.shiftKey) {
        // Find next | after cursor position in this line
        const nextPipe = line.indexOf("|", posInLine + 1);
        if (nextPipe !== -1 && nextPipe < line.length - 1) {
          e.preventDefault();
          const newPos = lineStart + nextPipe + 2; // skip `| `
          textarea.setSelectionRange(newPos, newPos);
          return true;
        }
        // At last cell — move to first cell of next row (skipping separator)
        let nextRow = tableInfo.lineIdx + 1;
        while (nextRow <= tableInfo.tableEnd) {
          const nl = tableInfo.lines[nextRow];
          if (!/^\s*\|[\s:|-]+\|\s*$/.test(nl)) break;
          nextRow++;
        }
        if (nextRow <= tableInfo.tableEnd) {
          e.preventDefault();
          const nlStart = computeLineOffset(tableInfo.lines, nextRow);
          const firstPipe = tableInfo.lines[nextRow].indexOf("|");
          textarea.setSelectionRange(nlStart + firstPipe + 2, nlStart + firstPipe + 2);
          return true;
        }
      } else {
        // Shift+Tab: find preceding | before cursor (skip the current cell's opening |)
        const searchFrom = Math.max(0, posInLine - 1);
        const prevPipe = line.lastIndexOf("|", searchFrom - 1);
        // Skip to the one before that to land inside the previous cell
        if (prevPipe > 0) {
          const prevPrev = line.lastIndexOf("|", prevPipe - 1);
          if (prevPrev >= 0) {
            e.preventDefault();
            textarea.setSelectionRange(lineStart + prevPrev + 2, lineStart + prevPrev + 2);
            return true;
          }
        }
        // At first cell — move to last cell of previous row (skipping separator)
        let prevRow = tableInfo.lineIdx - 1;
        while (prevRow >= tableInfo.tableStart) {
          const pl = tableInfo.lines[prevRow];
          if (!/^\s*\|[\s:|-]+\|\s*$/.test(pl)) break;
          prevRow--;
        }
        if (prevRow >= tableInfo.tableStart) {
          e.preventDefault();
          const pl = tableInfo.lines[prevRow];
          const plStart = computeLineOffset(tableInfo.lines, prevRow);
          const lastPipe = pl.lastIndexOf("|");
          const secondLast = pl.lastIndexOf("|", lastPipe - 1);
          if (secondLast >= 0) {
            textarea.setSelectionRange(plStart + secondLast + 2, plStart + secondLast + 2);
          }
          return true;
        }
      }

      return false;
    },
    [tableInfo, textareaRef],
  );

  // Auto-escape | → \| when typing inside a table cell in source mode
  const handleTablePipeEscape = useCallback(
    (e: KeyboardEvent): boolean => {
      if (e.key !== "|" || !tableInfo) return false;

      const textarea = textareaRef.current;
      if (!textarea || document.activeElement !== textarea) return false;

      // Only intercept unmodified | (not Shift+\ which is | on some layouts)
      e.preventDefault();
      document.execCommand("insertText", false, "\\|");
      return true;
    },
    [tableInfo, textareaRef],
  );

  // Enter at end of a table row inserts a new row below
  const handleTableEnter = useCallback(
    (e: KeyboardEvent): boolean => {
      if (e.key !== "Enter" || !tableInfo || e.shiftKey || e.ctrlKey || e.metaKey) return false;

      const textarea = textareaRef.current;
      if (!textarea || document.activeElement !== textarea) return false;

      const line = tableInfo.lines[tableInfo.lineIdx];
      const lineStart = computeLineOffset(tableInfo.lines, tableInfo.lineIdx);
      const posInLine = textarea.selectionStart - lineStart;

      // Only trigger if cursor is at or near the end of the line (within trailing whitespace)
      if (posInLine < line.trimEnd().length - 1) return false;
      // Don't act on the separator row
      if (/^\s*\|[\s:|-]+\|\s*$/.test(line)) return false;

      e.preventDefault();
      const newLines = addRow(tableInfo.lines, tableInfo.tableEnd);
      const newRowIdx = tableInfo.tableEnd + 1;
      const cursorPos = computeLineOffset(newLines, newRowIdx) + 2;
      applyTableChange(newLines, cursorPos);
      return true;
    },
    [tableInfo, textareaRef, applyTableChange],
  );

  // Unified keyboard handler for table source shortcuts
  const handleTableKeyDown = useCallback(
    (e: KeyboardEvent): boolean => {
      if (!tableInfo) return false;
      if (handleTableTab(e)) return true;
      if (handleTablePipeEscape(e)) return true;
      if (handleTableEnter(e)) return true;
      return false;
    },
    [tableInfo, handleTableTab, handleTablePipeEscape, handleTableEnter],
  );

  const currentAlignment = tableInfo
    ? getColumnAlignment(tableInfo.lines, tableInfo.cursorCol, tableInfo.tableStart)
    : "none";

  return {
    tableInfo,
    setTableInfo,
    calloutPos,
    currentAlignment,
    handleAddRow,
    handleAddCol,
    handleRemoveRow,
    handleRemoveCol,
    handleCycleAlign,
    handleCopyCSV,
    handleTableKeyDown,
  };
}
