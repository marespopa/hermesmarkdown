# PdfExportDialog

Description: The **Export as PDF** dialog. On the left, the page setup controls: **Paper** (A4 / Letter) and **Margins** (Narrow / Normal / Wide) as segmented controls, **Header** and **Footer** text fields (with `{title}`, `{date}`, `{page}`, `{pages}` and `|` for left / centre / right) and a **New page at each rule** switch (`---` breaks pages; `<!-- pagebreak -->` always does). On the right, a preview of the pages. **Save as PDF…** (or Enter) opens the browser's print dialog; **Cancel** closes without printing.

## Behavior
- Preview (`editor/utils/print-preview.ts`, `previewDocument`): the print page laid out as sheets of the chosen paper with its margins, header and footer (left / centre / right). Each page-break marker starts a new sheet and page numbers count sheets. The browser only splits long text into pages when it prints, so a long sheet shows a faint line at each page height.
- The preview iframe is laid out at `PREVIEW_FRAME_WIDTH` (880px) and scaled to fit its pane (`ResizeObserver`), so pages keep their proportions. `sandbox="allow-same-origin"`: no scripts, but the note's image object URLs still load.
- The settings are `atom_pdfSettings` (`atoms/print-atoms.ts`): changes save at once and are remembered for the next export; `useExportPdf` prints with them. The preview follows them `PREVIEW_DELAY_MS` (250ms) later, so typing a header doesn't rebuild the frame per key.
- Note frontmatter is not read for page setup.

## Local State & Storage
- State: the preview pane's measured size; the settings the preview was last built with.
- Persistence: `atom_pdfSettings` → `localStorage["hermes_pdf_settings"]` (checked on read by `normalizePrintSettings`).

## Dependencies
- Core: `DialogModal`, `Button`, `Input`, `Toggle`, `SegmentedControl` (settings `SettingControls`).
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
