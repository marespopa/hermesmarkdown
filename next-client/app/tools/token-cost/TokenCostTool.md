# TokenCostTool

Description: The calculator at `/tools/token-cost-calculator`. A text box (the prompt or document; starts with the tokenizer's first example), the input token count, a **Reply length (tokens)** field (the expected length of the model's answer, which is billed at the output rate; 0 prices only the text) and a `TokenCostTable` with input, reply and total per model. Below: Open in HermesMarkdown (disabled past 200,000 characters) and Clear.

## Local State & Storage
- State: `atom_tokenCostText` (`null` until edited, which shows the first tokenizer example; a cleared box stays empty), `atom_tokenCostOutputTokens` (default 1,000; whole numbers from 0 to 10,000,000 via `parseTokenCount`).
- Persistence: both atoms in this tab's sessionStorage (`hermes_tool_token_cost`, `hermes_tool_token_cost_output`).

## Dependencies
- Core: `useTokenizer` (worker, o200k, `countOnly`), `TokenCostTable`, `TokenCostOpenButton`, `Input`, `Textarea`, `Button`.
- Zero-Cloud: counting runs in `app/workers/tokenizer.worker.ts`. No text leaves the browser.

## Quick Usage
```tsx
<TokenCostToolLoader /> // loads this client-only, with a skeleton
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) | | | |
