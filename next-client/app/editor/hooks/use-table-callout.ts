"use client";

import { useState, useCallback, useEffect, useLayoutEffect, useRef } from "react";
import getCaretCoordinates from "textarea-caret";
import { findTableAtPos, TableInfo } from "../utils/table-detection";
import {
  addRow,
  cycleAlignment,
  getColumnAlignment,
  tableToCSV,
} from "../utils/table-manipulation";
import { parseTable, extractTableSource } from "../utils/tableParser";
import { serializeTable } from "../utils/tableSerializer";

interface UseTableCalloutProps {
  value: string;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onChange?: (value: string) => void;
}

const CALLOUT_WIDTH = 280;

function computeLineOffset(lines: string[], lineIdx: number): number {
  let offset = 0;
  for (let i = 0; i < lineIdx; i++) offset += lines[i].length + 1; // +1 for \n
  return offset;
}

function isSeparatorRow(line: string): boolean {
  return /^\s*\|[\s:|-]+\|\s*$/.test(line);
}

// Index of the (n+1)-th `|` in a line, 0-indexed (n=0 is the row-opening pipe).
function nthPipeIndex(line: string, n: number): number {
  let idx = -1;
  for (let i = 0; i <= n; i++) {
    idx = line.indexOf("|", idx + 1);
    if (idx === -1) return -1;
  }
  return idx;
}

// Re-pads every column in the table to equal width so `|` stays vertically
// aligned. Falls back to the original lines unchanged if the block doesn't
// parse as a well-formed table (e.g. mid-edit, missing separator).
function realignTableLines(lines: string[], tableStart: number, tableEnd: number): string[] {
  const source = extractTableSource(lines, tableStart, tableEnd);
  const data = parseTable(source);
  if (!data) return lines;
  const serialized = serializeTable(data, true).split("\n");
  return [...lines.slice(0, tableStart), ...serialized, ...lines.slice(tableEnd + 1)];
}

// Sum of line lengths (plus the `\n` joins) for `lines[start..end]` inclusive.
function blockLength(lines: string[], start: number, end: number): number {
  let len = 0;
  for (let i = start; i <= end; i++) {
    len += lines[i].length;
    if (i < end) len += 1;
  }
  return len;
}

export function useTableCallout({ value, textareaRef, onChange }: UseTableCalloutProps) {
  const [tableInfo, setTableInfo] = useState<TableInfo | null>(null);
  const [calloutPos, setCalloutPos] = useState({ top: 0, left: 0 });
  // Tracks the table the caret was last inside, so we can realign it the
  // moment the caret moves to a different table (or out of any table)
  // without disturbing the in-progress edit while the caret is still there.
  const lastTableRef = useRef<TableInfo | null>(null);

  // Replace `target`'s table range in the textarea using execCommand so the
  // operation is recorded in the browser's native undo/redo stack.
  const applyTableChangeFor = useCallback(
    (target: TableInfo, newLines: string[], cursorPos?: number) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const oldTableLineCount = target.tableEnd - target.tableStart + 1;
      const tableEndOffset = target.tableStartOffset + blockLength(target.lines, target.tableStart, target.tableEnd);

      // New table line count may differ (e.g. addRow adds one line)
      const lineDelta = newLines.length - target.lines.length;
      const newTableLineCount = oldTableLineCount + lineDelta;
      const newTableContent = newLines
        .slice(target.tableStart, target.tableStart + newTableLineCount)
        .join("\n");

      textarea.focus();
      textarea.setSelectionRange(target.tableStartOffset, tableEndOffset);
      // execCommand records the change in the browser undo stack
      document.execCommand("insertText", false, newTableContent);

      if (cursorPos !== undefined) {
        // Defer past React's state flush so setSelectionRange isn't overwritten
        setTimeout(() => {
          textarea.setSelectionRange(cursorPos, cursorPos);
        }, 0);
      }
    },
    [textareaRef],
  );

  const applyTableChange = useCallback(
    (newLines: string[], cursorPos?: number) => {
      if (!tableInfo) return;
      applyTableChangeFor(tableInfo, newLines, cursorPos);
    },
    [tableInfo, applyTableChangeFor],
  );

  // Realign `exited`'s column widths and shift `caretPos` by however much the
  // table's total length changed, so the caret lands in the same spot
  // relative to surrounding text instead of jumping into the table.
  //
  // Commits via plain value update rather than execCommand: selecting the
  // table range and inserting would move the native caret into the table
  // for a tick, which the next selectionchange picks up as "back inside the
  // table" and re-triggers this same realign — an infinite flicker loop.
  // A direct value swap never moves the selection, so that loop can't start.
  const realignExitedTable = useCallback(
    (exited: TableInfo, caretPos: number) => {
      if (!onChange) return;
      const newLines = realignTableLines(exited.lines, exited.tableStart, exited.tableEnd);

      const oldContent = exited.lines.slice(exited.tableStart, exited.tableEnd + 1).join("\n");
      const newContent = newLines.slice(exited.tableStart, exited.tableEnd + 1).join("\n");
      if (newContent === oldContent) return;

      const delta = newContent.length - oldContent.length;
      const tableEndOffset = exited.tableStartOffset + oldContent.length;
      const adjustedCaretPos = caretPos >= tableEndOffset ? caretPos + delta : caretPos;

      onChange(newLines.join("\n"));

      const textarea = textareaRef.current;
      if (textarea) {
        setTimeout(() => {
          textarea.setSelectionRange(adjustedCaretPos, adjustedCaretPos);
        }, 0);
      }
    },
    [onChange, textareaRef],
  );

  const detectTableAtCaret = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea || document.activeElement !== textarea) return;

    const pos = textarea.selectionStart;
    const isCollapsed = textarea.selectionEnd === pos;
    const result = isCollapsed ? findTableAtPos(value, pos) : null;

    const prev = lastTableRef.current;
    const sameTable =
      !!prev && !!result && prev.tableStart === result.tableStart && prev.tableEnd === result.tableEnd;

    if (prev && !sameTable) {
      lastTableRef.current = null;
      setTableInfo(null);
      realignExitedTable(prev, pos);
      // The realign above edits the textarea value, which re-triggers this
      // effect with fresh state — bail out and let that pass recompute.
      return;
    }

    if (!result) {
      setTableInfo(null);
      return;
    }

    const caret = getCaretCoordinates(textarea, pos);
    setCalloutPos({
      top: (caret.top || 0) - 36,
      left: Math.min(caret.left || 0, textarea.clientWidth - CALLOUT_WIDTH),
    });

    lastTableRef.current = result;
    setTableInfo(result);
  }, [value, textareaRef, realignExitedTable]);

  // Immediately recalculate callout position on value change for smooth animation
  useLayoutEffect(() => {
    detectTableAtCaret();
  }, [value, detectTableAtCaret]);

  useEffect(() => {
    document.addEventListener("selectionchange", detectTableAtCaret);
    return () => document.removeEventListener("selectionchange", detectTableAtCaret);
  }, [detectTableAtCaret]);

  // Realign the table's column widths, then place the caret at the start of
  // (targetRow, targetCol) — both indices relative to tableInfo.lines.
  const moveToCell = useCallback(
    (targetRow: number, targetCol: number) => {
      const textarea = textareaRef.current;
      if (!tableInfo || !textarea) return;

      const newLines = realignTableLines(tableInfo.lines, tableInfo.tableStart, tableInfo.tableEnd);
      const targetLine = newLines[targetRow];
      const pipeIdx = nthPipeIndex(targetLine, targetCol);
      const cursorPos =
        computeLineOffset(newLines, targetRow) +
        (pipeIdx === -1 ? Math.max(0, targetLine.length - 1) : pipeIdx + 2);

      if (newLines === tableInfo.lines) {
        textarea.focus();
        textarea.setSelectionRange(cursorPos, cursorPos);
      } else {
        applyTableChange(newLines, cursorPos);
      }
    },
    [tableInfo, textareaRef, applyTableChange],
  );

  const handleRemoveTable = useCallback(() => {
    const textarea = textareaRef.current;
    if (!tableInfo || !textarea) return;

    // Compute the absolute end offset of the table block
    const oldTableLineCount = tableInfo.tableEnd - tableInfo.tableStart + 1;
    let tableEndOffset = tableInfo.tableStartOffset;
    for (let i = 0; i < oldTableLineCount; i++) {
      tableEndOffset += tableInfo.lines[tableInfo.tableStart + i].length;
      if (i < oldTableLineCount - 1) tableEndOffset += 1;
    }

    // Include the trailing newline so we don't leave a blank line
    const fullText = textarea.value;
    const selectEnd =
      tableEndOffset < fullText.length && fullText[tableEndOffset] === "\n"
        ? tableEndOffset + 1
        : tableEndOffset;

    textarea.focus();
    textarea.setSelectionRange(tableInfo.tableStartOffset, selectEnd);
    document.execCommand("insertText", false, "");
    setTableInfo(null);
  }, [tableInfo, textareaRef, setTableInfo]);

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

  // Tab: jump between table cells in source mode, realigning columns as it goes.
  // Shift+Tab: jump backward.
  const handleTableTab = useCallback(
    (e: KeyboardEvent): boolean => {
      if (e.key !== "Tab" || !tableInfo) return false;

      const textarea = textareaRef.current;
      if (!textarea || document.activeElement !== textarea) return false;

      const line = tableInfo.lines[tableInfo.lineIdx];
      const lineStart = computeLineOffset(tableInfo.lines, tableInfo.lineIdx);
      const posInLine = textarea.selectionStart - lineStart;

      let targetRow = -1;
      let targetCol = -1;

      if (!e.shiftKey) {
        const nextPipe = line.indexOf("|", posInLine + 1);
        if (nextPipe !== -1 && nextPipe < line.length - 1) {
          targetRow = tableInfo.lineIdx;
          targetCol = tableInfo.cursorCol + 1;
        } else {
          // At last cell — move to first cell of next row (skipping separator)
          let nextRow = tableInfo.lineIdx + 1;
          while (nextRow <= tableInfo.tableEnd && isSeparatorRow(tableInfo.lines[nextRow])) nextRow++;
          if (nextRow <= tableInfo.tableEnd) {
            targetRow = nextRow;
            targetCol = 0;
          }
        }
      } else if (tableInfo.cursorCol > 0) {
        targetRow = tableInfo.lineIdx;
        targetCol = tableInfo.cursorCol - 1;
      } else {
        // At first cell — move to last cell of previous row (skipping separator)
        let prevRow = tableInfo.lineIdx - 1;
        while (prevRow >= tableInfo.tableStart && isSeparatorRow(tableInfo.lines[prevRow])) prevRow--;
        if (prevRow >= tableInfo.tableStart) {
          targetRow = prevRow;
          const pipeCount = (tableInfo.lines[prevRow].match(/\|/g) || []).length;
          targetCol = Math.max(0, pipeCount - 2);
        }
      }

      if (targetRow === -1) return false;
      e.preventDefault();
      moveToCell(targetRow, targetCol);
      return true;
    },
    [tableInfo, textareaRef, moveToCell],
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
      if (isSeparatorRow(line)) return false;

      e.preventDefault();
      const linesWithNewRow = addRow(tableInfo.lines, tableInfo.tableEnd);
      const newRowIdx = tableInfo.tableEnd + 1;
      const realigned = realignTableLines(linesWithNewRow, tableInfo.tableStart, tableInfo.tableEnd + 1);
      const targetLine = realigned[newRowIdx];
      const pipeIdx = nthPipeIndex(targetLine, 0);
      const cursorPos = computeLineOffset(realigned, newRowIdx) + (pipeIdx === -1 ? 0 : pipeIdx + 2);
      applyTableChange(realigned, cursorPos);
      return true;
    },
    [tableInfo, textareaRef, applyTableChange],
  );

  // Arrow Up/Down: snap the cursor to the same column in the row above/below,
  // skipping over the separator row.
  const handleTableArrowVertical = useCallback(
    (e: KeyboardEvent): boolean => {
      if ((e.key !== "ArrowUp" && e.key !== "ArrowDown") || !tableInfo) return false;
      if (e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return false;

      const textarea = textareaRef.current;
      if (!textarea || document.activeElement !== textarea) return false;
      if (textarea.selectionStart !== textarea.selectionEnd) return false;

      const direction = e.key === "ArrowDown" ? 1 : -1;
      let targetRow = tableInfo.lineIdx + direction;
      if (
        targetRow >= tableInfo.tableStart &&
        targetRow <= tableInfo.tableEnd &&
        isSeparatorRow(tableInfo.lines[targetRow])
      ) {
        targetRow += direction;
      }
      if (targetRow < tableInfo.tableStart || targetRow > tableInfo.tableEnd) return false;

      const line = tableInfo.lines[targetRow];
      let pipeIdx = nthPipeIndex(line, tableInfo.cursorCol);
      if (pipeIdx === -1) pipeIdx = line.lastIndexOf("|", Math.max(0, line.length - 2));
      if (pipeIdx === -1) return false;

      e.preventDefault();
      const newPos = computeLineOffset(tableInfo.lines, targetRow) + pipeIdx + 2;
      textarea.setSelectionRange(newPos, newPos);
      return true;
    },
    [tableInfo, textareaRef],
  );

  // Unified keyboard handler for table source shortcuts
  const handleTableKeyDown = useCallback(
    (e: KeyboardEvent): boolean => {
      if (!tableInfo) return false;
      if (handleTableTab(e)) return true;
      if (handleTablePipeEscape(e)) return true;
      if (handleTableEnter(e)) return true;
      if (handleTableArrowVertical(e)) return true;
      return false;
    },
    [tableInfo, handleTableTab, handleTablePipeEscape, handleTableEnter, handleTableArrowVertical],
  );

  const currentAlignment = tableInfo
    ? getColumnAlignment(tableInfo.lines, tableInfo.cursorCol, tableInfo.tableStart)
    : "none";

  return {
    tableInfo,
    setTableInfo,
    calloutPos,
    currentAlignment,
    handleRemoveTable,
    handleCycleAlign,
    handleCopyCSV,
    handleTableKeyDown,
  };
}
