# LinkInsertDialog

Description: The "Add Link" dialog opened by the `/link` slash command. Enter in the text field moves to the URL field; Enter in the URL field inserts. Empty text becomes "link".

## Local State & Storage
- State: Text and URL drafts (useState), reset each time it opens.
- Persistence: None.

## Dependencies
- Core: `DialogModal`, `Input`, `Button`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<LinkInsertDialog isOpen={open} onClose={close} onInsert={(label, url) => insertLink(label, url)} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| isOpen | `boolean` | | Visibility |
| onClose | `() => void` | | Dismiss |
| onInsert | `(label: string, url: string) => void` | | Inserts `[label](url)` |
