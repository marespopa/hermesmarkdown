"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaTimes } from "react-icons/fa";

import AutocompleteList from "../../../../components/autocomplete/AutocompleteList";
import { buildAutocompleteData } from "../../../../components/autocomplete/build-autocomplete-data";
import { PROMPT_TEMPLATES } from "./prompt-templates";

type Props = {
  contentEdited: string;
  isCompact?: boolean;
  onInsertTemplate?: (template: string) => void;
  showInput?: boolean;
  forceOpen?: boolean;
  autoFocus?: boolean;
  initialPrompt?: string;
  onRequestClose?: () => void;
};

export default function PromptCommandBar({
  contentEdited,
  isCompact = false,
  onInsertTemplate,
  showInput = true,
  forceOpen = false,
  autoFocus = false,
  initialPrompt,
  onRequestClose,
}: Props) {
  const [prompt, setPrompt] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initialPromptRef = useRef<string | undefined>(undefined);
  const initialPromptAppliedRef = useRef(false);

  useEffect(() => {
    if (initialPromptRef.current !== initialPrompt) {
      initialPromptRef.current = initialPrompt;
      initialPromptAppliedRef.current = false;
    }

    if (!initialPromptAppliedRef.current && initialPrompt !== undefined && prompt.length === 0) {
      setPrompt(initialPrompt);
      initialPromptAppliedRef.current = true;
    }
  }, [initialPrompt, prompt.length]);

  const closePromptBar = useCallback(() => {
    textareaRef.current?.blur();
    setPrompt("");
    setActiveIndex(0);
    setIsFocused(false);
    onRequestClose?.();
  }, [onRequestClose]);

  const applyTemplate = useCallback(
    (template: string) => {
      if (onInsertTemplate) {
        onInsertTemplate(template);
        setPrompt("");
      } else {
        setPrompt(template);
      }
      setActiveIndex(0);
    },
    [onInsertTemplate]
  );

  useEffect(() => {
    if (forceOpen) {
      return;
    }

    if (prompt.length === 0 && isFocused) {
      closePromptBar();
    }
  }, [closePromptBar, forceOpen, isFocused, prompt.length]);

  const autocompleteData = useMemo(() => {
    const cursor = textareaRef.current?.selectionStart ?? prompt.length;
    return buildAutocompleteData(prompt, cursor, PROMPT_TEMPLATES);
  }, [prompt]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closePromptBar();
        return;
      }

      if (event.key === "Backspace" && prompt.length === 0) {
        event.preventDefault();
        closePromptBar();
        return;
      }

      if (event.key === "Tab" && autocompleteData.flatItems.length > 0) {
        event.preventDefault();
        const item = autocompleteData.flatItems[Math.min(activeIndex, autocompleteData.flatItems.length - 1)];
        applyTemplate(item.template);
        return;
      }

      if (autocompleteData.flatItems.length > 0) {
        if (event.key === "ArrowDown") {
          setActiveIndex((prev) => Math.min(prev + 1, autocompleteData.flatItems.length - 1));
        }
        if (event.key === "ArrowUp") {
          setActiveIndex((prev) => Math.max(prev - 1, 0));
        }
      }

      if (event.key === "Enter" && autocompleteData.flatItems.length > 0 && !event.shiftKey) {
        event.preventDefault();
        const item = autocompleteData.flatItems[Math.min(activeIndex, autocompleteData.flatItems.length - 1)];
        applyTemplate(item.template);
      }
    },
    [activeIndex, applyTemplate, autocompleteData.flatItems, closePromptBar, prompt.length]
  );

  const handleChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(event.target.value);
  }, []);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  const isOpen = forceOpen || isFocused;

  const listContent = (
    <>
      <div className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400 px-2 pb-1">
        Autocomplete
      </div>
      <AutocompleteList
        groupedItems={autocompleteData.groupedItems}
        activeIndex={activeIndex}
        onSelect={applyTemplate}
      />
    </>
  );

  return (
    <div className={`w-full ${isCompact ? "" : "max-w-xl"}`}>
      <div className="relative flex justify-center">
        {showInput ? (
          <div className="w-full rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg p-2">
            <div className="relative">
              <textarea
                ref={textareaRef}
                rows={1}
                value={prompt}
                autoFocus={autoFocus}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                placeholder="Autocomplete"
                className="w-full rounded-xl px-4 py-3 pr-12 text-base leading-tight transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:pointer-events-none select-none border bg-white text-black border-black shadow hover:bg-amber-50 focus-visible:ring-black dark:bg-neutral-700 dark:text-white dark:border-neutral-600 dark:hover:bg-neutral-800 dark:focus-visible:ring-white placeholder-neutral-500 dark:placeholder-neutral-600 resize-none"
                aria-label="Prompt autocomplete"
              />
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={closePromptBar}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                aria-label="Close prompt"
              >
                <FaTimes className="h-3 w-3" />
              </button>
            </div>
            {isOpen && autocompleteData.flatItems.length > 0 && (
              <div className="mt-2">{listContent}</div>
            )}
          </div>
        ) : (
          isOpen && autocompleteData.flatItems.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg p-2 z-20">
              {listContent}
            </div>
          )
        )}
      </div>
    </div>
  );
}
