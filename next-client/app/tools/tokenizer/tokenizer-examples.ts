// Sample texts for the tokenizer tool, each showing a different way text
// turns into tokens. The first one is shown on a first visit.
export const TOKENIZER_EXAMPLES: { id: string; label: string; text: string }[] = [
  {
    id: "note",
    label: "Markdown note",
    text: "# Weekly review\n\n- Shipped the **token counter** 🎉\n- Next: [[Roadmap]] and a `README` pass\n\n> Plain words are cheap; rare words, code and emoji cost more tokens.",
  },
  {
    id: "prompt",
    label: "Structured prompt",
    text: "You are a careful editor.\n\n## Task\nRewrite the text below for clarity. Keep the meaning.\n\n## Rules\n1. Use short sentences.\n2. Keep technical terms.\n3. Return Markdown only.",
  },
  {
    id: "code",
    label: "Code",
    text: "function countTokens(text: string): number {\n  return encode(text).length;\n}\n\nconsole.log(countTokens(\"Hello, world!\"));",
  },
  {
    id: "languages",
    label: "Mixed languages",
    text: "Hello, how are you?\nBonjour, comment ça va ?\nこんにちは、元気ですか？\nПривет, как дела?\nمرحبا، كيف حالك؟",
  },
  {
    id: "numbers",
    label: "Numbers & dates",
    text: "Invoice 2026-10-09: 1,234.56 USD, 42 items, order #A7F19AB7, call +40 721 000 000.",
  },
  {
    id: "emoji",
    label: "Emoji",
    text: "Launch day 🚀🔥 Team 👩🏽‍💻👨🏻‍💻 Coffee ☕☕☕ Done ✅",
  },
];
