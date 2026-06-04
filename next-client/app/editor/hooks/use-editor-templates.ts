"use client";

import { useState, useMemo, useCallback } from "react";
import getCaretCoordinates from "textarea-caret";
import { TEMPLATES, SHORTCODES } from "../components/constants";
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
  const [selectedIndex, setSelectedIndex] = useState(0);

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
      const query = currentLineUpToCursor.substring(slashIndex + 1);
      if (!query.includes(" ")) {
        setFilterQuery(query);
        setSelectedIndex(0);

        if (!menuOpen) {
          const caret = getCaretCoordinates(textarea, start - query.length);
          const menuHeight = 240;

          const spaceBelow =
            textarea.clientHeight - (caret.top - textarea.scrollTop);
          const shouldShowUp =
            spaceBelow < menuHeight && caret.top > menuHeight;

          setMenuPos({
            top: shouldShowUp ? caret.top - menuHeight - 8 : caret.top + 24,
            left: Math.min(caret.left, textarea.clientWidth - 220),
          });
          setMenuOpen(true);
        }
      } else {
        setMenuOpen(false);
      }
    } else {
      setMenuOpen(false);
    }
  }, [menuOpen, textareaRef]);

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
  };
}
