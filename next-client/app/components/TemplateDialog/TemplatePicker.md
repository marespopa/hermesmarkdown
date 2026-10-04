# TemplatePicker

Description: Modal list of vault templates. A search field (focused on open) filters by a case-insensitive substring of the name. ↑/↓ move the highlight, Enter picks, clicking a row picks, Esc or Cancel cancels. Rows show the name with the template's path as faint detail and are at least 44 px high, so the same modal works on mobile. With `includeBlank`, a "Blank note" row comes first (missing-link creation). With no templates and no Blank row, it shows "No templates in `<folder>/`" and a hint.

## Local State & Storage
- State: search query and highlighted row index.
- Persistence: None - transient UI state.

## Dependencies
- Core: `DialogModal` (close button hidden; Esc via the overlay), `BareInput`, `Button` (`menu-item` rows, `secondary` Cancel).
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<TemplatePicker isOpen title="Insert template" templates={templates} folder="templates"
  includeBlank={false} onPick={(entry) => …} onCancel={() => …} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| isOpen | `boolean` | | Visibility |
| title | `string` | | Dialog heading |
| templates | `TemplateEntry[]` | | Sorted templates (`atom_templates`) |
| folder | `string` | | Templates folder in use, for the empty state |
| includeBlank | `boolean` | | Show "Blank note" first |
| onPick | `(value: TemplateEntry \| "blank") => void` | | Picked row |
| onCancel | `() => void` | | Esc / Cancel |
