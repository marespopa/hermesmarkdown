---
state: new
blocked_from:
rejections: 0
created: 2026-10-11T18:31:10Z
---

# Export note to PDF

Part of the review ladder (`plans/review-ladder.md`), level 4: sharing quarterly updates and keeping offline archives. Useful for any note.

## Problem
There's no way to get a clean PDF of a note. Quarterly and yearly reviews get shared with teammates or archived offline, and today that means copying Markdown into another tool. Our own marketing page (`app/markdown-editor/page.tsx`) lists PDF export as a key feature of a Markdown editor, and we don't have it.

## Desired behavior
- A palette command **Export as PDF…** (and an entry in the toolbar's More menu next to Copy Markdown) for the open note.
- **Local only:** no server round trip and no upload. The note never leaves the device. The natural route is the browser's print pipeline with a print stylesheet (the user picks "Save as PDF"); the architect confirms this versus a client-side PDF library, weighing bundle size and fidelity, and says why.
- What's printed is the rendered preview, not the editor:
  - Headings, lists, task boxes (checked/unchecked), tables, code blocks with highlighting, callouts (folded callouts printed **expanded**), Mermaid diagrams, images from the vault.
  - Wikilinks print as their text (optionally with the target in small type); the rollup marker comments never print.
  - Frontmatter isn't printed by default; the title comes from the H1, else the file name.
  - Light theme always, regardless of app theme; sensible page margins; no app chrome; page breaks avoid splitting a table row, a code block line or a heading from its first paragraph.
- **Sensitive notes:** a note marked sensitive/private needs the same explicit unlock it needs today before it's exported; the architect checks the veil can't be bypassed by printing (including Cmd/Ctrl+P while the veil is up).
- Cmd/Ctrl+P: the architect decides whether to hook it to the same clean output (likely yes, since the default print of the app page is useless). Check it doesn't break anything in the browsers listed in the Quick jot brief.
- Works on mobile Safari/Chrome through their share/print sheet.
- Docs: a short "Export to PDF" section, and update the shortcuts list if Cmd/Ctrl+P changes.

## Out of scope
- Batch export of several notes, or a whole quarter's sheets into one PDF (possible follow-up).
- DOCX/HTML export.
- Custom PDF themes, headers/footers settings.
