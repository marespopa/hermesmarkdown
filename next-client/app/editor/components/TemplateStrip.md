# TemplateStrip

Description: One quiet line at the top of a template note (a direct `.md` child of the templates folder), rendered by [MarkdownEditor](MarkdownEditor.md) above the text and hidden in Preview. It lets someone author a template without knowing its file format: **Template · New notes go in [folder ▾] · + Add field**, plus plain-language warnings from `lintTemplate()` (the same ones AI Chat's save card shows). Nothing is shown below the line when there are no warnings.

## Props

| Prop | Type | Description |
|---|---|---|
| doc | `string` | The template's raw text |
| view | `EditorView \| null` | The editor; the folder change goes through it as one undoable change |
| onAddField | `() => void` | Opens the field menu at the caret (`openTemplateFieldMenu`) |

## Logic

- **New notes go in**: shows the template's `target_folder` (`splitTemplate(doc).routing`), or "New Notes folder" when there is none. Clicking opens `dialog.select` with "Your New Notes folder (default)", every folder that holds a note (ancestors included; hidden and templates folders left out), and "+ New folder…" (a name prompt; the folder is created with the first note). The choice is written with `setTemplateTargetFolder()`, which adds or removes the `target_folder` frontmatter line (and the block when it ends up empty); only the changed span is replaced.
- **+ Add field** types `{{` at the caret and opens the field menu, the same one `/field` or typing `{{` opens.
- Warnings: `lintTemplate(doc)`, memoized on the text.
