"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildAutocompleteData } from "@/app/components/autocomplete/build-autocomplete-data";
import PromptInputContainer from "./molecules/PromptInputContainer";
import AutocompletePanel from "./molecules/AutocompletePanel";
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

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const nextValue = event.target.value;
      if (prompt === "/" && nextValue === "") {
        closePromptBar();
        return;
      }
      setPrompt(nextValue);
    },
    [closePromptBar, prompt]
  );

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  const isOpen = forceOpen || isFocused;
  const hasAutocompleteItems = autocompleteData.flatItems.length > 0;
  const shouldShowPanel = isOpen && hasAutocompleteItems;

  const panel = shouldShowPanel ? (
    <AutocompletePanel
      autocompleteData={autocompleteData}
      activeIndex={activeIndex}
      onSelect={applyTemplate}
      showInline
    />
  ) : null;

  return (
    <div className={`w-full ${isCompact ? "" : "max-w-xl"}`}>
      <div className="relative flex justify-center">
        {showInput ? (
          <PromptInputContainer
            ref={textareaRef}
            value={prompt}
            autoFocus={autoFocus}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onClose={closePromptBar}
            placeholder="Autocomplete"
            inputAriaLabel="Prompt autocomplete"
            closeAriaLabel="Close prompt"
          >
            {panel}
          </PromptInputContainer>
        ) : (
          shouldShowPanel && (
            <AutocompletePanel
              autocompleteData={autocompleteData}
              activeIndex={activeIndex}
              onSelect={applyTemplate}
              showInline={false}
            />
          )
        )}
      </div>
    </div>
  );
}
