# TokenizerTool

Description: The tokenizer at `/tools/tokenizer`. Text in, and a live token count with every token highlighted. Example chips (Markdown note, structured prompt, code, mixed languages, numbers, emoji) fill the box; a segmented control picks the encoding, o200k (GPT-4o, GPT-4.1, GPT-5, o-series) or cl100k (GPT-4, GPT-3.5 Turbo). Stats: tokens, characters (by code point, so a plain emoji is one), words, characters per token. The tokens panel shows `TokenView` as text or token IDs, and notes when only the first 5,000 tokens are drawn (the count covers all). Below: Open in HermesMarkdown (disabled past 200,000 characters) and Clear.

## Local State & Storage
- State: `atom_tokenizerText` (`null` until edited, which shows the first example; a cleared box stays empty), `atom_tokenizerEncoding`, local `showIds`.
- Persistence: both atoms in this tab's sessionStorage (`hermes_tool_tokenizer`, `hermes_tool_tokenizer_encoding`).

## Dependencies
- Core: `useTokenizer` (worker), `TokenView`, `TokenizerOpenButton`, `Textarea`, `Button`.
- Zero-Cloud: tokenizing runs in `app/workers/tokenizer.worker.ts`; the vocabulary is a same-origin chunk. No text leaves the browser.

## Quick Usage
```tsx
<TokenizerToolLoader /> // loads this client-only, with a skeleton
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) | | | |
