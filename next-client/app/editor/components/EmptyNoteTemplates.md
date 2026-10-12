# EmptyNoteTemplates

Description: Quick-start pills for an empty note. Rendered by [MarkdownEditor](MarkdownEditor.md) inside the sheet, resting just under the first line, while the note is empty (and isn't a template). Each pill has a template icon (`TemplateIcon`) and name; one click fills the note through `useVaultTemplateInsert` (questions are asked as usual) and the text slides in. The pills fade out (150ms) as soon as the note has text, then unmount.

## Logic

- Sources: the vault's templates (`atom_templates`), at most four, plus **More…** (the full template picker) when there are more. A vault with no templates gets a single **Browse template packs** pill that goes to the Templates page (`/editor/templates`, `useRouter`), where packs are added. Nothing shows without a vault (`atom_vaultHandle`).
- Motion: `.template-quick-pills` in `globals.scss` (rise-in on `data-state="open"`, fade on `"closed"`, `--ease-spring`; none with reduced motion).
- Touch targets are 44px high on mobile, 36px from 640px.

## Props

| Prop | Type | Description |
|---|---|---|
| isEmpty | `boolean` | Show the pills (false fades them out) |
| onPick | `(template: TemplateEntry) => void` | Fill the note from a vault template |
| onMore? | `() => void` | Open the template picker; shown with more than four templates |
