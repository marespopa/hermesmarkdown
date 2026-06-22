import { useCallback, useState } from "react";
import { callAI } from "@/app/services/ai";
import { showSuccessToast, showErrorToast } from "@/app/components/Toastr";
import { useDialog } from "@/app/hooks/use-dialog";

interface UseAIEditorActionsProps {
  value: string;
  onChange: (value: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export interface AIReviewState {
  label: string;
  original: string;
  suggestion: string;
  start: number;
  end: number;
}

export function useAIEditorActions({
  value,
  onChange,
  textareaRef,
}: UseAIEditorActionsProps) {
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiReview, setAiReview] = useState<AIReviewState | null>(null);
  const dialog = useDialog();

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
      const textarea = textareaRef.current;
      if (!textarea) return;

      const cursor = textarea.selectionStart;
      const selectionEnd = textarea.selectionEnd;
      const selectedText = value.substring(cursor, selectionEnd);
      const precedingText = value.substring(Math.max(0, cursor - 1500), cursor);
      const noteExcerpt = selectedText.trim() || value.slice(0, 1500);

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
    [value, textareaRef],
  );

  const runPromptAction = useCallback(
    async (
      label: string,
      dialogTitle: string,
      dialogMessage: string,
      systemPrompt: string,
      buildPrompt: (instruction: string, selectedText: string, surroundingText: string) => string,
    ) => {
      const { selectedText, surroundingText, start, end } = getContext();
      const result = await dialog.textarea(dialogMessage, "", dialogTitle);
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

  const improveWriting = useCallback(
    () =>
      runSelectionAction(
        "Improve writing",
        "You are a writing editor. Improve clarity, flow, and conciseness. Preserve the author's voice, meaning, and any Markdown formatting (bold, italics, lists) exactly. Do NOT add blockquote markers (>) to any line that did not already have them. Return ONLY the rewritten text with no preamble, explanation, or surrounding quotes.",
        (text) => `REWRITE THIS TEXT:\n${text}`,
        "Select some text to improve.",
      ),
    [runSelectionAction],
  );

  const expandIdea = useCallback(
    () =>
      runSelectionAction(
        "Expand idea",
        "You are a thinking partner. Expand the selected idea with depth and clarity. Match the writer's existing tone and preserve any existing Markdown syntax. Do NOT add blockquote markers (>) to any line that did not already have them. Do NOT repeat the original text as a header or preamble. Return ONLY the final expanded text with no explanation or surrounding quotes.",
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
        "You are a helpful assistant. Fulfill the user's request. If existing text is provided for context, use it as the basis for your response. Return ONLY the result with no preamble, explanation, or surrounding quotes. Preserve Markdown formatting where appropriate.",
        (instruction, selectedText) =>
          selectedText.trim()
            ? `INSTRUCTION:\n${instruction}\n\nEXISTING TEXT:\n${selectedText}`
            : instruction,
      ),
    [runPromptAction],
  );

  const runBuilder = useCallback(
    () =>
      runPromptAction(
        "AI Builder",
        "AI Builder",
        "Describe the section you want to create or revise:",
        "You are a document builder. Create or revise a Markdown section of the note per the user's instruction. If an existing section is provided, revise it in place; otherwise write a new, well-structured section using headings and bullet points where appropriate. Preserve any unrelated Markdown formatting in the existing text. Return ONLY the resulting section with no preamble, explanation, or surrounding quotes.",
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

  const applyReplace = useCallback(() => {
    if (!aiReview) return;
    const { suggestion, start, end } = aiReview;
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.focus();
      textarea.setRangeText(suggestion, start, end, "end");
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      onChange(value.substring(0, start) + suggestion + value.substring(end));
    }
    showSuccessToast("AI suggestion applied.");
    setAiReview(null);
  }, [aiReview, onChange, textareaRef, value]);

  const applyInsertBelow = useCallback(() => {
    if (!aiReview) return;
    const { suggestion, end } = aiReview;
    const insertion = `\n\n${suggestion}`;
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.focus();
      textarea.setRangeText(insertion, end, end, "end");
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      onChange(value.substring(0, end) + insertion + value.substring(end));
    }
    showSuccessToast("AI suggestion inserted.");
    setAiReview(null);
  }, [aiReview, onChange, textareaRef, value]);

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
        case "builder":
          return runBuilder();
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
      runBuilder,
    ],
  );

  return {
    isAiLoading,
    aiReview,
    improveWriting,
    expandIdea,
    runPrompt,
    applyReplace,
    applyInsertBelow,
    dismissReview,
    runAIActionById,
  };
}
