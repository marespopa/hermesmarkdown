import { FORMULA_PRESERVATION_RULE, TABLE_FORMULA_GUIDE } from "../utils/formula-ai-guide";

// Prompt definitions for the one-click AI actions (palette "AI: …" commands
// and slash-menu AI items), keyed by the action id used in
// editor/components/constants.ts (`aiActionSentinel(id)`).

/** Rewrites the selection; the result is reviewed as a diff. */
export interface SelectionAction {
  kind: "selection";
  label: string;
  system: string;
  build: (selectedText: string, surroundingText: string) => string;
  emptyMessage: string;
}

/** Works from the text before the caret (or the note start) rather than a selection. */
export interface ContextAction {
  kind: "context";
  label: string;
  system: string;
  build: (precedingText: string, noteExcerpt: string) => string;
}

export type AIAction = SelectionAction | ContextAction;

const NO_PREAMBLE = "with no preamble, explanation, or surrounding quotes.";
const NO_NEW_QUOTES = "Do NOT add blockquote markers (>) to any line that did not already have them.";

function toneAction(tone: "formal" | "casual" | "direct" | "polished"): SelectionAction {
  return {
    kind: "selection",
    label: `Change tone: ${tone}`,
    system: `You are a writing editor. Rewrite the selected text to sound more ${tone}, while preserving its meaning, intent, and Markdown formatting. ${FORMULA_PRESERVATION_RULE} Return ONLY the rewritten text ${NO_PREAMBLE}`,
    build: (text) => `REWRITE THIS TEXT IN A MORE ${tone.toUpperCase()} TONE:\n${text}`,
    emptyMessage: "Select some text to change its tone.",
  };
}

export const AI_ACTIONS: Record<string, AIAction> = {
  improve: {
    kind: "selection",
    label: "Improve writing",
    system: `You are a writing editor. Improve clarity, flow, and conciseness. Preserve the author's voice, meaning, and any Markdown formatting (bold, italics, lists) exactly. ${NO_NEW_QUOTES} ${FORMULA_PRESERVATION_RULE} Return ONLY the rewritten text ${NO_PREAMBLE}`,
    build: (text) => `REWRITE THIS TEXT:\n${text}`,
    emptyMessage: "Select some text to improve.",
  },
  expand: {
    kind: "selection",
    label: "Expand idea",
    system: `You are a thinking partner. Expand the selected idea with depth and clarity. Match the writer's existing tone and preserve any existing Markdown syntax. ${NO_NEW_QUOTES} Do NOT repeat the original text as a header or preamble. ${FORMULA_PRESERVATION_RULE} Return ONLY the final expanded text with no explanation or surrounding quotes.`,
    build: (text, surrounding) =>
      `EXPAND THIS IDEA:\n${text}${surrounding ? `\n\nSURROUNDING CONTEXT (for tone reference only):\n${surrounding}` : ""}`,
    emptyMessage: "Select an idea to expand.",
  },
  "fix-grammar": {
    kind: "selection",
    label: "Fix spelling and grammar",
    system: `You are a meticulous proofreader. Apply only a light correction pass for spelling and grammar errors. Do not change wording, tone, or meaning beyond fixing mistakes. Preserve Markdown formatting exactly. ${FORMULA_PRESERVATION_RULE} Return ONLY the corrected text ${NO_PREAMBLE}`,
    build: (text) => `FIX SPELLING AND GRAMMAR IN THIS TEXT:\n${text}`,
    emptyMessage: "Select some text to fix.",
  },
  shorten: {
    kind: "selection",
    label: "Shorten",
    system: `You are an editor who compresses verbose text while preserving its core meaning and Markdown formatting. ${FORMULA_PRESERVATION_RULE} Return ONLY the shortened text ${NO_PREAMBLE}`,
    build: (text) => `SHORTEN THIS TEXT:\n${text}`,
    emptyMessage: "Select some text to shorten.",
  },
  "tone-formal": toneAction("formal"),
  "tone-casual": toneAction("casual"),
  "tone-direct": toneAction("direct"),
  "tone-polished": toneAction("polished"),
  summarize: {
    kind: "selection",
    label: "Summarize",
    system: `You are an expert summarizer. Condense the selected text into a concise summary that captures the key points. Use Markdown formatting where helpful. Return ONLY the summary ${NO_PREAMBLE}`,
    build: (text) => `SUMMARIZE THIS TEXT:\n${text}`,
    emptyMessage: "Select some text to summarize.",
  },
  "extract-tasks": {
    kind: "selection",
    label: "Extract tasks",
    system: `You convert notes into actionable task items. Read the selected text and output a Markdown checklist (\`- [ ] ...\`) of concrete action items implied or stated in the text. Return ONLY the checklist ${NO_PREAMBLE}`,
    build: (text) => `EXTRACT TASKS FROM THIS TEXT:\n${text}`,
    emptyMessage: "Select some text to extract tasks from.",
  },
  outline: {
    kind: "selection",
    label: "Create outline",
    system: `You restructure notes into a clear outline using Markdown headings and bullet points. Preserve all key information from the source. Return ONLY the outline ${NO_PREAMBLE}`,
    build: (text) => `CREATE AN OUTLINE FROM THIS TEXT:\n${text}`,
    emptyMessage: "Select some text to outline.",
  },
  explain: {
    kind: "selection",
    label: "Explain selection",
    system: `You explain concepts in simple, clear terms for someone unfamiliar with the topic. Return ONLY the explanation ${NO_PREAMBLE}`,
    build: (text) => `EXPLAIN THIS:\n${text}`,
    emptyMessage: "Select some text to explain.",
  },
  title: {
    kind: "context",
    label: "Generate title",
    system: "You generate short, descriptive page titles. Read the provided note excerpt and suggest a single concise title. Do not include quotes, a Markdown heading marker, or any preamble. Return ONLY the title text.",
    build: (_preceding, excerpt) => `SUGGEST A TITLE FOR THIS NOTE:\n${excerpt}`,
  },
  continue: {
    kind: "context",
    label: "Continue writing",
    system: `You are a writing partner who continues a piece of writing seamlessly from where it left off, matching its existing tone, style, and Markdown formatting. Do not repeat or summarize what came before. ${FORMULA_PRESERVATION_RULE} Return ONLY the continuation text ${NO_PREAMBLE}\n\n${TABLE_FORMULA_GUIDE}`,
    build: (preceding) => `CONTINUE WRITING FROM HERE:\n${preceding}`,
  },
};
