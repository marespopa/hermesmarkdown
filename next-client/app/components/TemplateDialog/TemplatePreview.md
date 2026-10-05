# TemplatePreview

Description: Read-only, scaled-down look at the note a template would make right now, shown beside the [TemplatePicker](TemplatePicker.md) list. Dates and the title (the template's name) are filled in, questions show as accent pills, frontmatter keys appear as quiet property rows, headings are sized, tasks and bullets get ☐ / •. Each new preview slides in (`.template-preview-in`). Built from `templatePreview()` in `app/utils/templates/template-preview.ts`.

## Props
| Prop | Type | Description |
|---|---|---|
| raw | `string \| null` | Raw template text; null shows "Loading…" |
| name | `string` | Template name, used as the note title |
