# AutoSave

Description: Runs autosave (`useAutoSave`) for the editor page and hands its `flush` to the page through a ref. A component of its own so that following the note's text, which happens on every keystroke, re-renders this empty element and not the whole editor page.

## Local State & Storage
- State: None of its own; `useAutoSave` reads the active note's text and save state from the atoms.
- Persistence: None.

## Dependencies
- Core: React, `useAutoSave`.
- Zero-Cloud: Saves go to the local vault only.

## Quick Usage
```tsx
const flushRef = useRef<() => Promise<void>>(async () => {});
<AutoSave onDraftChange={handleDraftAutosave} flushRef={flushRef} />
```

## Props Overview
| Prop | Type | Description |
|---|---|---|
| onDraftChange? | `() => void` | Called when the draft's autosave wait is over |
| flushRef | `MutableRefObject<() => Promise<void>>` | Receives the pending save's flush |
