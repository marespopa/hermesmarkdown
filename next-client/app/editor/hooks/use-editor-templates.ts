"use client";

import { useState, useMemo, useCallback } from "react";
import { flushSync } from "react-dom";
import { useAtomValue } from "jotai";
import { atom_isAiConfigured } from "@/app/atoms/atoms";
import getCaretCoordinates from "textarea-caret";
import { TEMPLATES, Template, SHORTCODES, LINK_EDITOR_SENTINEL, WIKILINK_EDITOR_SENTINEL, DATE_EDITOR_SENTINEL, TABLE_DIALOG_SENTINEL, FRONTMATTER_WIZARD_SENTINEL, AI_ACTION_SENTINEL_PREFIX, CURSOR_SENTINEL } from "../components/constants";

interface UseEditorTemplatesProps {
  value: string;
  onChange: (value: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  onFrontmatterWizard?: () => void;
  onAIAction?: (id: string) => void;
}

export function useEditorTemplates({
  value,
  onChange,
  textareaRef,
  wrapperRef,
  onFrontmatterWizard,
  onAIAction,
}: UseEditorTemplatesProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [filterQuery, setFilterQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkInsertPos, setLinkInsertPos] = useState<{ start: number; filterLen: number } | null>(null);
  const [wikiLinkDialogOpen, setWikiLinkDialogOpen] = useState(false);
  const [wikiLinkInsertPos, setWikiLinkInsertPos] = useState<{ start: number; filterLen: number } | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [dateInsertPos, setDateInsertPos] = useState<{ start: number; filterLen: number } | null>(null);
  const [dismissedSlashPos, setDismissedSlashPos] = useState<number | null>(null);
  const isAiConfigured = useAtomValue(atom_isAiConfigured);
  const availableTemplates = useMemo(
    () => TEMPLATES.filter((t) => !t.aiOnly || isAiConfigured),
    [isAiConfigured],
  );

  const dismissMenu = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const textUpToCursor = value.substring(0, start);
    const lastNewLine = textUpToCursor.lastIndexOf("\n");
    const currentLineUpToCursor = textUpToCursor.substring(lastNewLine + 1);
    const slashIndex = currentLineUpToCursor.lastIndexOf("/");
    if (slashIndex !== -1) {
      setDismissedSlashPos(lastNewLine + 1 + slashIndex);
    }
    setMenuOpen(false);
  }, [value, textareaRef]);

  const filteredTemplatesList = useMemo(() => {
    if (!filterQuery) return availableTemplates.map((t) => ({ ...t, matchIndices: [] as number[] }));
    const q = filterQuery.toLowerCase();
    const results: (Template & { matchIndices: number[] })[] = [];
    for (const t of availableTemplates) {
      const hay = t.label.toLowerCase();
      const indices: number[] = [];
      let qi = 0;
      for (let hi = 0; hi < hay.length && qi < q.length; hi++) {
        if (hay[hi] === q[qi]) { indices.push(hi); qi++; }
      }
      if (qi === q.length) results.push({ ...t, matchIndices: indices });
    }
    return results;
  }, [filterQuery, availableTemplates]);

  const insertTemplate = useCallback((content: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const lengthToRemove = filterQuery.length + 1;

    if (content === LINK_EDITOR_SENTINEL) {
      setMenuOpen(false);
      setFilterQuery("");
      setLinkInsertPos({ start, filterLen: lengthToRemove });
      setLinkDialogOpen(true);
      return;
    }

    if (content === WIKILINK_EDITOR_SENTINEL) {
      setMenuOpen(false);
      setFilterQuery("");
      setWikiLinkInsertPos({ start, filterLen: lengthToRemove });
      setWikiLinkDialogOpen(true);
      return;
    }

    if (content === DATE_EDITOR_SENTINEL) {
      setMenuOpen(false);
      setFilterQuery("");
      setDateInsertPos({ start, filterLen: lengthToRemove });
      setDatePickerOpen(true);
      return;
    }

    if (content === TABLE_DIALOG_SENTINEL) {
      const defaultTable =
        `| ${CURSOR_SENTINEL}Header 1 | Header 2 | Header 3 |\n` +
        `| -------- | -------- | -------- |\n` +
        `|          |          |          |\n` +
        `|          |          |          |`;
      const sentinelIdx = defaultTable.indexOf(CURSOR_SENTINEL);
      const cleanTable = defaultTable.replace(CURSOR_SENTINEL, "");
      const insertStart = start - lengthToRemove;
      textarea.focus();
      textarea.setSelectionRange(insertStart, start);
      document.execCommand("insertText", false, cleanTable);
      setMenuOpen(false);
      setFilterQuery("");
      if (sentinelIdx !== -1) {
        const newPos = insertStart + sentinelIdx;
        textarea.setSelectionRange(newPos, newPos);
      }
      return;
    }

    if (content === FRONTMATTER_WIZARD_SENTINEL) {
      setMenuOpen(false);
      setFilterQuery("");
      setSelectedIndex(-1);
      onFrontmatterWizard?.();
      return;
    }

    if (content.startsWith(AI_ACTION_SENTINEL_PREFIX)) {
      const actionId = content.slice(AI_ACTION_SENTINEL_PREFIX.length);
      setMenuOpen(false);
      setFilterQuery("");
      setSelectedIndex(-1);
      // Remove the slash command before calling the handler
      const before = value.substring(0, start - lengthToRemove);
      const after = value.substring(start);
      onChange(before + after);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(before.length, before.length);
          onAIAction?.(actionId);
        }
      }, 0);
      return;
    }

    const before = value.substring(0, start - lengthToRemove);

    let processedContent = content;
    Object.entries(SHORTCODES).forEach(([code, getValue]) => {
      const escapedCode = code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(?<!\\\\)${escapedCode}`, "g");
      processedContent = processedContent.replace(regex, getValue());
    });

    processedContent = processedContent.replace(/\\(\{[\w]+\})/g, "$1");
    processedContent = processedContent.replace(/\\\.\.d/g, "..d");

    // Detect and strip cursor sentinel (\0) — cursor will be placed at its position
    const sentinelIdx = processedContent.indexOf(CURSOR_SENTINEL);
    const cleanContent = sentinelIdx !== -1
      ? processedContent.replace(CURSOR_SENTINEL, "")
      : processedContent;

    const scrollPos = wrapperRef.current?.scrollTop;

    // Insert via execCommand (not a direct setState) so the browser records the
    // edit on its native undo stack — same trick used for paste/calc/shortcodes.
    textarea.focus();
    textarea.setSelectionRange(start - lengthToRemove, start);
    document.execCommand("insertText", false, cleanContent);

    setMenuOpen(false);
    setFilterQuery("");

    if (sentinelIdx !== -1) {
      const newPos = before.length + sentinelIdx;
      textarea.setSelectionRange(newPos, newPos);
    }

    if (wrapperRef.current && scrollPos !== undefined) {
      wrapperRef.current.scrollTop = scrollPos;
    }
  }, [value, filterQuery, textareaRef, wrapperRef, onFrontmatterWizard, onAIAction]);

  const handleSlashMenuTrigger = useCallback((val: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const textUpToCursor = val.substring(0, start);

    const lastNewLine = textUpToCursor.lastIndexOf("\n");
    const currentLineUpToCursor = textUpToCursor.substring(lastNewLine + 1);
    const slashIndex = currentLineUpToCursor.lastIndexOf("/");

    if (
      slashIndex !== -1 &&
      (slashIndex === 0 || currentLineUpToCursor[slashIndex - 1] === " ")
    ) {
      const absoluteSlashIndex = lastNewLine + 1 + slashIndex;
      const query = currentLineUpToCursor.substring(slashIndex + 1);

      if (dismissedSlashPos !== null && (absoluteSlashIndex !== dismissedSlashPos || query === "")) {
        setDismissedSlashPos(null);
      }

      if (dismissedSlashPos === absoluteSlashIndex && query !== "") {
        setMenuOpen(false);
        return;
      }

      if (!query.includes(" ")) {
        const textFromSlash = currentLineUpToCursor.substring(slashIndex);
        const isPath = /^\/(Users|home|tmp|etc|var|usr|bin|opt|dev|proc|sys|sbin|lib|local|mnt|media|srv|run|root|C:)(\/|$)/i.test(textFromSlash) ||
          /^\/[a-zA-Z0-9._-]+\//.test(textFromSlash) ||
          textFromSlash.startsWith("./") ||
          textFromSlash.startsWith("../");

        if (isPath) {
          setMenuOpen(false);
          return;
        }

        const queryFiltered = availableTemplates.filter((t) =>
          t.label.toLowerCase().includes(query.toLowerCase()),
        );

        if (queryFiltered.length === 0) {
          setMenuOpen(false);
          return;
        }

        setFilterQuery(query);
        setSelectedIndex(-1);

        // Recalculate position on every keystroke so that when the menu appears
        // above the cursor (shouldShowUp), its top tracks the actual rendered
        // height (which shrinks as the filter narrows results).
        const caret = getCaretCoordinates(textarea, start - query.length);
        const caretTop = Number.isFinite(caret.top) ? caret.top : 0;
        const caretLeft = Number.isFinite(caret.left) ? caret.left : 0;
        const lineHeight = (Number.isFinite(caret.height) && caret.height > 0) ? caret.height : 24;

        // Estimate actual rendered menu height from filtered result count
        const itemHeight = 32;
        const containerPad = 8;
        const maxMenuHeight = 208; // max-h-52
        const estimatedMenuHeight = Math.min(
          Math.max(queryFiltered.length, 1) * itemHeight + containerPad,
          maxMenuHeight,
        );

        const spaceBelow =
          textarea.clientHeight - (caretTop + lineHeight - textarea.scrollTop);
        const shouldShowUp =
          spaceBelow < maxMenuHeight && caretTop > maxMenuHeight;

        setMenuPos({
          top: shouldShowUp
            ? caretTop - estimatedMenuHeight - lineHeight - 4
            : caretTop + lineHeight + 4,
          left: Math.min(caretLeft, textarea.clientWidth - 234),
        });
        setMenuOpen(true);
      } else {
        setMenuOpen(false);
      }
    } else {
      setMenuOpen(false);
      setDismissedSlashPos(null);
    }
  }, [textareaRef, dismissedSlashPos, availableTemplates]);

  const handleWikiLinkTrigger = useCallback((val: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const textUpToCursor = val.substring(0, start);

    if (
      textUpToCursor.endsWith("[[") &&
      textUpToCursor[textUpToCursor.length - 3] !== "["
    ) {
      setWikiLinkInsertPos({ start, filterLen: 2 });
      setWikiLinkDialogOpen(true);
    }
  }, [textareaRef]);

  const insertDate = useCallback((date: Date) => {
    const textarea = textareaRef.current;
    if (!textarea || !dateInsertPos) return;

    const { start, filterLen } = dateInsertPos;
    const before = value.substring(0, start - filterLen);
    const after = value.substring(start);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${d}`;
    const newValue = before + dateStr + after;

    const scrollPos = wrapperRef.current?.scrollTop;

    flushSync(() => {
      onChange(newValue);
      setDatePickerOpen(false);
      setDateInsertPos(null);
    });

    textarea.focus();
    const newPos = before.length + dateStr.length;
    textarea.setSelectionRange(newPos, newPos);

    if (wrapperRef.current && scrollPos !== undefined) {
      wrapperRef.current.scrollTop = scrollPos;
    }
  }, [value, onChange, textareaRef, wrapperRef, dateInsertPos]);

  const insertLink = useCallback((label: string, url: string) => {
    const textarea = textareaRef.current;
    if (!textarea || !linkInsertPos) return;

    const { start, filterLen } = linkInsertPos;
    const before = value.substring(0, start - filterLen);
    const after = value.substring(start);
    const linkText = `[${label}](${url})`;
    const newValue = before + linkText + after;

    const scrollPos = wrapperRef.current?.scrollTop;

    flushSync(() => {
      onChange(newValue);
      setLinkDialogOpen(false);
      setLinkInsertPos(null);
    });

    textarea.focus();
    const newPos = before.length + linkText.length;
    textarea.setSelectionRange(newPos, newPos);

    if (wrapperRef.current && scrollPos !== undefined) {
      wrapperRef.current.scrollTop = scrollPos;
    }
  }, [value, onChange, textareaRef, wrapperRef, linkInsertPos]);

  const insertWikiLink = useCallback((name: string) => {
    const textarea = textareaRef.current;
    if (!textarea || !wikiLinkInsertPos) return;

    const { start, filterLen } = wikiLinkInsertPos;
    const before = value.substring(0, start - filterLen);
    const after = value.substring(start);
    const linkText = `[[${name}]]`;
    const newValue = before + linkText + after;

    const scrollPos = wrapperRef.current?.scrollTop;

    flushSync(() => {
      onChange(newValue);
      setWikiLinkDialogOpen(false);
      setWikiLinkInsertPos(null);
    });

    textarea.focus();
    const newPos = before.length + linkText.length;
    textarea.setSelectionRange(newPos, newPos);

    if (wrapperRef.current && scrollPos !== undefined) {
      wrapperRef.current.scrollTop = scrollPos;
    }
  }, [value, onChange, textareaRef, wrapperRef, wikiLinkInsertPos]);

  return {
    menuOpen,
    setMenuOpen,
    menuPos,
    setMenuPos,
    filterQuery,
    setFilterQuery,
    selectedIndex,
    setSelectedIndex,
    filteredTemplates: filteredTemplatesList,
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
  };
}
