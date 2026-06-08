import { useCallback, useState } from "react";
import { callAI } from "@/app/services/ai";
import { showSuccessToast, showErrorToast } from "@/app/components/Toastr";

interface UseAIEditorActionsProps {
  value: string;
  onChange: (value: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  vaultAgentContext?: string | null;
}

export function useAIEditorActions({
  value,
  onChange,
  textareaRef,
  vaultAgentContext,
}: UseAIEditorActionsProps) {
  const [isAiLoading, setIsAiLoading] = useState(false);

  const getContext = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return { selectedText: "", surroundingText: "", start: 0, end: 0 };

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    // If no selection, try to get the current paragraph
    if (!selectedText) {
      const lastNewLine = value.lastIndexOf("\n", start - 1);
      const nextNewLine = value.indexOf("\n", start);
      const pStart = lastNewLine === -1 ? 0 : lastNewLine + 1;
      const pEnd = nextNewLine === -1 ? value.length : nextNewLine;
      return {
        selectedText: value.substring(pStart, pEnd),
        surroundingText: "",
        start: pStart,
        end: pEnd,
      };
    }

    // Get surrounding context for expansion
    const contextStart = Math.max(0, start - 300);
    const contextEnd = Math.min(value.length, end + 300);
    const surroundingText = value.substring(contextStart, contextEnd);

    return { selectedText, surroundingText, start, end };
  }, [value, textareaRef]);

  const withVaultContext = useCallback(
    (baseSystem: string) =>
      vaultAgentContext
        ? `${baseSystem}\n\n--- VAULT CONVENTIONS ---\n${vaultAgentContext}`
        : baseSystem,
    [vaultAgentContext]
  );

  const improveWriting = useCallback(async () => {
    const { selectedText, start, end } = getContext();
    if (!selectedText.trim()) {
      showErrorToast("Select some text to improve.");
      return;
    }

    setIsAiLoading(true);
    try {
      const improved = await callAI(
        withVaultContext("You are a writing editor. Improve clarity, flow, and conciseness. Preserve the author's voice, meaning, and any Markdown formatting (like bold, italics, lists) exactly. Return ONLY the rewritten text. Do not wrap in quotes or add any preamble."),
        `REWRITE THIS TEXT:\n${selectedText}`
      );

      const textarea = textareaRef.current;
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(start, end);
        document.execCommand("insertText", false, improved.trim());
        showSuccessToast("Writing improved!");
      }
    } catch (error: any) {
      showErrorToast(error.message || "Failed to improve writing.");
    } finally {
      setIsAiLoading(false);
    }
  }, [getContext, textareaRef, withVaultContext]);

  const expandIdea = useCallback(async () => {
    const { selectedText, surroundingText, start, end } = getContext();
    if (!selectedText.trim()) {
      showErrorToast("Select an idea to expand.");
      return;
    }

    setIsAiLoading(true);
    try {
      const expanded = await callAI(
        withVaultContext("You are a thinking partner. Expand the selected idea with depth and clarity. Match the writer's existing tone and preserve any existing Markdown syntax. Return the COMPLETE expanded version of the original text. Do NOT repeat the original text as a header or preamble. Do NOT wrap in quotes. Return ONLY the final expanded text."),
        `EXPAND THIS IDEA:\n${selectedText}\n\nSURROUNDING CONTEXT:\n${surroundingText}`
      );

      const textarea = textareaRef.current;
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(start, end);
        document.execCommand("insertText", false, expanded.trim());
        showSuccessToast("Idea expanded!");
      }
    } catch (error: any) {
      showErrorToast(error.message || "Failed to expand idea.");
    } finally {
      setIsAiLoading(false);
    }
  }, [getContext, textareaRef, withVaultContext]);

  return {
    isAiLoading,
    improveWriting,
    expandIdea,
  };
}
