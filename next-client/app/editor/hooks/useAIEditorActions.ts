"use client";

import { useCallback, useMemo, useState } from "react";
import { useAtomValue } from "jotai";
import { EditorSelection } from "@codemirror/state";
import { callAI } from "@/app/services/ai";
import { atom_activeEditorView, atom_activeMilkdownView, atom_activeEditorKind, atom_activeMilkdownCtx } from "@/app/atoms/ui-atoms";
import { showSuccessToast, showErrorToast } from "@/app/components/Toastr";
import { useDialog } from "@/app/hooks/use-dialog";
import { typewriterInsertCM6, typewriterReplaceCM6 } from "../codemirror/typewriter-insert";
import { replaceMilkdownRange } from "../milkdown/markdown-replace";
import { getSelectionCopyPayload } from "../milkdown/plugins";

export const FORMULA_PRESERVATION_RULE =
  "IMPORTANT: HermesMarkdown formula expressions (e.g. =SUM(A:A), =AVG(B2:B5), =COUNT(C:C)) must NEVER be evaluated or replaced with numeric values. Preserve all formula expressions exactly as written.";

export interface AIReviewState {
  label: string;
  original: string;
  suggestion: string;
  start: number;
  end: number;
}

// Global (not per-pane) — targets whichever view (CM6 in Source mode, or
// Milkdown/ProseMirror in Rendered mode) is currently registered as active,
// same convention as useGlobalVoiceInput.
export function useAIEditorActions() {
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiReview, setAiReview] = useState<AIReviewState | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatContext, setChatContext] = useState<{ start: number; end: number; selected: string }>({
    start: 0,
    end: 0,
    selected: "",
  });
  const dialog = useDialog();
  const activeEditorView = useAtomValue(atom_activeEditorView);
  const activeMilkdownView = useAtomValue(atom_activeMilkdownView);
  const activeMilkdownCtx = useAtomValue(atom_activeMilkdownCtx);
  const activeEditorKind = useAtomValue(atom_activeEditorKind);

  // Two independent view types can each be registered (Source's CM6 and
  // Rendered's ProseMirror) — atom_activeEditorKind picks whichever one the
  // user is actually looking at right now, same convention as
  // use-global-voice-input.ts's commitVoicePreview. Every action below reads
  // through this instead of assuming CM6, so AI chat/review actions work the
  // same in either pane mode.
  const activeTarget = useMemo(() => {
    if (activeEditorKind === "milkdown" && activeMilkdownView && activeMilkdownCtx) {
      return { kind: "milkdown" as const, view: activeMilkdownView, ctx: activeMilkdownCtx };
    }
    if (activeEditorKind === "cm6" && activeEditorView) {
      return { kind: "cm6" as const, view: activeEditorView };
    }
    return null;
  }, [activeEditorKind, activeEditorView, activeMilkdownView, activeMilkdownCtx]);

  const getContext = useCallback(() => {
    if (!activeTarget) return { selectedText: "", surroundingText: "", start: 0, end: 0 };

    if (activeTarget.kind === "milkdown") {
      const { view, ctx } = activeTarget;
      const { from: start, to: end } = view.state.selection;
      // .text, not .source — Rendered mode is WYSIWYG (a callout looks like
      // a bordered box with no "> ", a heading has no "#"), so what the AI
      // chat shows back as "Selected text" (and what the model itself sees)
      // should match what was visibly highlighted, same call already made
      // for plain Ctrl+C copy in plugins.ts's clipboardCopyFix. .source
      // would otherwise leak raw markdown syntax — a selection inside a
      // callout would show as "> [!note] ..." and read as if the selection
      // had been turned into a blockquote.
      const selectedText = getSelectionCopyPayload(ctx)?.text ?? "";
      const docSize = view.state.doc.content.size;
      const contextStart = Math.max(0, start - 300);
      const contextEnd = Math.min(docSize, end + 300);
      const surroundingText =
        view.state.doc.textBetween(contextStart, start, "\n") +
        view.state.doc.textBetween(end, contextEnd, "\n");
      return { selectedText, surroundingText, start, end };
    }

    const view = activeTarget.view;
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

      let cursor: number;
      let selectionEnd: number;
      let selectedText: string;
      let precedingText: string;
      let noteExcerpt: string;

      if (activeTarget.kind === "milkdown") {
        const { view } = activeTarget;
        cursor = view.state.selection.from;
        selectionEnd = view.state.selection.to;
        selectedText = view.state.doc.textBetween(cursor, selectionEnd, "\n");
        precedingText = view.state.doc.textBetween(Math.max(0, cursor - 1500), cursor, "\n");
        noteExcerpt =
          selectedText.trim() ||
          view.state.doc.textBetween(0, Math.min(1500, view.state.doc.content.size), "\n");
      } else {
        const { view } = activeTarget;
        cursor = view.state.selection.main.from;
        selectionEnd = view.state.selection.main.to;
        selectedText = view.state.sliceDoc(cursor, selectionEnd);
        precedingText = view.state.sliceDoc(Math.max(0, cursor - 1500), cursor);
        noteExcerpt = selectedText.trim() || view.state.sliceDoc(0, Math.min(1500, view.state.doc.length));
      }

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

  const runPromptAction = useCallback(
    async (
      label: string,
      dialogTitle: string,
      dialogMessage: string,
      systemPrompt: string,
      buildPrompt: (instruction: string, selectedText: string, surroundingText: string) => string,
      showSelectionAsContext = false,
    ) => {
      const { selectedText, surroundingText, start, end } = getContext();
      const trimmedSelection = selectedText.trim();
      const subtext =
        showSelectionAsContext && trimmedSelection
          ? `Selected text will be used as context: "${
              trimmedSelection.length > 200 ? `${trimmedSelection.slice(0, 200)}…` : trimmedSelection
            }"`
          : undefined;
      const result = await dialog.textarea(dialogMessage, "", dialogTitle, subtext);
      const instruction = (result as { text?: string } | null)?.text?.trim();
      if (!instruction) return;

      setIsAiLoading(true);
      try {
        const output = await callAI(systemPrompt, buildPrompt(instruction, selectedText, surroundingText));
        setAiReview({ label, original: selectedText, suggestion: output.trim(), start, end });
      } catch (error: any) {
        showErrorToast(error.message || `Failed to run "${label}".`);
      } finally {
        setIsAiLoading(false);
      }
    },
    [getContext, dialog],
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

      if (activeTarget.kind === "milkdown") {
        const { view, ctx } = activeTarget;
        const { start, end } =
          mode === "replace-all" ? { start: 0, end: view.state.doc.content.size } : chatContext;
        if (!replaceMilkdownRange(ctx, view, start, end, suggestion)) return;
      } else {
        const { view } = activeTarget;
        const { start, end } = mode === "replace-all" ? { start: 0, end: view.state.doc.length } : chatContext;
        typewriterReplaceCM6(view, start, end, suggestion);
      }

      showSuccessToast(mode === "replace-all" ? "Document replaced." : "Inserted into document.");
      setIsChatOpen(false);
    },
    [activeTarget, chatContext],
  );

  const improveWriting = useCallback(
    () =>
      runSelectionAction(
        "Improve writing",
        `You are a writing editor. Improve clarity, flow, and conciseness. Preserve the author's voice, meaning, and any Markdown formatting (bold, italics, lists) exactly. Do NOT add blockquote markers (>) to any line that did not already have them. ${FORMULA_PRESERVATION_RULE} Return ONLY the rewritten text with no preamble, explanation, or surrounding quotes.`,
        (text) => `REWRITE THIS TEXT:\n${text}`,
        "Select some text to improve.",
      ),
    [runSelectionAction],
  );

  const expandIdea = useCallback(
    () =>
      runSelectionAction(
        "Expand idea",
        `You are a thinking partner. Expand the selected idea with depth and clarity. Match the writer's existing tone and preserve any existing Markdown syntax. Do NOT add blockquote markers (>) to any line that did not already have them. Do NOT repeat the original text as a header or preamble. ${FORMULA_PRESERVATION_RULE} Return ONLY the final expanded text with no explanation or surrounding quotes.`,
        (text, surrounding) =>
          `EXPAND THIS IDEA:\n${text}${surrounding ? `\n\nSURROUNDING CONTEXT (for tone reference only):\n${surrounding}` : ""}`,
        "Select an idea to expand.",
      ),
    [runSelectionAction],
  );

  const runPrompt = useCallback(
    () =>
      runPromptAction(
        "Prompt",
        "AI Prompt",
        "What would you like the AI to do?",
        `You are a helpful assistant. Fulfill the user's request. If existing text is provided for context, use it as the basis for your response. Return ONLY the result with no preamble, explanation, or surrounding quotes. Preserve Markdown formatting where appropriate. ${FORMULA_PRESERVATION_RULE}`,
        (instruction, selectedText) =>
          selectedText.trim()
            ? `INSTRUCTION:\n${instruction}\n\nEXISTING TEXT:\n${selectedText}`
            : instruction,
        true,
      ),
    [runPromptAction],
  );

  const runBuilder = useCallback(
    () =>
      runPromptAction(
        "AI Builder",
        "AI Builder",
        "Describe the section you want to create or revise:",
        `You are a document builder. Create or revise a Markdown section of the note per the user's instruction. If an existing section is provided, revise it in place; otherwise write a new, well-structured section using headings and bullet points where appropriate. Preserve any unrelated Markdown formatting in the existing text. ${FORMULA_PRESERVATION_RULE} Return ONLY the resulting section with no preamble, explanation, or surrounding quotes.`,
        (instruction, selectedText) =>
          selectedText.trim()
            ? `INSTRUCTION:\n${instruction}\n\nEXISTING SECTION TO REVISE:\n${selectedText}`
            : `INSTRUCTION:\n${instruction}`,
      ),
    [runPromptAction],
  );

  const fixGrammar = useCallback(
    () =>
      runSelectionAction(
        "Fix spelling and grammar",
        "You are a meticulous proofreader. Apply only a light correction pass for spelling and grammar errors. Do not change wording, tone, or meaning beyond fixing mistakes. Preserve Markdown formatting exactly. Return ONLY the corrected text with no preamble, explanation, or surrounding quotes.",
        (text) => `FIX SPELLING AND GRAMMAR IN THIS TEXT:\n${text}`,
        "Select some text to fix.",
      ),
    [runSelectionAction],
  );

  const shortenText = useCallback(
    () =>
      runSelectionAction(
        "Shorten",
        "You are an editor who compresses verbose text while preserving its core meaning and Markdown formatting. Return ONLY the shortened text with no preamble, explanation, or surrounding quotes.",
        (text) => `SHORTEN THIS TEXT:\n${text}`,
        "Select some text to shorten.",
      ),
    [runSelectionAction],
  );

  const changeTone = useCallback(
    (tone: "formal" | "casual" | "direct" | "polished") =>
      runSelectionAction(
        `Change tone: ${tone}`,
        `You are a writing editor. Rewrite the selected text to sound more ${tone}, while preserving its meaning, intent, and Markdown formatting. Return ONLY the rewritten text with no preamble, explanation, or surrounding quotes.`,
        (text) => `REWRITE THIS TEXT IN A MORE ${tone.toUpperCase()} TONE:\n${text}`,
        "Select some text to change its tone.",
      ),
    [runSelectionAction],
  );

  const summarizeText = useCallback(
    () =>
      runSelectionAction(
        "Summarize",
        "You are an expert summarizer. Condense the selected text into a concise summary that captures the key points. Use Markdown formatting where helpful. Return ONLY the summary with no preamble, explanation, or surrounding quotes.",
        (text) => `SUMMARIZE THIS TEXT:\n${text}`,
        "Select some text to summarize.",
      ),
    [runSelectionAction],
  );

  const extractTasks = useCallback(
    () =>
      runSelectionAction(
        "Extract tasks",
        "You convert notes into actionable task items. Read the selected text and output a Markdown checklist (`- [ ] ...`) of concrete action items implied or stated in the text. Return ONLY the checklist with no preamble, explanation, or surrounding quotes.",
        (text) => `EXTRACT TASKS FROM THIS TEXT:\n${text}`,
        "Select some text to extract tasks from.",
      ),
    [runSelectionAction],
  );

  const createOutline = useCallback(
    () =>
      runSelectionAction(
        "Create outline",
        "You restructure notes into a clear outline using Markdown headings and bullet points. Preserve all key information from the source. Return ONLY the outline with no preamble, explanation, or surrounding quotes.",
        (text) => `CREATE AN OUTLINE FROM THIS TEXT:\n${text}`,
        "Select some text to outline.",
      ),
    [runSelectionAction],
  );

  const explainSelection = useCallback(
    () =>
      runSelectionAction(
        "Explain selection",
        "You explain concepts in simple, clear terms for someone unfamiliar with the topic. Return ONLY the explanation with no preamble, explanation, or surrounding quotes.",
        (text) => `EXPLAIN THIS:\n${text}`,
        "Select some text to explain.",
      ),
    [runSelectionAction],
  );

  const generateTitle = useCallback(
    () =>
      runContextAction(
        "Generate title",
        "You generate short, descriptive page titles. Read the provided note excerpt and suggest a single concise title. Do not include quotes, a Markdown heading marker, or any preamble. Return ONLY the title text.",
        (_preceding, excerpt) => `SUGGEST A TITLE FOR THIS NOTE:\n${excerpt}`,
      ),
    [runContextAction],
  );

  const continueWriting = useCallback(
    () =>
      runContextAction(
        "Continue writing",
        "You are a writing partner who continues a piece of writing seamlessly from where it left off, matching its existing tone, style, and Markdown formatting. Do not repeat or summarize what came before. Return ONLY the continuation text with no preamble, explanation, or surrounding quotes.",
        (preceding) => `CONTINUE WRITING FROM HERE:\n${preceding}`,
      ),
    [runContextAction],
  );

  const applyReplace = useCallback((customSuggestion?: string) => {
    if (!aiReview) return;
    const suggestion = customSuggestion ?? aiReview.suggestion;
    const { start, end } = aiReview;
    if (activeTarget?.kind === "milkdown") {
      replaceMilkdownRange(activeTarget.ctx, activeTarget.view, start, end, suggestion);
    } else if (activeTarget?.kind === "cm6") {
      typewriterReplaceCM6(activeTarget.view, start, end, suggestion);
    }
    showSuccessToast("AI suggestion applied.");
    setAiReview(null);
  }, [aiReview, activeTarget]);

  const applyInsertBelow = useCallback((customSuggestion?: string) => {
    if (!aiReview) return;
    const suggestion = customSuggestion ?? aiReview.suggestion;
    const { end } = aiReview;
    if (activeTarget?.kind === "milkdown") {
      replaceMilkdownRange(activeTarget.ctx, activeTarget.view, end, end, suggestion);
    } else if (activeTarget?.kind === "cm6") {
      const view = activeTarget.view;
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
      switch (id) {
        case "improve":
          return improveWriting();
        case "expand":
          return expandIdea();
        case "fix-grammar":
          return fixGrammar();
        case "shorten":
          return shortenText();
        case "tone-formal":
          return changeTone("formal");
        case "tone-casual":
          return changeTone("casual");
        case "tone-direct":
          return changeTone("direct");
        case "tone-polished":
          return changeTone("polished");
        case "summarize":
          return summarizeText();
        case "extract-tasks":
          return extractTasks();
        case "outline":
          return createOutline();
        case "title":
          return generateTitle();
        case "continue":
          return continueWriting();
        case "explain":
          return explainSelection();
        default:
          return;
      }
    },
    [
      improveWriting,
      expandIdea,
      fixGrammar,
      shortenText,
      changeTone,
      summarizeText,
      extractTasks,
      createOutline,
      generateTitle,
      continueWriting,
      explainSelection,
    ],
  );

  return {
    isAiLoading,
    aiReview,
    isChatOpen,
    chatSelectedText: chatContext.selected,
    improveWriting,
    expandIdea,
    runPrompt,
    runBuilder,
    openChat,
    closeChat,
    applyFromChat,
    applyReplace,
    applyInsertBelow,
    dismissReview,
    runAIActionById,
  };
}
