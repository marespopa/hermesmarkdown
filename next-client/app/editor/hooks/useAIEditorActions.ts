"use client";

import { useCallback, useState } from "react";
import { useAtomValue, useStore } from "jotai";
import { EditorSelection } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { callAI } from "@/app/services/ai";
import { atom_activeEditorView } from "@/app/atoms/ui-atoms";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { isPrivateFrontmatter } from "@/app/utils/note-privacy";
import { showSuccessToast, showErrorToast } from "@/app/components/Toastr";
import { keepTablesUnderHeadings } from "../utils/ai-table-headings";
import {
  SUGGEST_PROPERTIES_ID,
  SUGGEST_PROPERTIES_LABEL,
  SUGGEST_PROPERTIES_SYSTEM,
  buildSuggestPropertiesPrompt,
  missingProperties,
  noteBody,
  parseSuggestedProperties,
  propertiesEdit,
  topVaultTags,
} from "../utils/suggest-properties";
import { AI_ACTIONS } from "./ai-action-prompts";

// Applies an AI result in one transaction (one undo step) rather than
// revealing it a few characters at a time: a timed reveal is cancelled by
// focus/clicks and inserts at the moving caret, which corrupts rewrites.
function replaceRangeCM6(view: EditorView, from: number, to: number, text: string) {
  view.dispatch({
    changes: { from, to, insert: text },
    selection: EditorSelection.cursor(from + text.length),
    userEvent: "input.type",
    scrollIntoView: true,
  });
  view.focus();
}

export interface AIReviewState {
  label: string;
  original: string;
  suggestion: string;
  start: number;
  end: number;
  // Set for a suggestion that only makes sense in place (Suggest properties):
  // the review then offers just this button, without Insert Below.
  applyLabel?: string;
}

// Global (not per-pane): targets whichever CM6 view is currently registered
// as active (atom_activeEditorView).
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
  const store = useStore();

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

  // Fills the note's missing title, description and tags (see
  // suggest-properties.ts), reviewed as a diff of the frontmatter block.
  const runSuggestProperties = useCallback(async () => {
    if (!activeTarget) return;
    const doc = activeTarget.state.doc.toString();
    const missing = missingProperties(doc);
    if (missing.length === 0) {
      showErrorToast("This note already has a title, description and tags.");
      return;
    }
    if (!noteBody(doc).trim()) {
      showErrorToast("Write something first, then suggest properties.");
      return;
    }
    const vaultTags = topVaultTags(
      Object.values(store.get(atom_fileMetadata))
        .filter((file) => !isPrivateFrontmatter(file.frontmatter))
        .map((file) => file.tags ?? []),
    );

    setIsAiLoading(true);
    try {
      const reply = await callAI(SUGGEST_PROPERTIES_SYSTEM, buildSuggestPropertiesPrompt(doc, missing, vaultTags));
      const suggested = parseSuggestedProperties(reply);
      const edit = suggested && propertiesEdit(doc, missing, suggested);
      if (!edit) {
        showErrorToast("The AI didn't suggest any properties. Try again.");
        return;
      }
      setAiReview({
        label: SUGGEST_PROPERTIES_LABEL,
        original: edit.original,
        suggestion: edit.replacement,
        start: edit.from,
        end: edit.to,
        applyLabel: "Apply Properties",
      });
    } catch (error: any) {
      showErrorToast(error.message || `Failed to run "${SUGGEST_PROPERTIES_LABEL}".`);
    } finally {
      setIsAiLoading(false);
    }
  }, [activeTarget, store]);

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
      replaceRangeCM6(view, start, end, keepTablesUnderHeadings(suggestion));

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
      // Properties are YAML, not prose: applied exactly as reviewed.
      replaceRangeCM6(activeTarget, start, end, aiReview.applyLabel ? suggestion : keepTablesUnderHeadings(suggestion));
    }
    showSuccessToast("AI suggestion applied.");
    setAiReview(null);
  }, [aiReview, activeTarget]);

  const applyInsertBelow = useCallback((customSuggestion?: string) => {
    if (!aiReview) return;
    const suggestion = customSuggestion ?? aiReview.suggestion;
    const { end } = aiReview;
    if (activeTarget) {
      replaceRangeCM6(activeTarget, end, end, `\n\n${keepTablesUnderHeadings(suggestion)}`);
    }
    showSuccessToast("AI suggestion inserted.");
    setAiReview(null);
  }, [aiReview, activeTarget]);

  const dismissReview = useCallback(() => {
    setAiReview(null);
  }, []);

  const runAIActionById = useCallback(
    (id: string) => {
      if (id === SUGGEST_PROPERTIES_ID) return runSuggestProperties();
      const action = AI_ACTIONS[id];
      if (!action) return;
      return action.kind === "selection"
        ? runSelectionAction(action.label, action.system, action.build, action.emptyMessage)
        : runContextAction(action.label, action.system, action.build);
    },
    [runSelectionAction, runContextAction, runSuggestProperties],
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
