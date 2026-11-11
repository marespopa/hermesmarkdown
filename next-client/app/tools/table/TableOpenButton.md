# TableOpenButton

Description: `OpenInWorkspaceButton` for the table generator: hands over `# Markdown table` and the aligned table with its formulas kept (`tableOutput(doc, "formulas")`, `tableHandoffMarkdown`), since the editor keeps calculating them, as a draft named "Markdown table", at `/editor?from=markdown-table`. Disabled with no table or past the 200,000-character limit. Used in the tool and in the page's pitch block; both read `atom_tableToolMarkdown`.

## Local State & Storage
- State: `atom_tableToolMarkdown`. Persistence: none of its own.

## Quick Usage
```tsx
<TableOpenButton variant="outlined" />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| variant | `"primary" \| "outlined"` | `"primary"` | |
