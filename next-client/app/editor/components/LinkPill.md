# LinkPill

Description: Floating pill over a Markdown or wiki link in the editor, offering open and edit (label and URL).

## Local State & Storage
- State: `isEditing` plus label and URL drafts (useState).
- Persistence: None - transient UI state.

## Dependencies
- Core: `Button`, `Input`, `DialogModal`, `react-icons`.
- Zero-Cloud: No network or telemetry side effects. `onOpen` may open the URL in a new tab after a user click.

## Quick Usage
```tsx
import { LinkPill } from "./LinkPill";

<LinkPill url={url} label={label} pos={{ top, left }} onOpen={open} onSave={save} onDismiss={hide} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| url / label | `string` |  | Link target and text |
| pos | `{ top: number; left: number }` |  | Screen position |
| type? | `"url" \| "wiki"` | `"url"` | Link kind |
| onOpen | `() => void` |  | Open action |
| onSave | `(newLabel: string, newUrl: string) => void` |  | Edit commit |
| onEdit? / onDismiss | `() => void` |  | Custom edit / close |
