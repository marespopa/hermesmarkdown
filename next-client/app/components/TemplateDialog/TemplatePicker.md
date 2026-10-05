# TemplatePicker

Description: Modal list of vault templates, or of starters for "New template…" (any `{ name, path?, description? }`; generic over the entry type, so `onPick` returns the entry it was given). A search field (focused on open) filters by a case-insensitive substring of the name. ↑/↓ move the highlight, Enter picks, **⌘/Ctrl+1…9** pick a row directly (hints shown from 640px), clicking a row picks, Esc or Cancel cancels. Each row has a monochrome icon picked from the name (`TemplateIcon`), the name, and a 12px muted summary underneath: the entry's description, else its structure (`templateSummary`, e.g. "3 sections • Action items • Today's date"), else its path. Rows are at least 44px high, so the same modal works on mobile. With `includeBlank`, a "Blank note" row comes first (missing-link creation). With no templates and no Blank row, it shows "No templates in `<folder>/`" and a hint.

With `bodies`, the dialog widens and a read-only [preview](TemplatePreview.md) of the highlighted template sits beside the list (hidden below 640px). The surface is the glass `.template-picker-surface` (`--glass-surface`, `--glass-border`, `--glass-shadow` in `globals.scss`).

## Local State & Storage
- State: search query and highlighted row index.
- Persistence: None - transient UI state.

## Dependencies
- Core: `DialogModal` (close button hidden; Esc via the overlay), `BareInput`, `Button` (`menu-item` rows, `secondary` Cancel), `TemplateIcon`, `TemplatePreview`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<TemplatePicker isOpen title="Insert template" templates={templates} folder="templates"
  includeBlank={false} bodies={bodies} onPick={(entry) => …} onCancel={() => …} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| isOpen | `boolean` | | Visibility |
| title | `string` | | Dialog heading |
| templates | `T[]` (`TemplatePickerEntry`) | | Sorted templates (`atom_templates`) or `TEMPLATE_STARTERS` |
| folder | `string` | | Templates folder in use, for the empty state |
| includeBlank | `boolean` | | Show "Blank note" first |
| bodies? | `Record<string, string \| null>` | | Raw text per entry (`pickerEntryKey`: path, else name; null while loading). Turns on summaries and the preview pane |
| onEdit? | `(entry: T) => void` | | Edit a template: a pencil on each template row (on hover from 640px, always on touch) and ⌘/Ctrl+E on the highlighted row |
| onPick | `(value: T \| "blank") => void` | | Picked row |
| onCancel | `() => void` | | Esc / Cancel |
