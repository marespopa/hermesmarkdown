## Foldable `<details>` sections

- Raw HTML `<details><summary>` blocks fold in the editor like callouts: the summary line stays (bold, tags hidden off the caret line), the body folds, and sections start collapsed unless the tag has `open`.
- The chevron writes or removes `open` in the note, so it reopens the same way here and elsewhere.
- Export as PDF and embeds show every section open; Export as HTML keeps each section's open/closed state as a native `<details>`.
- A shared line scanner (`app/utils/details-blocks.ts`) serves both the editor fold and `noteToHtml`; the existing callout fold hook gained a `details` chevron kind, so `MarkdownEditor.tsx` is unchanged.
