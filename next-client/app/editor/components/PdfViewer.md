# PdfViewer

Description: An opened PDF, read-only. The file is read from the vault (`resolveFileHandleAtPath`) and handed to PDF.js (`loadPdfJs` in `utils/pdfjs.ts`, loaded on first use with its worker, `workers/pdf.worker.ts`). Every page's size is read up front, so the column has its full height before anything draws. Pages ([PdfPage](PdfPage.md)) sit in one scrolling column (`role="document"`, named after the file), fitted to the pane's width up to a 960px reading column. A frosted bar at the bottom shows the page crossing the upper third of the pane ("2 / 12") and zooms in steps from 50% to 300%; the percentage button returns to fit. With the PDF focused, Ctrl/Cmd + and − zoom and Ctrl/Cmd 0 fits. These keys are handled ahead of the browser's page zoom and the sidebar's Ctrl/Cmd+0. A delayed spinner shows while the file opens. Password-protected PDFs say so; any other failure says "This PDF can't be shown." Nothing is written back to the file. Closing or switching files destroys the loading task, which frees the document in the worker.

## Local State & Storage
- State: the loaded document and page sizes (or the error), the zoom, the pane width (ResizeObserver), the page in view, and the scroller element.
- Persistence: none.

## Dependencies
- Core: `Button` (`icon-small`, `small`), [PdfPage](PdfPage.md), `utils/pdfjs.ts`, `atom_vaultHandle`, `resolveFileHandleAtPath`.
- Zero-Cloud: the PDF is read from the vault and parsed on the device; no network requests.

## Quick Usage
```tsx
<PdfViewer path="papers/Report.pdf" />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| path | `string` |  | Vault path of the PDF |
