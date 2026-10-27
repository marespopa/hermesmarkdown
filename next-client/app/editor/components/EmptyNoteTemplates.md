# EmptyNoteTemplates

Description: Quick-start pills for an empty note. Rendered by [MarkdownEditor](MarkdownEditor.md) inside the sheet, resting just under the first line, while the note is empty (and isn't a template). Each pill has a template icon (`TemplateIcon`) and name; one click fills the note through `useVaultTemplateInsert` (questions are asked as usual) and the text slides in. The pills fade out (150ms) as soon as the note has text, then unmount.

## Logic

- Open Vault: with no vault open, an **Open Vault** pill comes first, where the browser can hold a vault: it opens a folder on disk (`openVault`, `useFileSystem`), or, without disk folder access, the browser vault dialog (`atom_browserVaultDialogOpen`). It fades with the others once the note has text.
- Sources: the vault's templates (`atom_templates`), at most four, plus **More…** (the full template picker) when there are more. With no templates yet, or no vault at all, the built-in starters (`STARTER_TEMPLATES` in `template-packs.ts`: Meeting notes, Project brief) take their place; they carry their own `body`, so nothing is read from or written to the vault. With a vault, a **New template** pill follows them and opens the template wizard (`newTemplate()` from `useFileSystem`). A **Board** pill (with `onBoard`, vault only: it may create a file) comes next: MarkdownEditor wires it to `useEmptyNoteBoard`, which turns the empty note into a drawing board in place, or, from the draft, asks for a name and creates `<name>.board.md`.
- Motion: `.template-quick-pills` in `globals.scss` (rise-in on `data-state="open"`, fade on `"closed"`, `--ease-spring`; none with reduced motion).
- Touch targets are 44px high on mobile, 36px from 640px.

## Props

| Prop | Type | Description |
|---|---|---|
| isEmpty | `boolean` | Show the pills (false fades them out) |
| onPick | `(template: TemplateEntry) => void` | Fill the note from a vault template or a built-in starter |
| onMore? | `() => void` | Open the template picker; shown with more than four templates |
| onBoard? | `() => void` | Start a drawing board instead of text; shows the Board pill |
