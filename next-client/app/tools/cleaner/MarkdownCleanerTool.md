# MarkdownCleanerTool

Description: The Markdown Cleaner, at `/tools/markdown-cleaner`. Example chips (Messy Markdown, Web page HTML, Google Docs paste, Spreadsheet CSV; choosing one also resets the format to Auto) and an input-format switch (**Auto**, Markdown, HTML, CSV/TSV). Below, the input `Textarea` on the left and the clean Markdown on the right, stacked below 768px. The output is recomputed as you type (`useDeferredValue` + `convertInput`), with `CleanerFixReport` under it; an empty input shows "Paste something to clean." With Auto, the helper text names the detected format.

**Rich paste:** with Auto or HTML chosen, a paste whose clipboard HTML has Markdown structure (`hasMarkdownStructure`: paragraphs, headings, lists, tables, links, emphasis, code, images, quotes) inserts that HTML in place of the plain text, so formatting from web pages, Google Docs and Word converts. A code editor's coloured `div`/`span` HTML has none, so it pastes as plain text; so does the browser's paste-as-plain-text shortcut.

Actions: `CleanerOpenButton`, **Copy Markdown** (`showCopyToast`), **Clear**. Copy is disabled with no output; Open with a blank input. Over `MAX_HANDOFF_CHARS`, a note says to copy instead.

## Local State & Storage
- State: `atom_cleanerInput` (`null` until edited, which shows the first example), `atom_cleanerFormat`.
- Persistence: this tab's sessionStorage (`hermes_tool_cleaner`, `hermes_tool_cleaner_format`).

## Dependencies
- Core: `convertInput` (`convert-input.ts`), `CleanerFixReport`, `CleanerOpenButton`, `Textarea`, `Button`, `showCopyToast` / `showErrorToast`.
- Zero-Cloud: conversion runs in the browser; nothing is uploaded.

## Quick Usage
```tsx
<MarkdownCleanerToolLoader /> // loads this client-only, with a skeleton
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) | | | |
