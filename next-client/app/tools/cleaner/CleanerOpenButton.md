# CleanerOpenButton

Description: **Open in HermesMarkdown** for the Markdown Cleaner. Hands the clean Markdown to the editor's draft as it is (source `"markdown-cleaner"`, draft name "Clean Markdown", `CLEANER_HANDOFF_TITLE`). The conversion runs on click rather than on render: it needs the DOM, and the page's pitch block renders this button on the server too. Disabled for a blank input; output over the handoff limit gets the "too large" toast from `OpenInWorkspaceButton`.

## Local State & Storage
- State: reads `atom_cleanerInput` and `atom_cleanerFormat`.
- Persistence: writes the handoff to sessionStorage through `OpenInWorkspaceButton`.

## Dependencies
- Core: `OpenInWorkspaceButton`, `convertInput`, `cleaner-examples.ts`.
- Zero-Cloud: same-tab sessionStorage handoff; nothing is uploaded.

## Quick Usage
```tsx
<CleanerOpenButton />                    // in the tool
<CleanerOpenButton variant="outlined" /> // in the pitch block
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | `"primary" \| "outlined"` | `"primary"` | Button style |
