# markdown-editor

Render pieces of [`MarkdownEditor`](../MarkdownEditor.md). The editing behaviour itself lives in CodeMirror extensions and the `use-codemirror-*` hooks.

| File | Purpose |
|---|---|
| [EditorPills](EditorPills.md) | Floating helpers next to the caret: date picker, link pill, workflow/task pills, Mermaid and image viewer buttons, code-language picker. |
| [LinkInsertDialog](LinkInsertDialog.md) | The "Add Link" dialog opened by `/link`. |
| [FoldChevrons](FoldChevrons.md) | Collapse/expand chevrons for foldable callouts and frontmatter. |
| [VimStatusPill](VimStatusPill.md) | Vim mode, pending keys and the `:` / `/` prompt, floating at the bottom of the pane. |
| [EditorOutline](EditorOutline.md) | The note's H1–H3 headings in a box fixed in the pane's bottom-right corner, the section being read marked; click one to jump there. Off unless Outline is on (Ctrl/Cmd+Shift+M, Settings → Editor → View). In a code file, its symbols with kind icons. |
| [WordCountPill](WordCountPill.md) | The note's word count, faint in the bottom-left corner; steps aside while typing. Off unless Settings → Editor → Word Count is on. |
| [SymbolIcon](EditorOutline.md#symbol-icons) | A code outline row's kind glyph (class, method, field, constant…), in the neutral icon grey. |
