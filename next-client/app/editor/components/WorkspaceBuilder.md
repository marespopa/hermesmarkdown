# WorkspaceBuilder

Description: Dialog for creating or editing a custom workspace (a saved, rule-based file query over vault metadata).

## Local State & Storage
- State: `atom_customWorkspaces`, `atom_fileMetadata` (for tag and field suggestions). The name, the AND/OR `operator`, and rule drafts are local useState; the saved icon is always `"Collection"`.
- Persistence: `localStorage["customWorkspaces"]`.

## Dependencies
- Core: `DialogModal`, `Input`, `Typeahead`, `Button`, `app/utils/queryEngine` (`QueryRule`).
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import WorkspaceBuilder from "./WorkspaceBuilder";

<WorkspaceBuilder isOpen={open} onClose={close} editingWorkspace={ws} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| isOpen | `boolean` |  | Visibility |
| onClose | `() => void` |  | Dismiss handler |
| editingWorkspace? | `CustomWorkspace \| null` |  | Edit an existing workspace instead of creating one |
