import type { ToolEntry } from "./tools";

export const TOKEN_COST_CALCULATOR: ToolEntry = {
  slug: "token-cost-calculator",
  name: "Token Cost Calculator",
  title: "AI Token Cost Calculator for GPT, Claude & Gemini | HermesMarkdown",
  description:
    "Paste a prompt or document and see what it costs on GPT, Claude and Gemini models, with real token counts. Free, instant, and nothing leaves your browser.",
  lead: "Paste a prompt or a document and see what it costs on each model, input and reply.",
  keywords: [
    "token cost calculator",
    "ai cost calculator",
    "openai pricing calculator",
    "gpt cost calculator",
    "claude api cost",
    "gemini api cost",
    "llm pricing calculator",
    "prompt cost",
  ],
  steps: [
    "Paste the text you'll send: a prompt, a note, a whole document.",
    "Set how long you expect the reply to be, in tokens.",
    "Compare the input, reply and total cost across GPT, Claude and Gemini models.",
  ],
  faq: [
    {
      q: "How is the cost calculated?",
      a: "The text is tokenized in your browser, then the count is multiplied by each model's list price per million input tokens. The reply is priced the same way at the output rate, which is usually several times higher.",
    },
    {
      q: "Are the counts exact for every model?",
      a: "They're exact for OpenAI models, which use the o200k tokenizer counted here. Claude and Gemini use their own tokenizers, so their rows (marked ≈) are estimates; for English text they usually land within about 10–20%.",
    },
    {
      q: "Which prices does it use?",
      a: "Each provider's standard list price per million tokens, as of the date shown under the table. Batch processing, prompt caching and long-context tiers change the real cost, so check the provider's pricing page before you budget.",
    },
    {
      q: "Can I see what a note in my vault costs?",
      a: "Yes. In the editor, choose More → Token Cost, or run Token cost of this note from the command palette, to price the note you have open.",
    },
    {
      q: "Is my text uploaded?",
      a: "No. Counting runs in your browser, in a background worker. Your text is never sent to a server, and it's kept only in this browser tab.",
    },
  ],
  features: [
    "Input, output and total cost for GPT, Claude and Gemini models",
    "Exact token counts with OpenAI's o200k tokenizer",
    "Adjustable reply length",
    "Runs entirely in the browser",
  ],
};
