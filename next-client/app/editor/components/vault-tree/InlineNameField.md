# InlineNameField

Description: The in-place name field of a file-tree row being renamed or created, as in Finder. Focuses with the name selected; Return or clicking away commits (once), Escape cancels. Swallows its own key, click and context-menu events so the tree's shortcuts don't act while typing.

## Local State & Storage
- State: Uncontrolled input (`defaultValue`); a ref makes sure it finishes once.
- Persistence: None.

## Dependencies
- Core: `BareInput`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import { InlineNameField } from "./vault-tree/InlineNameField";

<InlineNameField label="Folder name" initialValue="untitled folder" onCommit={create} onCancel={stop} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| initialValue | `string` | | Starting text (selected) |
| label | `string` | | Accessible name |
| onCommit / onCancel | `(value) => void` / `() => void` | | Return or blur / Escape |
