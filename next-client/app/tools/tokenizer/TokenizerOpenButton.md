# TokenizerOpenButton

Description: `OpenInWorkspaceButton` for the tokenizer: hands the text over as-is, as a draft named "Tokenized text". Disabled when the text is blank or longer than 200,000 characters. Used in the tool and in the page's pitch block; both read `atom_tokenizerText`, so they stay in sync.

## Local State & Storage
- State: `atom_tokenizerText`. Persistence: none of its own.

## Quick Usage
```tsx
<TokenizerOpenButton variant="outlined" />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| variant | `"primary" \| "outlined"` | `"primary"` | |
