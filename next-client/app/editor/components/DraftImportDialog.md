# DraftImportDialog

Description: Confirmation shown when an imported file would replace a draft that already has text ("Overwrite draft with …?").

## Local State & Storage
- State: None; the pending draft comes from `useDraftImport` (`hooks/use-draft-import.ts`).
- Persistence: None.

## Dependencies
- Core: `DialogModal`, `Button`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
const { pendingDraft, confirmPendingDraft, cancelPendingDraft } = useDraftImport(importFile);

<DraftImportDialog pendingDraft={pendingDraft} onConfirm={confirmPendingDraft} onCancel={cancelPendingDraft} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| pendingDraft | `{ text; name } \| null` | | Opens the dialog when set |
| onConfirm | `() => void` | | Replace the draft |
| onCancel | `() => void` | | Keep the current draft |
