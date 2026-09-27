# ChatContextChips

Description: Removable chips above the AI Chat input — uploaded attachments (image or file icon), then @mention references whose content is loaded for the next message.

## Local State & Storage
- State: None; lists are owned by `AIChatDialog`.
- Persistence: None.

## Dependencies
- Core: `Button`, `react-icons`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<ChatContextChips attachments={attachments} vaultRefs={refs}
  onRemoveAttachment={(i) => remove(i)} onRemoveVaultRef={(label) => removeRef(label)} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| attachments | `Attachment[]` | | Uploaded files |
| vaultRefs | `VaultRef[]` | | Loaded @mention references |
| onRemoveAttachment | `(index: number) => void` | | Remove an attachment |
| onRemoveVaultRef | `(label: string) => void` | | Remove a reference |
