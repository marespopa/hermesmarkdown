import { useCallback, useState } from "react";
import { callAI } from "@/app/services/ai";
import { showSuccessToast, showErrorToast } from "@/app/components/Toastr";

interface UseAIEditorActionsProps {
  value: string;
  onChange: (value: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export function useAIEditorActions({
  value,
  textareaRef,
}: UseAIEditorActionsProps) {
  const [isAiLoading, setIsAiLoading] = useState(false);

  const getContext = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return { selectedText: "", surroundingText: "", start: 0, end: 0 };

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    // Get surrounding context for expansion
    const contextStart = Math.max(0, start - 300);
    const contextEnd = Math.min(value.length, end + 300);
    const surroundingText =
      value.substring(contextStart, start) + value.substring(end, contextEnd);

    return { selectedText, surroundingText, start, end };
  }, [value, textareaRef]);

  const improveWriting = useCallback(async () => {
    const { selectedText, start, end } = getContext();
    if (!selectedText.trim()) {
      showErrorToast("Select some text to improve.");
      return;
    }

    setIsAiLoading(true);
    try {
      const improved = await callAI(
        "You are a writing editor. Improve clarity, flow, and conciseness. Preserve the author's voice, meaning, and any Markdown formatting (bold, italics, lists) exactly. Do NOT add blockquote markers (>) to any line that did not already have them. Return ONLY the rewritten text with no preamble, explanation, or surrounding quotes.",
        `REWRITE THIS TEXT:\n${selectedText}`
      );

      const textarea = textareaRef.current;
      if (textarea) {
        textarea.focus();
        textarea.setRangeText(improved.trim(), start, end, "end");
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
        showSuccessToast("Writing improved!");
      }
    } catch (error: any) {
      showErrorToast(error.message || "Failed to improve writing.");
    } finally {
      setIsAiLoading(false);
    }
  }, [getContext, textareaRef]);

  const expandIdea = useCallback(async () => {
    const { selectedText, surroundingText, start, end } = getContext();
    if (!selectedText.trim()) {
      showErrorToast("Select an idea to expand.");
      return;
    }

    setIsAiLoading(true);
    try {
      const expanded = await callAI(
        "You are a thinking partner. Expand the selected idea with depth and clarity. Match the writer's existing tone and preserve any existing Markdown syntax. Do NOT add blockquote markers (>) to any line that did not already have them. Do NOT repeat the original text as a header or preamble. Return ONLY the final expanded text with no explanation or surrounding quotes.",
        `EXPAND THIS IDEA:\n${selectedText}${surroundingText ? `\n\nSURROUNDING CONTEXT (for tone reference only):\n${surroundingText}` : ""}`
      );

      const textarea = textareaRef.current;
      if (textarea) {
        textarea.focus();
        textarea.setRangeText(expanded.trim(), start, end, "end");
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
        showSuccessToast("Idea expanded!");
      }
    } catch (error: any) {
      showErrorToast(error.message || "Failed to expand idea.");
    } finally {
      setIsAiLoading(false);
    }
  }, [getContext, textareaRef]);

  const runPrompt = useCallback(async () => {
    const { selectedText, start, end } = getContext();
    if (!selectedText.trim()) {
      showErrorToast("Select some text to use as a prompt.");
      return;
    }

    setIsAiLoading(true);
    try {
      const response = await callAI(
        "You are a helpful assistant. Fulfill the user's request provided in the prompt. Return ONLY the result of the request with no preamble, explanation, or surrounding quotes. Preserve Markdown formatting where appropriate.",
        selectedText
      );

      const textarea = textareaRef.current;
      if (textarea) {
        textarea.focus();
        textarea.setRangeText(response.trim(), start, end, "end");
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
        showSuccessToast("AI response received!");
      }
    } catch (error: any) {
      showErrorToast(error.message || "AI request failed.");
    } finally {
      setIsAiLoading(false);
    }
  }, [getContext, textareaRef]);

  return {
    isAiLoading,
    improveWriting,
    expandIdea,
    runPrompt,
  };
}
