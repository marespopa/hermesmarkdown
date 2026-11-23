# PdfOpenButton

Description: **Open in HermesMarkdown** for the Markdown to PDF tool. Hands the Markdown to the editor's draft as typed (source `"markdown-pdf"`, draft name "Markdown to PDF", `PDF_HANDOFF_TITLE`), where Export as PDF has the full page setup. Disabled for a blank input or one over `MAX_HANDOFF_CHARS`.

## Local State & Storage
- State: reads `atom_pdfToolMarkdown` (the sample when never edited).
- Persistence: writes the handoff to sessionStorage through `OpenInWorkspaceButton`.

## Dependencies
- Core: `OpenInWorkspaceButton`, `pdf-sample.ts`.
- Zero-Cloud: same-tab sessionStorage handoff; nothing is uploaded.

## Quick Usage
```tsx
<PdfOpenButton />                    // in the tool
<PdfOpenButton variant="outlined" /> // in the pitch block
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | `"primary" \| "outlined"` | `"primary"` | Button style |
