# WikiLinkDialog

Description: Picks or creates a `[[WikiLink]]` target, with substring-matched suggestions from vault file metadata. With `onCreateFromTemplate` and at least one vault template, a third tab, **From template**, takes a note name (carried over from what was typed in the other tabs) and a template from a radio list with icons; the template the name points to is preselected and marked **Suggested** (`matchTemplateForName`: the name's folder, else a template whose name starts it, else a journal-like template for a date name) until another is picked. **Create from template and link** (or Enter) creates the note through the template (its questions are asked) and links it.

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
