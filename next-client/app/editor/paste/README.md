# editor/paste

Turns pasted rich text into Markdown. `codemirror/html-paste.ts` loads `convert-input.ts` on first paste, so `turndown` stays out of the editor bundle.

| File | Role |
|---|---|
| `convert-input.ts` | `convertInput(text, format)` and `detectFormat`: HTML, CSV/TSV or Markdown in, cleaned Markdown out |
| `html-structure.ts` | `hasMarkdownStructure`: whether copied HTML has structure worth converting (headings, lists, links, tables) |
| `html-tidy.ts` | Cleans pasted HTML before conversion (office and browser wrappers, inline styles) |
| `html-to-markdown.ts` | HTML to Markdown with `turndown` and the table serializer |
| `clean-markdown.ts` | The clean pass over converted Markdown, one fix per mess, counted by `cleaner-fixes.ts` |
| `cleaner-fixes.ts`, `list-nesting.ts`, `markdown-lines.ts` | Helpers for the clean pass |
| `cleaner-examples.ts` | Sample inputs, one per kind of mess, for the tests |
