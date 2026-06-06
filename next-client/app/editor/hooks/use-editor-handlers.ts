"use client";

import { useState, useCallback, useEffect } from "react";
import { useAtom } from "jotai";
import { atom_isEditorFocused } from "@/app/atoms/atoms";
import { findLinkAtPos } from "../utils/link-detection";
import { REGEX_URL_PASTE, REGEX_TODO_TAGS, REGEX_CHECKBOX } from "../components/regex";
import { TAG_CYCLE } from "../components/constants";
import { DateMatch } from "../types";

interface UseEditorHandlersProps {
  value: string;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onWikiLinkClick?: (name: string) => void;
  dateMatch: DateMatch | null;
  isDateExpanded: boolean;
  setIsDateExpanded: (expanded: boolean) => void;
  menuOpen: boolean;
  setDateMatch: (match: DateMatch | null) => void;
  filteredTemplates: any[];
  selectedIndex: number;
  setSelectedIndex: (index: number | ((prev: number) => number)) => void;
  insertTemplate: (content: string) => void;
  syncScroll: () => void;
  syncActiveLine: () => void;
  pillUrl: string | null;
  setPillUrl: (url: string | null) => void;
  onDetectLinkPill?: () => void;
  dismissMenu: () => void;
  onTableKeyDown?: (e: KeyboardEvent) => boolean;
}

export function useEditorHandlers({
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
  onDetectLinkPill,
  dismissMenu,
  onTableKeyDown,
}: UseEditorHandlersProps) {
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  const [isOverLink, setIsOverLink] = useState(false);
  const [, setIsEditorFocused] = useAtom(atom_isEditorFocused);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) setIsCtrlPressed(true);
    };
    const handleKeyUp = () => setIsCtrlPressed(false);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<any>) => {
      if (!e.ctrlKey && !e.metaKey) {
        setIsOverLink(false);
        return;
      }
      const target = e.currentTarget as HTMLTextAreaElement;
      if (target.selectionStart === undefined) return;
      const link = findLinkAtPos(value, target.selectionStart);
      setIsOverLink(!!link);
    },
    [value],
  );

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData("text");

    if (REGEX_URL_PASTE.test(pastedText.trim())) {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const url = pastedText.trim();
      const markdownLink = `[link](${url})`;
      document.execCommand("insertText", false, markdownLink);

      const endPos = textarea.selectionStart;
      const startPos = endPos - markdownLink.length + 1;
      const linkWordEnd = startPos + 4;

      requestAnimationFrame(() => {
        textarea.setSelectionRange(startPos, linkWordEnd);
      });
    }
  }, [textareaRef]);

  const handleEditorClick = useCallback((e: React.MouseEvent<any>) => {
    const textarea = e.currentTarget as HTMLTextAreaElement;
    if (textarea.selectionStart === undefined) return;
    const pos = textarea.selectionStart;

    if (e.ctrlKey || e.metaKey) {
      const link = findLinkAtPos(value, pos);
      if (link) {
        e.preventDefault();
        if (link.type === "url") {
          window.open(link.value, "_blank", "noopener,noreferrer");
        } else if (onWikiLinkClick) {
          onWikiLinkClick(link.value);
        }
        return;
      }
    }

    const textBefore = value.substring(0, pos);
    const lineStartIndex = textBefore.lastIndexOf("\n") + 1;
    const lineEndIndex =
      value.indexOf("\n", pos) === -1 ? value.length : value.indexOf("\n", pos);
    const currentLine = value.substring(lineStartIndex, lineEndIndex);

    REGEX_TODO_TAGS.lastIndex = 0;
    let tagMatch;
    while ((tagMatch = REGEX_TODO_TAGS.exec(currentLine)) !== null) {
      const tagStart = lineStartIndex + tagMatch.index;
      const tagEnd = tagStart + tagMatch[0].length;
      if (pos >= tagStart && pos <= tagEnd) {
        e.preventDefault();
        const nextTag = `#${TAG_CYCLE[tagMatch[1].toLowerCase()]}`;
        textarea.setSelectionRange(tagStart, tagEnd);
        document.execCommand("insertText", false, nextTag);
        return;
      }
    }

    const checkboxMatch = currentLine.match(REGEX_CHECKBOX);
    if (checkboxMatch) {
      const boxStart = lineStartIndex + checkboxMatch[0].indexOf("[");
      const boxEnd = lineStartIndex + checkboxMatch[0].indexOf("]") + 1;
      if (pos >= boxStart && pos <= boxEnd) {
        e.preventDefault();
        const charIdx = lineStartIndex + checkboxMatch[1].length;
        const nextChar = value[charIdx].toLowerCase() === "x" ? " " : "x";
        textarea.setSelectionRange(charIdx, charIdx + 1);
        document.execCommand("insertText", false, nextChar);
      }
    }

    syncScroll();
    syncActiveLine();
    onDetectLinkPill?.();
  }, [value, onWikiLinkClick, syncActiveLine, syncScroll, onDetectLinkPill]);

  const handleGlobalKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Table source keyboard shortcuts (Tab, Enter, |) take highest priority
    if (onTableKeyDown?.(e.nativeEvent as KeyboardEvent)) return;

    if (e.altKey && e.key === "ArrowDown" && dateMatch) {
      e.preventDefault();
      setIsDateExpanded(true);
      return;
    }

    if (e.key === "Escape") {
      // Always prevent browser back-navigation on tablet/mobile keyboards.
      e.preventDefault();
      if (pillUrl) {
        e.stopPropagation();
        setPillUrl(null);
        return;
      }
      if (isDateExpanded) {
        e.stopPropagation();
        setIsDateExpanded(false);
        return;
      }
      if (menuOpen) {
        e.stopPropagation();
        dismissMenu();
        setDateMatch(null);
        return;
      }
    }

    if (e.ctrlKey || e.metaKey) {
      if (e.key === "Enter" && pillUrl) {
        e.preventDefault();
        window.open(pillUrl, "_blank", "noopener,noreferrer");
        setPillUrl(null);
        return;
      }
      if (e.key === "b") {
        e.preventDefault();
        e.stopPropagation();
        const textarea = textareaRef.current;
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = value.substring(start, end);
        const replacement = `**${selectedText}**`;
        textarea.setSelectionRange(start, end);
        document.execCommand("insertText", false, replacement);
        return;
      }
      if (e.key === "i") {
        e.preventDefault();
        e.stopPropagation();
        const textarea = textareaRef.current;
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = value.substring(start, end);
        const replacement = `_${selectedText}_`;
        textarea.setSelectionRange(start, end);
        document.execCommand("insertText", false, replacement);
        return;
      }
    }

    if (menuOpen) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((prev) => prev === -1 ? 0 : (prev + 1) % filteredTemplates.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex(
          (prev) => prev === -1 ? filteredTemplates.length - 1 : (prev - 1 + filteredTemplates.length) % filteredTemplates.length,
        );
      } else if (e.key === "Enter" || e.key === "Tab") {
        if (selectedIndex !== -1) {
          e.preventDefault();
          e.stopPropagation();
          if (filteredTemplates[selectedIndex]) {
            insertTemplate(filteredTemplates[selectedIndex].content);
          }
        }
      }
    }
  }, [dateMatch, isDateExpanded, setIsDateExpanded, menuOpen, setDateMatch, value, textareaRef, filteredTemplates, selectedIndex, setSelectedIndex, insertTemplate, pillUrl, setPillUrl, dismissMenu, onTableKeyDown]);

  return {
    isCtrlPressed,
    isOverLink,
    setIsEditorFocused,
    handleMouseMove,
    handlePaste,
    handleEditorClick,
    handleGlobalKeyDown,
  };
}
