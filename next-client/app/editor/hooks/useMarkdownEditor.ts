"use client";

import { useRef, useEffect, useCallback, useState, useMemo } from "react";
import { useAtomValue } from "jotai";
import {
  atom_wordWrap,
  atom_aiBuilderRequest,
} from "@/app/atoms/atoms";
import { SHORTCODES, TAG_CYCLE, TAG_CYCLE_PREV, TODO_CYCLE, TODO_CYCLE_PREV } from "../components/constants";
import { REGEX_CALC, REGEX_CHECKBOX } from "../components/regex";
import { highlightMarkdown } from "../components/MarkdownHighlighter";
import { useEditorAppearance } from "./use-editor-appearance";
import { useEditorSync } from "./use-editor-sync";
import { useEditorTemplates } from "./use-editor-templates";
import { useEditorHandlers } from "./use-editor-handlers";
import { useLinkPill } from "./use-link-pill";
import { useTableCallout } from "./use-table-callout";
import { useTableDialog } from "./useTableDialog";
import { useFormulaOverlay } from "./use-formula-overlay";
import { useAIEditorActions } from "./useAIEditorActions";
import { extractTableSource } from "../utils/tableParser";
import getCaretCoordinates from "textarea-caret";
import {
  computeCollapsedCalloutRanges,
  computeInitialCollapsedCallouts,
  listCalloutTitles,
  stripHiddenRanges,
  restoreHiddenRanges,
  shiftSegmentsForEdit,
  valueOffsetToDisplayOffset,
  displayOffsetToValueOffset,
} from "../utils/callout-folding";

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

  const [isDateExpanded, setIsDateExpanded] = useState(false);

  // Obsidian callout collapse state — session-only, keyed by `${line}:${type}`,
  // never persisted to the file. Seeded once from the file's own `-` markers
  // (so a callout saved collapsed stays collapsed on open, like Obsidian);
  // after that, only the chevron toggle changes it — the marker text itself
  // is never read again.
  const [collapsedObsidianCallouts, setCollapsedObsidianCallouts] = useState<Record<string, boolean>>(
    () => computeInitialCollapsedCallouts(value),
  );

  // Collapsed callout bodies are excluded from the textarea's value entirely
  // (same trick already used for frontmatter, one level up in
  // MarkdownEditor.tsx) so they actually reclaim layout space and the caret
  // skips over them, instead of being hidden-but-still-present like before.
  const ranges = useMemo(
    () => computeCollapsedCalloutRanges(value, collapsedObsidianCallouts),
    [value, collapsedObsidianCallouts],
  );
  const { displayValue, segments } = useMemo(
    () => stripHiddenRanges(value, ranges),
    [value, ranges],
  );

  // Commits a new *display* value (what the textarea actually contains) by
  // re-inserting the held-back collapsed bodies before calling the real
  // onChange — every code path that mutates the editor's text funnels
  // through here instead of calling onChange directly.
  const commitDisplayValue = useCallback(
    (newDisplayValue: string) => {
      const shifted = shiftSegmentsForEdit(segments, displayValue, newDisplayValue);
      onChange(restoreHiddenRanges(newDisplayValue, shifted));
    },
    [segments, displayValue, onChange],
  );

  const pendingSelectionRef = useRef<{ start: number; end: number } | null>(null);
  const toggleObsidianCallout = useCallback((blockId: string, currentlyCollapsed: boolean) => {
    const textarea = textareaRef.current;
    if (textarea) {
      pendingSelectionRef.current = {
        start: displayOffsetToValueOffset(textarea.selectionStart, segments),
        end: displayOffsetToValueOffset(textarea.selectionEnd, segments),
      };
    }
    setCollapsedObsidianCallouts((prev) => ({ ...prev, [blockId]: !currentlyCollapsed }));
  }, [segments]);

  // After a collapse/expand toggle changes which ranges are hidden, restore
  // the caret to the equivalent position in the new display value.
  useEffect(() => {
    const pending = pendingSelectionRef.current;
    if (!pending || !textareaRef.current) return;
    pendingSelectionRef.current = null;
    const start = valueOffsetToDisplayOffset(pending.start, ranges);
    const end = valueOffsetToDisplayOffset(pending.end, ranges);
    textareaRef.current.setSelectionRange(start, end);
  }, [ranges]);

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
    value: displayValue,
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
  } = useLinkPill({ value: displayValue, textareaRef });

  const {
    tableInfo,
    setTableInfo,
    calloutPos,
    currentAlignment,
    handleRemoveTable,
    handleCycleAlign,
    handleCopyCSV,
    handleTableKeyDown,
  } = useTableCallout({ value: displayValue, textareaRef, onChange: commitDisplayValue });

  const tableDialog = useTableDialog({ value: displayValue, textareaRef });

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
    value: displayValue,
    onChange: commitDisplayValue,
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
      const lineStart = displayValue.lastIndexOf("\n", todoMatch.start - 1) + 1;
      const lineEndIdx = displayValue.indexOf("\n", todoMatch.end);
      const lineEnd = lineEndIdx === -1 ? displayValue.length : lineEndIdx;
      const line = displayValue.slice(lineStart, lineEnd);

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
    [todoMatch, textareaRef, displayValue],
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
    handleWikiLinkTrigger,
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
    value: displayValue,
    onChange: commitDisplayValue,
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
    value: displayValue,
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

  const [textareaMounted, setTextareaMounted] = useState(false);
  useEffect(() => {
    const textarea = wrapperRef.current?.querySelector("textarea");
    if (textarea) {
      textareaRef.current = textarea as HTMLTextAreaElement;
      if (onTextareaReady) onTextareaReady(textareaRef.current);
      setTextareaMounted(true);
    }
  }, [onTextareaReady]);

  const { formulaBadges } = useFormulaOverlay({ value: displayValue, textareaRef, textareaMounted, isActivePane });

  // Real chevron buttons (rendered by MarkdownEditor, positioned here via
  // caret coordinates) — same approach already used for the date/workflow
  // pills, and the only reliable one: a click handler on the highlighted
  // overlay can't actually receive clicks, since the transparent textarea
  // sits in front of it and intercepts the hit-test first.
  const [calloutChevrons, setCalloutChevrons] = useState<
    { blockId: string; top: number; collapsed: boolean }[]
  >([]);
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const titles = listCalloutTitles(displayValue, collapsedObsidianCallouts);
    setCalloutChevrons(
      titles.map((t) => ({
        blockId: t.blockId,
        collapsed: t.collapsed,
        top: getCaretCoordinates(textarea, t.offset).top || 0,
      })),
    );
  }, [
    displayValue,
    collapsedObsidianCallouts,
    textareaMounted,
    fontFamily,
    displayFontSize,
    lineHeight,
    letterSpacing,
    wordWrap,
    windowWidth,
  ]);

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
    if (!textarea) return commitDisplayValue(val);

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const textUpToCursor = val.substring(0, start);

    handleSlashMenuTrigger(val);
    handleWikiLinkTrigger(val);

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

    commitDisplayValue(val);
    syncActiveLine();
  }, [commitDisplayValue, handleSlashMenuTrigger, handleWikiLinkTrigger, syncActiveLine]);

  const highlight = useCallback(
    (code: string) => {
      return highlightMarkdown(code, dateMatch, pillRange, tableInfo);
    },
    [dateMatch, pillRange, tableInfo],
  );

  return {
    value: displayValue,
    onChange: commitDisplayValue,
    handleValueChange,
    wrapperRef,
    textareaRef,
    fontFamily,
    displayFontSize,
    lineHeight,
    letterSpacing,
    wordWrap,
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
    collapsedObsidianCallouts,
    toggleObsidianCallout,
    calloutChevrons,
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
    formulaBadges,
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
