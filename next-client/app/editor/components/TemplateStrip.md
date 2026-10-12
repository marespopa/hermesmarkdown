# TemplateStrip

Description: One quiet line at the top of a template note (a `.md` file directly in `templates/` at the vault root, or one folder down in a pack), rendered by [MarkdownEditor](MarkdownEditor.md) above the text. It lets someone author a template without knowing its file format: **Editing template: Name · + Add field**, plus plain-language warnings from `lintTemplate()` (the same ones AI Chat's save card shows). Nothing is shown below the line when there are no warnings.

## Props

| Prop | Type | Description |
|---|---|---|
| name | `string` | Template name (file name without `.md`) |
| doc | `string` | The template's raw text |
| onAddField | `() => void` | Opens the field menu at the caret (`openTemplateFieldMenu`) |

## Logic

- **+ Add field** types `{{` at the caret and opens the field menu, the same one `/field` or typing `{{` opens.
- Warnings: `lintTemplate(doc)`, memoized on the text.
