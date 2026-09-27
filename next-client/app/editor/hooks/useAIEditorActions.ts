"use client";

import { useCallback, useState } from "react";
import { useAtomValue } from "jotai";
import { EditorSelection } from "@codemirror/state";
import { callAI } from "@/app/services/ai";
import { atom_activeEditorView } from "@/app/atoms/ui-atoms";
import { showSuccessToast, showErrorToast } from "@/app/components/Toastr";
import { typewriterInsertCM6, typewriterReplaceCM6 } from "../codemirror/typewriter-insert";
import { AI_ACTIONS } from "./ai-action-prompts";

export interface AIReviewState {
  label: string;
  original: string;
  suggestion: string;
  start: number;
  end: number;
}

// Global (not per-pane) — targets whichever CM6 view is currently registered
// as active, same convention as useGlobalVoiceInput.
export function useAIEditorActions() {
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiReview, setAiReview] = useState<AIReviewState | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatContext, setChatContext] = useState<{ start: number; end: number; selected: string }>({
    start: 0,
    end: 0,
    selected: "",
  });
  const activeTarget = useAtomValue(atom_activeEditorView);

  const getContext = useCallback(() => {
    if (!activeTarget) return { selectedText: "", surroundingText: "", start: 0, end: 0 };

    const view = activeTarget;
    const { from: start, to: end } = view.state.selection.main;
    const selectedText = view.state.sliceDoc(start, end);

    // Get surrounding context for expansion
    const contextStart = Math.max(0, start - 300);
    const contextEnd = Math.min(view.state.doc.length, end + 300);
    const surroundingText =
      view.state.sliceDoc(contextStart, start) + view.state.sliceDoc(end, contextEnd);

    return { selectedText, surroundingText, start, end };
  }, [activeTarget]);

  const runSelectionAction = useCallback(
    async (
      label: string,
      systemPrompt: string,
      buildPrompt: (selectedText: string, surroundingText: string) => string,
      emptyMessage: string,
    ) => {
      const { selectedText, surroundingText, start, end } = getContext();
      if (!selectedText.trim()) {
        showErrorToast(emptyMessage);
        return;
      }

      setIsAiLoading(true);
      try {
        const result = await callAI(systemPrompt, buildPrompt(selectedText, surroundingText));
        setAiReview({ label, original: selectedText, suggestion: result.trim(), start, end });
      } catch (error: any) {
        showErrorToast(error.message || `Failed to run "${label}".`);
      } finally {
        setIsAiLoading(false);
      }
    },
    [getContext],
  );

  const runContextAction = useCallback(
    async (
      label: string,
      systemPrompt: string,
      buildPrompt: (precedingText: string, noteExcerpt: string) => string,
    ) => {
      if (!activeTarget) return;

      const view = activeTarget;
      const cursor = view.state.selection.main.from;
      const selectionEnd = view.state.selection.main.to;
      const selectedText = view.state.sliceDoc(cursor, selectionEnd);
      const precedingText = view.state.sliceDoc(Math.max(0, cursor - 1500), cursor);
      const noteExcerpt = selectedText.trim() || view.state.sliceDoc(0, Math.min(1500, view.state.doc.length));

      setIsAiLoading(true);
      try {
        const result = await callAI(systemPrompt, buildPrompt(precedingText, noteExcerpt));
        setAiReview({
          label,
          original: selectedText,
          suggestion: result.trim(),
          start: cursor,
          end: selectionEnd,
        });
      } catch (error: any) {
        showErrorToast(error.message || `Failed to run "${label}".`);
      } finally {
        setIsAiLoading(false);
      }
    },
    [activeTarget],
  );

  const openChat = useCallback(() => {
    const { selectedText, start, end } = getContext();
    setChatContext({ start, end, selected: selectedText });
    setIsChatOpen(true);
  }, [getContext]);

  const closeChat = useCallback(() => {
    setIsChatOpen(false);
  }, []);

  const applyFromChat = useCallback(
    (suggestion: string, mode: "insert" | "replace-all" = "insert") => {
      if (!activeTarget) return;

      const view = activeTarget;
      const { start, end } = mode === "replace-all" ? { start: 0, end: view.state.doc.length } : chatContext;
      typewriterReplaceCM6(view, start, end, suggestion);

      showSuccessToast(mode === "replace-all" ? "Document replaced." : "Inserted into document.");
      setIsChatOpen(false);
    },
    [activeTarget, chatContext],
  );

  const applyReplace = useCallback((customSuggestion?: string) => {
    if (!aiReview) return;
    const suggestion = customSuggestion ?? aiReview.suggestion;
    const { start, end } = aiReview;
    if (activeTarget) {
      typewriterReplaceCM6(activeTarget, start, end, suggestion);
    }
    showSuccessToast("AI suggestion applied.");
    setAiReview(null);
  }, [aiReview, activeTarget]);

  const applyInsertBelow = useCallback((customSuggestion?: string) => {
    if (!aiReview) return;
    const suggestion = customSuggestion ?? aiReview.suggestion;
    const { end } = aiReview;
    if (activeTarget) {
      const view = activeTarget;
      const insertion = `\n\n${suggestion}`;
      view.dispatch({ selection: EditorSelection.cursor(end) });
      typewriterInsertCM6(view, insertion);
    }
    showSuccessToast("AI suggestion inserted.");
    setAiReview(null);
  }, [aiReview, activeTarget]);

  const dismissReview = useCallback(() => {
    setAiReview(null);
  }, []);

  const runAIActionById = useCallback(
    (id: string) => {
      const action = AI_ACTIONS[id];
      if (!action) return;
      return action.kind === "selection"
        ? runSelectionAction(action.label, action.system, action.build, action.emptyMessage)
        : runContextAction(action.label, action.system, action.build);
    },
    [runSelectionAction, runContextAction],
  );

  return {
    isAiLoading,
    aiReview,
    isChatOpen,
    chatSelectedText: chatContext.selected,
    openChat,
    closeChat,
    applyFromChat,
    applyReplace,
    applyInsertBelow,
    dismissReview,
    runAIActionById,
  };
}
