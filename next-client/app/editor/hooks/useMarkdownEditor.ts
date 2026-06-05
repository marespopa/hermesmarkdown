"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { useAtomValue } from "jotai";
import {
  atom_wordWrap,
  atom_isZenModeActive,
} from "@/app/atoms/atoms";
import { SHORTCODES } from "../components/constants";
import { runAutoBudget } from "../utils/budget";
import { REGEX_CALC } from "../components/regex";
import { highlightMarkdown } from "../components/MarkdownHighlighter";
import { useEditorAppearance } from "./use-editor-appearance";
import { useEditorSync } from "./use-editor-sync";
import { useEditorTemplates } from "./use-editor-templates";
import { useEditorHandlers } from "./use-editor-handlers";
import { useLinkPill } from "./use-link-pill";

interface UseMarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onTextareaReady?: (element: HTMLTextAreaElement | null) => void;
  onWikiLinkClick?: (name: string) => void;
}

export function useMarkdownEditor({ 
  value, 
  onChange, 
  onTextareaReady, 
  onWikiLinkClick 
}: UseMarkdownEditorProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const wordWrap = useAtomValue(atom_wordWrap);
  const isZenModeActive = useAtomValue(atom_isZenModeActive);

  const [isDateExpanded, setIsDateExpanded] = useState(false);

  const {
    fontFamily,
    displayFontSize,
    windowWidth,
    widthClass,
    paddingClass,
  } = useEditorAppearance();

  const {
    activeLineIndex,
    dateMatch,
    setDateMatch,
    dateMenuPos,
    syncActiveLine,
    syncScroll,
  } = useEditorSync({
    value,
    textareaRef,
    wrapperRef,
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

  const [wikiLinkDialogOpen, setWikiLinkDialogOpen] = useState(false);

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
    datePickerOpen,
    setDatePickerOpen,
    insertDate,
    dismissMenu,
  } = useEditorTemplates({
    value,
    onChange,
    textareaRef,
  });

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

    const nextVal = runAutoBudget(val);

    const calcMatch = textUpToCursor.match(REGEX_CALC);
    if (calcMatch) {
      const mathExpression = calcMatch[1];
      const fullMatchString = calcMatch[0];
      const sanitized = mathExpression.replace(/[^-()\d/*+.]/g, "");
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

    onChange(nextVal);

    requestAnimationFrame(() => {
      if (textareaRef.current && nextVal !== val) {
        textareaRef.current.setSelectionRange(start, end);
      }
      syncScroll();
      syncActiveLine();
    });
  }, [onChange, handleSlashMenuTrigger, syncScroll, syncActiveLine]);

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
    insertLink,
    datePickerOpen,
    setDatePickerOpen,
    insertDate,
    dismissMenu,
  };
}
