# TokenCostTable

Description: One row per model in `MODEL_PRICES` (`model-prices.ts`), with its price per million tokens under the name. With `outputTokens`, three columns: Input, Reply and Total; without, a single Cost column for the input alone (the editor's Token cost dialog). Rows for models other than OpenAI's carry a `≈`, since the count comes from the o200k tokenizer. Costs show `…` while the count is loading. A footnote gives the price date (`PRICES_AS_OF`), the tier (standard, no batch or cache discounts) and points to the provider's pricing page.

## Local State & Storage
- State: none. Persistence: none.

## Dependencies
- Core: `model-prices.ts` (`MODEL_PRICES`, `modelCost`, `formatUsd`, `isExactCount`). No atoms, so the editor can use it too.

## Quick Usage
```tsx
<TokenCostTable inputTokens={count} outputTokens={1000} /> // calculator
<TokenCostTable inputTokens={count} />                     // input only
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| inputTokens | `number \| null` | | Tokens sent; `null` while counting |
| outputTokens | `number` | | Expected reply length; omit to price the input only |
