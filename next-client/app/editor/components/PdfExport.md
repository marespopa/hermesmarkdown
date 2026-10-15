# PdfExport

Description: Mounts **Export as PDF…** once per editor page, and the export dialog it opens (`PdfExportDialog`): the note's page setup beside a preview of its pages. **Save as PDF…** prints the rendered note from a hidden iframe through the browser's print dialog, where **Save as PDF** makes the file. Nothing leaves the device.

## Behavior
- Palette command **Export as PDF…** (Document; keywords pdf, print, export, share, archive) and the toolbar's More → **Export as PDF…** (`exportActivePdf()` dispatches `hermes:export-pdf`) run the same export.
- Disabled, with the reason, for an empty note or a private note that's still veiled (`atom_revealAllPrivate` / `atom_revealedPrivatePaths`, the same check as `PrivateNoteGate`); the More menu's event shows the reason as an error toast instead.
- Page setup (`app/utils/print/print-settings.ts`, `printSettingsFrom`): flat frontmatter keys `pdf_page_size` (`A4`, the default, or `Letter`), `pdf_margins` (1–4 CSS lengths in mm/cm/in/pt/px, a bare number is mm; default `18mm 16mm`), `pdf_header` / `pdf_footer` (text with `{title}`, `{date}` (the export day, YYYY-MM-DD), `{page}`, `{pages}`; `|` splits it into left | right or left | centre | right) and `pdf_page_break` (the line that starts a new page; default `<!-- pagebreak -->`, `---` makes horizontal rules break pages). Values it can't read fall back to the defaults.
- Rendering (`app/utils/print/note-html.ts`, `noteToHtml`): the editor's Lezer Markdown parser, everything escaped; frontmatter, raw HTML and comments are left out; wikilinks print as their text; folded callouts print expanded; only web and mail links stay links.
- Embeds (`useCompileEmbeds`, `editor/hooks/use-embed-reader.ts` → `expandEmbeds` in `editor/utils/note-embeds.ts`): each embed line becomes what it embeds before rendering: a note's text with its own embeds filled in (up to `MAX_EMBED_DEPTH` levels; a note already being filled in higher up keeps its line, so loops stop), a CSV as a table, a code file as a fenced block, an image as an image link from the vault root. Relative images inside an embedded note are rewritten from the vault root (`rootImageLinks`) so they still resolve. Veiled private notes and files that can't be read keep their lines.
- **Download Compiled Markdown** (Document; `useDownloadCompiled`, `editor/hooks/use-download-compiled.ts`): the same compiled text as a `.md` download, never written to the vault. Disabled when the note has no embeds or is a veiled private note.
- Images: `![alt](src)` paths are resolved against the note's folder (or the vault root for `/…`, `vaultImagePath`) and read into object URLs, revoked after printing; web and `data:image/` URLs are kept; a missing image prints its alt text.
- Mermaid (light `default` theme) and display math (`renderMathMl`: MathML, so no KaTeX stylesheet is needed) are rendered into their placeholders; an invalid one prints its error and source.
- Page breaks: a top-level block whose source is exactly the marker becomes `<div class="page-break">` (not inside lists or quotes).
- Print page (`editor/utils/print-note.ts`): `pageCss` writes the `@page` rule (size, margins, and header/footer as page-margin boxes with `counter(page)` / `counter(pages)`; Chrome and Edge 131+ print them, Firefox and Safari leave them out). Header text is a CSS string with `<` escaped, so a title can't end the `<style>`. `PRINT_CSS` is always light and avoids breaking table rows, code blocks, diagrams and callouts, and a heading from what follows. The document title (the PDF's default name) is the first H1, else the file name. The iframe stays until `afterprint` (or a minute).
- `Ctrl/Cmd+P` is untouched: it opens the command palette.

## Local State & Storage
- State: a busy ref (one export at a time); the `PdfJob` on show in the dialog (title, body HTML, settings, date, image object URLs). The URLs are revoked on Cancel, a replaced job, unmount, or after printing. Reads `atom_content`, `atom_fileName`, `atom_activeFilePath`, `atom_fileMetadata`, `atom_vaultHandle`.
- Persistence: none.

## Dependencies
- Components: `PdfExportDialog`.
- Hooks: `useExportPdf` (`editor/hooks/use-export-pdf.ts`, returns `{ job, close, print }`), `useDownloadCompiled`, `useCompileEmbeds`, `useRegisterCommand`.
- Utils: `noteToHtml` / `escapeHtml` (`app/utils/print/note-html.ts`), `printSettingsFrom` (`app/utils/print/print-settings.ts`), `printDocument` / `pageCss` / `printHtml` (`editor/utils/print-note.ts`), `renderMermaid`, `renderMathMl`, `resolveFileHandleAtPath`.
- Zero-Cloud: no network or telemetry side effects (web images in the note load from their own URLs, as in the editor).

## Quick Usage
```tsx
// Mounted once in app/editor/page.tsx.
<PdfExport />
```

## Props Overview
None.
