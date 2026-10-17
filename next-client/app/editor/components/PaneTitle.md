# PaneTitle

Description: The pane's header on desktop, at its top left, in place of a toolbar: the note's folder in the vault as a faint breadcrumb (`Work / Projects /`, hidden below `sm`, full path in its tooltip), then the note's name (without `.md`; "No note open" when the pane is empty), and a small dot after it only while the note is unsaved, saving or failed to save (`statusDot` in `save-state.tsx`; the error dot's tooltip is the error). The name is the file name: a click turns it into a field in place, the name selected; **Enter** or clicking away renames the file (`onRename`, which `PaneLeaf` sends to `renameFile`, adding back `.md`), **Escape** backs out. No prompt, modal or palette. The draft, and a note with no vault or file handle, show the name as plain text (no `onRename`). A right-click anywhere on the header opens the note's menu. The command palette has its own button in the window's top-right corner (`EditorShell`). Quiet at rest: faint text, a soft fill on hover. It fades out while you type in a note and returns when the pointer moves (`useFadeWhileTyping`, `hooks/use-fade-while-typing.ts`; keyboard focus and the rename field always show it). A fade at the top of the pane (`PaneLeaf`) keeps it readable over scrolled text.

## Local State & Storage
- State: `editing` (the rename field is open), local.
- Persistence: None.

## Dependencies
- Core: `Button` (`unstyled`), `BareInput`, `save-state.tsx`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<PaneTitle title="Roadmap" folder="Work" saveState="dirty" onRename={rename} onContextMenu={openNoteMenu} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| title | `string \| null` |  | The note's name as shown; null when nothing is open |
| folder? | `string` | `""` | The note's vault folder, shown as a breadcrumb |
| saveState | `SaveState` |  | Drives the dot (shown for `dirty`, `saving`, `error`) |
| saveErrorMessage? | `string` |  | The error dot's tooltip |
| onRename? | `(name: string) => void` |  | Renames the note; absent makes the name plain text |
| onContextMenu | `(event) => void` |  | Opens the note's menu |
