import type { ToolEntry } from "./tools";

export const TOKENIZER: ToolEntry = {
  slug: "tokenizer",
  name: "AI Tokenizer",
  title: "AI Tokenizer & Token Counter for GPT Models | HermesMarkdown",
  description:
    "Count tokens and see exactly how GPT models split your text, with the real o200k and cl100k tokenizers. Free, instant, and your text never leaves your browser.",
  lead: "See how language models read your text: every token, highlighted, with a live count.",
  keywords: [
    "tokenizer",
    "token counter",
    "gpt tokenizer",
    "openai tokenizer",
    "chatgpt token counter",
    "o200k_base",
    "cl100k_base",
    "count tokens online",
  ],
  steps: [
    "Paste or type any text: a prompt, a note, code, any language.",
    "Pick the tokenizer: o200k for current GPT models, cl100k for GPT-4 and GPT-3.5.",
    "Read the count and the highlighted tokens; switch to token IDs to see what the model receives.",
  ],
  faq: [
    {
      q: "What is a token?",
      a: "A token is the unit a language model reads and writes: a whole word, part of a word, a space plus a word, a punctuation mark or a piece of an emoji. Models see your text as a list of token IDs, not letters.",
    },
    {
      q: "How many tokens is a word?",
      a: "In English, a word is about 1.3 tokens on average, or roughly 4 characters per token. Rare words, code, numbers and many non-English languages take more tokens per word, which is why this tool counts the real thing instead of estimating.",
    },
    {
      q: "Which models does this tokenizer match?",
      a: "o200k_base is the tokenizer of GPT-4o, GPT-4.1, GPT-5 and OpenAI's o-series models. cl100k_base is used by GPT-4 and GPT-3.5 Turbo. Other models, such as Claude, Gemini or Llama, use their own tokenizers, so their counts for the same text will differ.",
    },
    {
      q: "Why do tokens matter?",
      a: "Models are priced per token and have a context window measured in tokens. Knowing the count tells you what a prompt will cost, whether a document fits, and where wording changes save tokens.",
    },
    {
      q: "Is my text uploaded?",
      a: "No. The tokenizer runs in your browser, in a background worker. Your text is never sent to a server, and it's kept only in this browser tab.",
    },
    {
      q: "Can I keep working on the text?",
      a: "Yes. Open in HermesMarkdown carries the text into the editor as a draft, where you can keep writing and save it as a Markdown note.",
    },
  ],
  features: [
    "Exact token counts with OpenAI's o200k_base and cl100k_base tokenizers",
    "Highlighted token boundaries and token IDs",
    "Character, word and characters-per-token counts",
    "Runs entirely in the browser",
  ],
};
