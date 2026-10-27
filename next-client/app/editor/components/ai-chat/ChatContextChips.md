# ChatContextChips

Description: The AI companion's next-message context as one row of removable chips, all in one look (a grey pill: icon, name, ×): the note the message is about, the selection (word count), @mention references whose content is loaded, then uploaded attachments (image or file icon). Renders nothing when there is none.

## Local State & Storage
- State: None; everything is owned by `CompanionComposer`.
- Persistence: None.

## Dependencies
- Core: `Button`, `react-icons`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<ChatContextChips path={path} selection={selection} attachments={attachments} vaultRefs={refs}
  onRemovePath={() => setPath(null)} onRemoveSelection={() => setSelection("")}
  onRemoveAttachment={(i) => remove(i)} onRemoveVaultRef={(label) => removeRef(label)} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| path | `string \| null` | | The note the message is about (shown with `onRemovePath`) |
| selection | `string` | `""` | Its selected text (shown with `onRemoveSelection`) |
| attachments | `Attachment[]` | | Uploaded files |
| vaultRefs | `VaultRef[]` | | Loaded @mention references |
| onRemovePath / onRemoveSelection | `() => void` | | Remove the note / the selection |
| onRemoveAttachment | `(index: number) => void` | | Remove an attachment |
| onRemoveVaultRef | `(label: string) => void` | | Remove a reference |
