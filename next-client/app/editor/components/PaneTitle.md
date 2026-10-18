# PaneTitle

Description: The pane's header on desktop, at its top left, in place of a toolbar: the note's folder in the vault as a faint breadcrumb (`Work / Projects /`, hidden below `sm`, full path in its tooltip); a deeper path keeps its first and last folders and folds the middle (`Work / … / Clients /`, `collapseCrumbs`), the folders truncate before the name does, and the slash before the name always stays. Then the note's name (without `.md`; "No note open" when the pane is empty), and after it a **dot** while the note needs a glance (with autosave on, `PaneLeaf` passes unsaved and saving as `idle` until the save is late, past autosave's wait), as a document window's close button shows unsaved changes (`SaveDot`): grey (`bg-fg-muted`) while edited, pulsing while saving, warm red after a failed save (tooltip: the error). Hover or keyboard focus turns it into the save glyph (a retry glyph after a failure); a click saves or retries (`onSave`, tooltip "Save (Ctrl/Cmd+S)"). While saving it's a plain `role="status"`, not a button; saved notes show nothing. The name is the file name: a click turns it into a field in place, the name selected; **Enter** or clicking away renames the file (`onRename`, which `PaneLeaf` sends to `renameFile`, adding back `.md`), **Escape** backs out. No prompt, modal or palette. The draft, and a note with no vault or file handle, show the name as plain text (no `onRename`). A right-click anywhere on the header opens the note's menu, and so does the **⋯ button** after the name ("Note actions", `onMenu`, opened under the button; a second press closes it): faint and shown on hover or keyboard focus, always shown on touch screens (`hover: none`) and while its menu is open (`menuOpen`); hidden while renaming and when no note is open. The command palette's `SearchPill` sits in the window's top-right corner (`EditorShell`). Quiet at rest: faint text, a soft fill on hover. It never hides while you type. A fade at the top of the pane (`PaneLeaf`) keeps it readable over scrolled text.

## Local State & Storage
- State: `editing` (the rename field is open), local; whether the ⋯ menu is open comes from `PaneLeaf`.
- Persistence: None.

## Dependencies
- Core: `Button` (`unstyled`), `BareInput`, `SaveState` (`save-state.tsx`), `formatShortcut`, `react-icons/hi`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<PaneTitle title="Roadmap" folder="Work" saveState="dirty" onRename={rename} onSave={save} onContextMenu={openNoteMenu} onMenu={openNoteMenuAt} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| title | `string \| null` |  | The note's name as shown; null when nothing is open |
| folder? | `string` | `""` | The note's vault folder, shown as a breadcrumb |
| saveState | `SaveState` |  | Drives the dot (shown for `dirty`, `saving`, `error`) |
| saveErrorMessage? | `string` |  | The red dot's tooltip and label |
| onSave? | `() => void` |  | Saves from the dot; absent makes it plain |
| onRename? | `(name: string) => void` |  | Renames the note; absent makes the name plain text |
| onContextMenu | `(event) => void` |  | Opens the note's menu |
| onMenu? | `(anchor: DOMRect) => void` |  | Opens or closes the menu from the ⋯ button; absent hides it |
| menuOpen? | `boolean` | `false` | The ⋯ menu is open: keeps the button shown |
| menuButtonRef? | `Ref<HTMLButtonElement>` |  | The ⋯ button, the menu's `anchorRef` |
