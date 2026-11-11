# TokenizerTool

Description: The tokenizer at `/tools/tokenizer`. Text in, and a live token count with every token highlighted. Example chips (Markdown note, structured prompt, code, mixed languages, numbers, emoji) fill the box, and a `.md`/`.txt` file can be dropped on it or picked with Open file… (over 5 MB is refused). A segmented control picks the encoding, o200k (GPT-4o, GPT-4.1, GPT-5, GPT-6, o-series) or cl100k (GPT-4, GPT-3.5 Turbo). Stats: tokens, characters (by code point, so a plain emoji is one), words (runs in Chinese, Japanese and Thai are split with `Intl.Segmenter`), characters per token. The tokens panel shows `TokenView` as text or IDs (a Text / IDs segment control), with a Show spaces toggle and Copy IDs (off when only the first 5,000 tokens are listed). Under it, a cost table prices the text as input on each model (`TokenCostTable`), linking to the calculator for reply length. Below: Open in HermesMarkdown (disabled past 200,000 characters), Open file…, Copy count and Clear.

While a change is being counted the last result stays on screen, dimmed with a delayed "Updating…" (`.loading-bar-appear`). If a new encoding's vocabulary fails to load, the encoding switches back to the one still on screen and a toast says why.

## Local State & Storage
- State: `atom_tokenizerText` (`null` until edited, which shows the first example; a cleared box stays empty; shared with the token cost calculator), `atom_tokenizerEncoding`, local `view` (text or IDs) and `showWhitespace`.
- Persistence: both atoms in this tab's sessionStorage (`hermes_tool_tokenizer`, `hermes_tool_tokenizer_encoding`).

## Dependencies
- Core: `useTokenizer` (worker; a second `countOnly` o200k call feeds the cost table under cl100k), `TokenView`, `TokenCostTable`, `TokenizerOpenButton`, `Textarea`, `Button`, `TextLink`, Toastr.
- Zero-Cloud: tokenizing runs in `app/workers/tokenizer.worker.ts`; the vocabulary is a same-origin chunk. No text leaves the browser.

## Quick Usage
```tsx
<TokenizerToolLoader /> // loads this client-only, with a skeleton
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) | | | |
