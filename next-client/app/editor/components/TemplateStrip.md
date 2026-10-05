# TemplateStrip

Description: One quiet line at the top of a template note (a direct `.md` child of the templates folder), rendered by [MarkdownEditor](MarkdownEditor.md) above the text and hidden in Preview. It makes templates authorable without the docs: it says how many `{{prompt:…}}` fields the template asks for, offers **+ Add field**, and lists the same `lintTemplate()` warnings AI Chat's save card shows (unknown tokens, empty prompt label, several cursors, misspelled routing keys). Nothing is shown below the line when there are no warnings.

## Props

| Prop | Type | Description |
|---|---|---|
| doc | `string` | The template's raw text |
| onAddField | `() => void` | Opens the field menu at the caret (`openTemplateFieldMenu` in `codemirror/template-field-completion.ts`) |

## Logic

- Field count: `extractPromptLabels(doc).length` (distinct labels; the same label asks once).
- Warnings: `lintTemplate(doc)`, memoized on the text.
- **+ Add field** types `{{` at the caret and opens the same field menu that typing `{{` or `/field` opens.
