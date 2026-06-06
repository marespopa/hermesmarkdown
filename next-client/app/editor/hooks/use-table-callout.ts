"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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
  const suppressRef = useRef(false);

  // Dismiss and briefly suppress re-detection whenever the value changes (user typed)
  useEffect(() => {
    suppressRef.current = true;
    setTableInfo(null);
    const timer = setTimeout(() => {
      suppressRef.current = false;
    }, 50);
    return () => clearTimeout(timer);
  }, [value]);

  const detectTableAtCaret = useCallback(() => {
    if (suppressRef.current) return;

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
  };
}
