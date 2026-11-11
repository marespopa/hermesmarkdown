# TokenCostOpenButton

Description: `OpenInWorkspaceButton` for the token cost calculator: hands the text over as-is, as a draft named "Priced text" (source `token-cost`). Disabled when the text is blank or longer than 200,000 characters. Used in the tool and in the page's pitch block; both read `atom_tokenCostText`, so they stay in sync.

## Local State & Storage
- State: `atom_tokenCostText`. Persistence: none of its own.

## Quick Usage
```tsx
<TokenCostOpenButton variant="outlined" />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| variant | `"primary" \| "outlined"` | `"primary"` | |
