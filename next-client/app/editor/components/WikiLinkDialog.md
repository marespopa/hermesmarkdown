# WikiLinkDialog

Description: Picks or creates a `[[WikiLink]]` target, with substring-matched suggestions from vault file metadata.

## Local State & Storage
- State: `atom_fileMetadata`. Mode (existing or new), search, new file name, and highlight index are local useState.
- Persistence: None itself. `onCreateAndConfirm` may create a local file.

## Dependencies
- Core: `DialogModal`, `Button`, `Input`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import WikiLinkDialog from "./components/WikiLinkDialog";

<WikiLinkDialog isOpen={open} onClose={close} onConfirm={insertLink} title="Insert WikiLink" />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| isOpen | `boolean` |  | Visibility |
| onClose | `() => void` |  | Dismiss handler |
| onConfirm | `(fileName: string) => void` |  | Chosen target |
| onCreateAndConfirm? | `(fileName: string) => Promise<string \| null>` |  | Creates a missing note |
| initialValue? | `string` | `""` | Prefill |
| title? | `string` | `"Edit WikiLink"` | Dialog title |
