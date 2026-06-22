"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { flushSync } from "react-dom";
import { useAtomValue } from "jotai";
import {
  atom_wordWrap,
  atom_isZenModeActive,
  atom_currency,
  atom_aiBuilderRequest,
} from "@/app/atoms/atoms";
import { SHORTCODES, TAG_CYCLE, TAG_CYCLE_PREV, TODO_CYCLE, TODO_CYCLE_PREV } from "../components/constants";
import { runAutoBudget } from "../utils/budget";
import { REGEX_CALC, REGEX_CHECKBOX } from "../components/regex";
import { highlightMarkdown } from "../components/MarkdownHighlighter";
import { useEditorAppearance } from "./use-editor-appearance";
import { useEditorSync } from "./use-editor-sync";
import { useEditorTemplates } from "./use-editor-templates";
import { useEditorHandlers } from "./use-editor-handlers";
import { useLinkPill } from "./use-link-pill";
import { useTableCallout } from "./use-table-callout";
import { useTableDialog } from "./useTableDialog";
import { useAIEditorActions } from "./useAIEditorActions";
import { extractTableSource } from "../utils/tableParser";

interface UseMarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onTextareaReady?: (element: HTMLTextAreaElement | null) => void;
  onWikiLinkClick?: (name: string) => void;
  onFrontmatterWizard?: () => void;
  isActivePane?: boolean;
}

export function useMarkdownEditor({
  value,
  onChange,
  onTextareaReady,
  onWikiLinkClick,
  onFrontmatterWizard,
  isActivePane = true,
}: UseMarkdownEditorProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const wordWrap = useAtomValue(atom_wordWrap);
  const isZenModeActive = useAtomValue(atom_isZenModeActive);
  const currencyCode = useAtomValue(atom_currency);

  const [isDateExpanded, setIsDateExpanded] = useState(false);

  const {
    fontFamily,
    displayFontSize,
    lineHeight,
    letterSpacing,
    windowWidth,
    widthClass,
    paddingClass,
  } = useEditorAppearance();

  const {
    activeLineIndex,
    dateMatch,
    setDateMatch,
    dateMenuPos,
    workflowMatch,
    workflowMenuPos,
    todoMatch,
    todoMenuPos,
    syncActiveLine,
    syncScroll,
  } = useEditorSync({
    value,
    textareaRef,
    isDateExpanded,
    setIsDateExpanded,
  });

  const {
    pillUrl,
    pillLabel,
    pillPos,
    pillType,
    pillRange,
    setPillUrl,
    detectLinkAtCaret,
  } = useLinkPill({ value, textareaRef });

  const {
    tableInfo,
    setTableInfo,
    calloutPos,
    currentAlignment,
    handleRemoveTable,
    handleCycleAlign,
    handleCopyCSV,
    handleTableKeyDown,
  } = useTableCallout({ value, textareaRef });

  const tableDialog = useTableDialog({ value, textareaRef });

  const {
    isAiLoading,
    aiReview,
    improveWriting,
    expandIdea,
    runPrompt,
    runBuilder,
    applyReplace,
    applyInsertBelow,
    dismissReview,
    runAIActionById,
  } = useAIEditorActions({
    value,
    onChange,
    textareaRef,
  });

  // The AI Builder button lives in the status bar, outside this hook's
  // scope, so it requests a run by bumping a shared counter atom instead.
  const aiBuilderRequest = useAtomValue(atom_aiBuilderRequest);
  const prevAiBuilderRequestRef = useRef(aiBuilderRequest);
  useEffect(() => {
    if (aiBuilderRequest !== prevAiBuilderRequestRef.current) {
      prevAiBuilderRequestRef.current = aiBuilderRequest;
      if (isActivePane) runBuilder();
    }
  }, [aiBuilderRequest, runBuilder, isActivePane]);

  const handleOpenEditDialog = useCallback(() => {
    if (!tableInfo) return;
    // Compute character end offset of the table block
    let endOffset = tableInfo.tableStartOffset;
    for (let i = tableInfo.tableStart; i <= tableInfo.tableEnd; i++) {
      endOffset += tableInfo.lines[i].length;
      if (i < tableInfo.tableEnd) endOffset += 1; // \n
    }
    const source = extractTableSource(
      tableInfo.lines,
      tableInfo.tableStart,
      tableInfo.tableEnd,
    );
    tableDialog.openEdit(source, tableInfo.tableStartOffset, endOffset, tableInfo.cursorRow, tableInfo.cursorCol);
  }, [tableInfo, tableDialog]);

  const handleWorkflowCycle = useCallback(
    (direction: "prev" | "next") => {
      if (!workflowMatch || !textareaRef.current) return;
      const cycle = direction === "next" ? TAG_CYCLE : TAG_CYCLE_PREV;
      const nextTag = workflowMatch.isFmStatus
        ? cycle[workflowMatch.tag]
        : `#${cycle[workflowMatch.tag]}`;
      const textarea = textareaRef.current;
      textarea.focus();
      textarea.setSelectionRange(workflowMatch.start, workflowMatch.end);
      document.execCommand("insertText", false, nextTag);
    },
    [workflowMatch, textareaRef],
  );

  const handleTodoCycle = useCallback(
    (direction: "prev" | "next") => {
      if (!todoMatch || !textareaRef.current) return;
      const cycle = direction === "next" ? TODO_CYCLE : TODO_CYCLE_PREV;
      const nextTagName = cycle[todoMatch.tag];
      const nextTag = `#${nextTagName}`;
      const textarea = textareaRef.current;
      textarea.focus();

      // If the tag sits on a checkbox task line, keep the checkbox state in
      // sync with the #done status (and revert it otherwise).
      const lineStart = value.lastIndexOf("\n", todoMatch.start - 1) + 1;
      const lineEndIdx = value.indexOf("\n", todoMatch.end);
      const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;
      const line = value.slice(lineStart, lineEnd);

      const leadingWs = line.match(/^\s*/)?.[0] ?? "";
      const rawContent = line.slice(leadingWs.length);
      const frontOffset = leadingWs.length;
      const checkboxMatch = REGEX_CHECKBOX.exec(rawContent);

      if (checkboxMatch) {
        const tagStartInContent = todoMatch.start - lineStart - frontOffset;
        const tagEndInContent = todoMatch.end - lineStart - frontOffset;
        const desiredState = nextTagName === "done" ? "x" : " ";
        let newContent =
          rawContent.slice(0, checkboxMatch[1].length) +
          desiredState +
          rawContent.slice(checkboxMatch[1].length + 1);
        newContent = newContent.slice(0, tagStartInContent) + nextTag + newContent.slice(tagEndInContent);

        const newLine = leadingWs + newContent;

        textarea.setSelectionRange(lineStart, lineEnd);
        document.execCommand("insertText", false, newLine);
        const newTagStart = lineStart + leadingWs.length + tagStartInContent;
        textarea.setSelectionRange(newTagStart + nextTag.length, newTagStart + nextTag.length);
        return;
      }

      textarea.setSelectionRange(todoMatch.start, todoMatch.end);
      document.execCommand("insertText", false, nextTag);
    },
    [todoMatch, textareaRef, value],
  );

  const handleSaveLink = useCallback(
    (newLabel: string, newUrl: string) => {
      if (!pillRange || !textareaRef.current) return;
      const textarea = textareaRef.current;
      const newLinkText = `[${newLabel}](${newUrl})`;
      textarea.focus();
      textarea.setRangeText(newLinkText, pillRange.start, pillRange.end, "end");
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      setPillUrl(null);
    },
    [pillRange, textareaRef, setPillUrl],
  );

  const {
    menuOpen,
    setMenuOpen,
    menuPos,
    setMenuPos,
    filterQuery,
    setFilterQuery,
    selectedIndex,
    setSelectedIndex,
    filteredTemplates,
    insertTemplate,
    handleSlashMenuTrigger,
    linkDialogOpen,
    setLinkDialogOpen,
    insertLink,
    wikiLinkDialogOpen,
    setWikiLinkDialogOpen,
    insertWikiLink,
    wikiLinkInsertPos,
    datePickerOpen,
    setDatePickerOpen,
    insertDate,
    dismissMenu,
  } = useEditorTemplates({
    value,
    onChange,
    textareaRef,
    wrapperRef,
    onOpenTableCreate: tableDialog.openCreate,
    onFrontmatterWizard,
    onAIAction: runAIActionById,
  });

  const handleSaveWikiLink = useCallback(
    (newName: string) => {
      if (!pillRange || !textareaRef.current) return;
      const textarea = textareaRef.current;
      const newLinkText = `[[${newName}]]`;
      textarea.focus();
      textarea.setRangeText(newLinkText, pillRange.start, pillRange.end, "end");
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      setPillUrl(null);
      setWikiLinkDialogOpen(false);
    },
    [pillRange, textareaRef, setPillUrl, setWikiLinkDialogOpen],
  );

  const {
    isCtrlPressed,
    isOverLink,
    setIsEditorFocused,
    handleMouseMove,
    handlePaste,
    handleEditorClick,
    handleGlobalKeyDown,
  } = useEditorHandlers({
    value,
    textareaRef,
    onWikiLinkClick,
    dateMatch,
    isDateExpanded,
    setIsDateExpanded,
    menuOpen,
    setDateMatch,
    filteredTemplates,
    selectedIndex,
    setSelectedIndex,
    insertTemplate,
    syncScroll,
    syncActiveLine,
    pillUrl,
    setPillUrl,
    onDetectLinkPill: detectLinkAtCaret,
    dismissMenu,
    onTableKeyDown: handleTableKeyDown,
  });

  useEffect(() => {
    const textarea = wrapperRef.current?.querySelector("textarea");
    if (textarea) {
      textareaRef.current = textarea as HTMLTextAreaElement;
      if (onTextareaReady) onTextareaReady(textareaRef.current);
    }
  }, [onTextareaReady]);

  const handleDateSelect = useCallback((newDate: Date) => {
    if (!dateMatch || !textareaRef.current) return;

    const y = newDate.getFullYear();
    const m = String(newDate.getMonth() + 1).padStart(2, "0");
    const d = String(newDate.getDate()).padStart(2, "0");

    let formatted = "";
    if (dateMatch.format === "iso") formatted = `${y}-${m}-${d}`;
    else if (dateMatch.format === "wiki") formatted = `[[${y}-${m}-${d}]]`;
    else if (dateMatch.format === "slashed") formatted = `${m}/${d}/${y}`;
    else if (dateMatch.format === "dotted") formatted = `${d}.${m}.${y}`;

    textareaRef.current.focus();
    textareaRef.current.setRangeText(formatted, dateMatch.start, dateMatch.end, "end");
    textareaRef.current.dispatchEvent(new Event("input", { bubbles: true }));

    setDateMatch(null);
    setIsDateExpanded(false);
  }, [dateMatch, setDateMatch]);

  const handleValueChange = useCallback((val: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return onChange(val);

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const textUpToCursor = val.substring(0, start);

    handleSlashMenuTrigger(val);

    const nextVal = runAutoBudget(val, currencyCode);
    
    // Calculate cursor offset if the content changed
    let adjustedStart = start;
    let adjustedEnd = end;

    if (nextVal !== val) {
      const originalLines = val.split("\n");
      const nextLines = nextVal.split("\n");
      
      // Find which line the cursor is on
      const linesUpToCursor = textUpToCursor.split("\n");
      const cursorLineIndex = linesUpToCursor.length - 1;

      let offset = 0;
      for (let i = 0; i < cursorLineIndex; i++) {
        offset += (nextLines[i]?.length || 0) - (originalLines[i]?.length || 0);
      }
      
      // If the change happened on the current line before the cursor
      // (Though runAutoBudget currently only changes Total: lines, 
      // which are usually separate lines)
      const currentLineOriginal = originalLines[cursorLineIndex] || "";
      const currentLineNext = nextLines[cursorLineIndex] || "";
      if (currentLineOriginal !== currentLineNext) {
        // Find if the change in the current line is before the cursor column
        // This is a bit more complex, but for now we assume 
        // runAutoBudget doesn't change the current line unless it's a Total: line.
        // If it IS a Total: line, we want the cursor to stay where it was relative to the start of the line if possible,
        // or just move with the text.
        
        // Simple heuristic: if the line changed, add the difference to the offset
        // but only if we're sure it's before the cursor.
        // Since runAutoBudget replaces the whole line, if we are on a Total: line,
        // it's safest to just let the cursor be at the same relative position from the end if we were at the end,
        // or same from start if we were at the start.
        
        // For now, let's just use the full line difference if it's a Total: line
        if (currentLineOriginal.trim().startsWith("Total:")) {
           // If the cursor is on the Total: line, we might need more care.
           // But usually Total: lines aren't edited directly to trigger this.
           // If they are, the offset should be based on where the cursor is.
           // For simplicity, let's just add the difference.
           offset += currentLineNext.length - currentLineOriginal.length;
        }
      }

      adjustedStart += offset;
      adjustedEnd += offset;
    }

    const calcMatch = textUpToCursor.match(REGEX_CALC);
    if (calcMatch) {
      const mathExpression = calcMatch[1];
      const fullMatchString = calcMatch[0];
      const normalized = mathExpression.replace(/(\d),(\d+)/g, (_, pre, post) =>
        post.length <= 2 ? `${pre}.${post}` : `${pre}${post}`
      );
      const sanitized = normalized.replace(/[^-()\d/*+.]/g, "");
      try {
        const result = new Function(`return (${sanitized})`)();
        const replacement = (Math.round(result * 100) / 100).toString();
        const sliceStart = start - fullMatchString.length;
        textarea.setSelectionRange(sliceStart, start);
        document.execCommand("insertText", false, replacement);
        return;
      } catch (e) {
        console.warn("Calculation failed:", e);
      }
    }

    for (const [code, getValue] of Object.entries(SHORTCODES)) {
      const sliceStart = Math.max(0, start - code.length);
      const potentialMatch = val.substring(sliceStart, start);
      if (potentialMatch === code) {
        const replacement = getValue();
        textarea.setSelectionRange(sliceStart, start);
        document.execCommand("insertText", false, replacement);
        return;
      }
    }

    if (nextVal !== val) {
      // Synchronously flush the state update to prevent the browser from 
      // scrolling to the bottom of the textarea when the value is replaced.
      const scrollPos = wrapperRef.current?.scrollTop;
      
      flushSync(() => {
        onChange(nextVal);
      });

      if (textareaRef.current) {
        textareaRef.current.setSelectionRange(adjustedStart, adjustedEnd);
      }
      
      if (wrapperRef.current && scrollPos !== undefined) {
        wrapperRef.current.scrollTop = scrollPos;
      }
      
      syncActiveLine();
    } else {
      onChange(nextVal);
      syncActiveLine();
    }
  }, [onChange, handleSlashMenuTrigger, syncActiveLine, currencyCode, wrapperRef]);

  const highlight = useCallback(
    (code: string) => {
      return highlightMarkdown(
        code,
        isZenModeActive,
        activeLineIndex,
        dateMatch,
        pillRange,
      );
    },
    [isZenModeActive, activeLineIndex, dateMatch, pillRange],
  );

  return {
    value,
    onChange,
    handleValueChange,
    wrapperRef,
    textareaRef,
    fontFamily,
    displayFontSize,
    lineHeight,
    letterSpacing,
    wordWrap,
    isZenModeActive,
    windowWidth,
    menuOpen,
    setMenuOpen,
    activeLineIndex,
    menuPos,
    setMenuPos,
    filterQuery,
    setFilterQuery,
    selectedIndex,
    setSelectedIndex,
    isCtrlPressed,
    isOverLink,
    setIsEditorFocused,
    dateMatch,
    setDateMatch,
    dateMenuPos,
    isDateExpanded,
    setIsDateExpanded,
    handleMouseMove,
    handlePaste,
    handleDateSelect,
    handleEditorClick,
    handleGlobalKeyDown,
    insertTemplate,
    filteredTemplates,
    highlight,
    widthClass,
    paddingClass,
    syncScroll,
    syncActiveLine,
    pillUrl,
    pillLabel,
    pillPos,
    pillType,
    pillRange,
    setPillUrl,
    handleSaveLink,
    handleSaveWikiLink,
    linkDialogOpen,
    setLinkDialogOpen,
    wikiLinkDialogOpen,
    setWikiLinkDialogOpen,
    insertWikiLink,
    wikiLinkInsertPos,
    insertLink,
    datePickerOpen,
    setDatePickerOpen,
    insertDate,
    dismissMenu,
    tableInfo,
    setTableInfo,
    calloutPos,
    currentAlignment,
    handleRemoveTable,
    handleCycleAlign,
    handleCopyCSV,
    tableDialog,
    handleOpenEditDialog,
    workflowMatch,
    workflowMenuPos,
    handleWorkflowCycle,
    todoMatch,
    todoMenuPos,
    handleTodoCycle,
    isAiLoading,
    aiReview,
    improveWriting,
    expandIdea,
    runPrompt,
    applyReplace,
    applyInsertBelow,
    dismissReview,
  };
}
