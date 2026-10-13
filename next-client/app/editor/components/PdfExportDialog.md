# PdfExportDialog

Description: The **Export as PDF** dialog. On the left, the note's page setup as read from its frontmatter (page size, margins, header, footer, page-break marker) with the `pdf_*` keys that set it; on the right, a preview of the pages. **Save as PDF…** (or Enter) opens the browser's print dialog; **Cancel** closes without printing.

## Behavior
- Preview (`editor/utils/print-preview.ts`, `previewDocument`): the print page laid out as sheets of the chosen paper with its margins, header and footer (left / centre / right). Each page-break marker starts a new sheet and page numbers count sheets. The browser only splits long text into pages when it prints, so a long sheet shows a faint line at each page height.
- The preview iframe is laid out at `PREVIEW_FRAME_WIDTH` (880px) and scaled to fit its pane (`ResizeObserver`), so pages keep their proportions. `sandbox="allow-same-origin"`: no scripts, but the note's image object URLs still load.

## Local State & Storage
- State: the preview pane's measured size.
- Persistence: none.

## Dependencies
- Core: `DialogModal`, `Button`.
- Utils: `previewDocument`, `PREVIEW_FRAME_WIDTH`.
- Zero-Cloud: no network or telemetry side effects.

## Quick Usage
```tsx
const { job, close, print } = useExportPdf();
<PdfExportDialog job={job} onClose={close} onPrint={() => void print()} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| job | `PdfJob \| null` |  | The rendered note; null keeps the dialog closed |
| onClose | `() => void` |  | Cancel / dismiss |
| onPrint | `() => void` |  | Save as PDF… |
