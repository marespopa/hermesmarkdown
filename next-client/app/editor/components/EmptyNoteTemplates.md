# EmptyNoteTemplates

Description: Quick-start pills for an empty note. Rendered by [MarkdownEditor](MarkdownEditor.md) inside the sheet, resting just under the first line, while the note is empty (and isn't a template or in Preview). Each pill has a template icon (`TemplateIcon`) and name; one click fills the note through `useVaultTemplateInsert` (questions are asked as usual) and the text slides in. The pills fade out (150ms) as soon as the note has text, then unmount.

## Logic

- Sources: the vault's templates (`atom_templates`), at most four, plus **More…** (the full template picker) when there are more and a vault is open. Without vault templates, the starters that make sense as notes (`TEMPLATE_STARTERS` minus Basic), so a fresh vault still gets Journal, Meeting notes, Spec and Report.
- Motion: `.template-quick-pills` in `globals.scss` (rise-in on `data-state="open"`, fade on `"closed"`, `--ease-spring`; none with reduced motion).
- Touch targets are 44px high on mobile, 36px from 640px.

## Props

| Prop | Type | Description |
|---|---|---|
| isEmpty | `boolean` | Show the pills (false fades them out) |
| onPick | `(source: TemplateEntry \| TemplateSource) => void` | Fill the note from a template or a starter |
| onMore? | `() => void` | Open the template picker; shown with more than four templates |
