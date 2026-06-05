"use client";

import { useState, useMemo, useCallback } from "react";
import getCaretCoordinates from "textarea-caret";
import { TEMPLATES, SHORTCODES, LINK_EDITOR_SENTINEL, WIKILINK_EDITOR_SENTINEL, DATE_EDITOR_SENTINEL } from "../components/constants";
import { runAutoBudget } from "../utils/budget";

interface UseEditorTemplatesProps {
  value: string;
  onChange: (value: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export function useEditorTemplates({
  value,
  onChange,
  textareaRef,
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

  const filteredTemplatesList = useMemo(
    () =>
      TEMPLATES.filter((t) =>
        t.label.toLowerCase().includes(filterQuery.toLowerCase()),
      ),
    [filterQuery],
  );

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

    const before = value.substring(0, start - lengthToRemove);
    const after = value.substring(start);

    let processedContent = content;
    Object.entries(SHORTCODES).forEach(([code, getValue]) => {
      const escapedCode = code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(?<!\\\\)${escapedCode}`, "g");
      processedContent = processedContent.replace(regex, getValue());
    });

    processedContent = processedContent.replace(/\\(\{[\w]+\})/g, "$1");
    processedContent = processedContent.replace(/\\\.\.d/g, "..d");

    const fullNewValue = before + processedContent + after;
    const budgetedValue = runAutoBudget(fullNewValue);

    onChange(budgetedValue);
    setMenuOpen(false);
    setFilterQuery("");

    requestAnimationFrame(() => {
      textarea.focus();
      const newPos = before.length + processedContent.length;
      textarea.setSelectionRange(newPos, newPos);
    });
  }, [value, onChange, filterQuery, textareaRef]);

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

        const queryFiltered = TEMPLATES.filter((t) =>
          t.label.toLowerCase().includes(query.toLowerCase()),
        );

        if (queryFiltered.length === 0) {
          setMenuOpen(false);
          return;
        }

        setFilterQuery(query);
        setSelectedIndex(-1);

        if (!menuOpen) {
          const caret = getCaretCoordinates(textarea, start - query.length);
          const menuHeight = 240;
          const caretTop = Number.isFinite(caret.top) ? caret.top : 0;
          const caretLeft = Number.isFinite(caret.left) ? caret.left : 0;

          const spaceBelow =
            textarea.clientHeight - (caretTop - textarea.scrollTop);
          const shouldShowUp =
            spaceBelow < menuHeight && caretTop > menuHeight;

          setMenuPos({
            top: shouldShowUp ? caretTop - menuHeight - 8 : caretTop + 24,
            left: Math.min(caretLeft, textarea.clientWidth - 234),
          });
          setMenuOpen(true);
        }
      } else {
        setMenuOpen(false);
      }
    } else {
      setMenuOpen(false);
      setDismissedSlashPos(null);
    }
  }, [menuOpen, textareaRef, dismissedSlashPos]);

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

    onChange(newValue);
    setDatePickerOpen(false);
    setDateInsertPos(null);

    requestAnimationFrame(() => {
      textarea.focus();
      const newPos = before.length + dateStr.length;
      textarea.setSelectionRange(newPos, newPos);
    });
  }, [value, onChange, textareaRef, dateInsertPos]);

  const insertLink = useCallback((label: string, url: string) => {
    const textarea = textareaRef.current;
    if (!textarea || !linkInsertPos) return;

    const { start, filterLen } = linkInsertPos;
    const before = value.substring(0, start - filterLen);
    const after = value.substring(start);
    const linkText = `[${label}](${url})`;
    const newValue = before + linkText + after;

    onChange(newValue);
    setLinkDialogOpen(false);
    setLinkInsertPos(null);

    requestAnimationFrame(() => {
      textarea.focus();
      const newPos = before.length + linkText.length;
      textarea.setSelectionRange(newPos, newPos);
    });
  }, [value, onChange, textareaRef, linkInsertPos]);

  const insertWikiLink = useCallback((name: string) => {
    const textarea = textareaRef.current;
    if (!textarea || !wikiLinkInsertPos) return;

    const { start, filterLen } = wikiLinkInsertPos;
    const before = value.substring(0, start - filterLen);
    const after = value.substring(start);
    const linkText = `[[${name}]]`;
    const newValue = before + linkText + after;

    onChange(newValue);
    setWikiLinkDialogOpen(false);
    setWikiLinkInsertPos(null);

    requestAnimationFrame(() => {
      textarea.focus();
      const newPos = before.length + linkText.length;
      textarea.setSelectionRange(newPos, newPos);
    });
  }, [value, onChange, textareaRef, wikiLinkInsertPos]);

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
