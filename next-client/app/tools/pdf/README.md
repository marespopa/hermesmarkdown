# Markdown to PDF tool

`/tools/markdown-to-pdf`: paste Markdown, preview the printed page, save it as a PDF through the browser's print dialog.

| Path | Role |
|---|---|
| `MarkdownToPdfTool.tsx` | The tool: input, sandboxed page preview, Save as PDF |
| `PdfOpenButton.tsx` | Open in HermesMarkdown (handoff source `markdown-pdf`) |
| `pdf-sample.ts` | The starting Markdown |
| `../markdown-to-pdf/` | The page and `MarkdownToPdfToolLoader` |
