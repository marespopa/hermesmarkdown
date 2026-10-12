# PdfExport

Description: Mounts **Export as PDF…** once per editor page and renders nothing; the browser's print dialog is the UI. The focused note is rendered to print HTML and printed from a hidden iframe, where **Save as PDF** makes the file. Nothing leaves the device.

## Behavior
- Palette command **Export as PDF…** (Document; keywords pdf, print, export, share, archive) and the toolbar's More → **Export as PDF…** (`exportActivePdf()` dispatches `hermes:export-pdf`) run the same export.
- Disabled, with the reason, for an empty note or a private note that's still veiled (`atom_revealAllSensitive` / `atom_revealedSensitivePaths`, the same check as `SensitiveNoteGate`); the More menu's event shows the reason as an error toast instead.
- Rendering (`app/utils/print/note-html.ts`, `noteToHtml`): the editor's Lezer Markdown parser, everything escaped; frontmatter, raw HTML and comments are left out; wikilinks print as their text; folded callouts print expanded; only web and mail links stay links.
- Images: `![alt](src)` paths are resolved against the note's folder (or the vault root for `/…`, `vaultImagePath`) and read into object URLs, revoked after printing; web and `data:image/` URLs are kept; a missing image prints its alt text.
- Mermaid (light `default` theme) and display math (`renderMathMl`: MathML, so no KaTeX stylesheet is needed) are rendered into their placeholders; an invalid one prints its error and source.
- Print page (`editor/utils/print-note.ts`): `PRINT_CSS` is always light, 18 × 16 mm margins, and avoids breaking table rows, code blocks, diagrams and callouts, and a heading from what follows. The document title (the PDF's default name) is the first H1, else the file name. The iframe stays until `afterprint` (or a minute).
- `Ctrl/Cmd+P` is untouched: it opens the command palette.

## Local State & Storage
- State: a busy ref (one export at a time). Reads `atom_content`, `atom_fileName`, `atom_activeFilePath`, `atom_fileMetadata`, `atom_vaultHandle`.
- Persistence: none.

## Dependencies
- Hooks: `useExportPdf` (`editor/hooks/use-export-pdf.ts`), `useRegisterCommand`.
- Utils: `noteToHtml` / `escapeHtml` (`app/utils/print/note-html.ts`), `printDocument` / `printHtml` (`editor/utils/print-note.ts`), `renderMermaid`, `renderMathMl`, `resolveFileHandleAtPath`.
- Zero-Cloud: no network or telemetry side effects (web images in the note load from their own URLs, as in the editor).

## Quick Usage
```tsx
// Mounted once in app/editor/page.tsx.
<PdfExport />
```

## Props Overview
None.
