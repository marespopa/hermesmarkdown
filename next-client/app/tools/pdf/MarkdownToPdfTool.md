# MarkdownToPdfTool

Description: The Markdown to PDF tool, at `/tools/markdown-to-pdf`. A `Textarea` for the Markdown on the left and the printed page on the right (stacked below 768px). The page is rendered as you type (`useDeferredValue`) with the editor's exporter: `renderNote` (headings, lists, tables, code, Mermaid, math) and `printDocument` with `DEFAULT_PRINT_SETTINGS` (A4, normal margins, no header or footer). It is shown in a sandboxed `srcDoc` iframe, so nothing in it can run. There is no vault, so only web and `data:` images render. **Save as PDF** hands the same document to `printHtml`, the browser's print dialog, where "Save as PDF" writes the file; a failure shows a toast. Also **Open in HermesMarkdown** (`PdfOpenButton`) and **Clear**.

## Local State & Storage
- State: `atom_pdfToolMarkdown` (`null` until edited, which shows `PDF_SAMPLE`); the rendered page and a printing flag are local.
- Persistence: this tab's sessionStorage (`hermes_tool_pdf`).

## Dependencies
- Core: `renderNote`, `printDocument`, `printHtml` (`app/editor/utils`), `Textarea`, `Button`, `PdfOpenButton`.
- Zero-Cloud: rendering and printing happen in the browser; nothing is uploaded.

## Quick Usage
```tsx
<MarkdownToPdfToolLoader /> // loads this client-only, with a skeleton
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) | | | |
