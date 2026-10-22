# PaneTitle

Description: The pane's header on desktop, at its top left, in place of a toolbar: the note's folder in the vault as a faint breadcrumb (`Work / Projects /`, hidden below `sm`, full path in its tooltip); a deeper path keeps its first and last folders and folds the middle (`Work / … / Clients /`, `collapseCrumbs`), the folders truncate before the name does, and the slash before the name always stays. With `onOpenFolder` each folder is a button (`crumbTargets`): a click opens that folder's contents in a `FolderPopover` below it, and the folded `…` opens the last folder it hides (its tooltip lists them), from where the popover's ← steps up. Without it the breadcrumb stays plain text. Then the note's name (without `.md`; "No note open" when the pane is empty), and after it a **dot** while the note needs a glance (with autosave on, `PaneLeaf` passes unsaved and saving as `idle` until the save is late, past autosave's wait), as a document window's close button shows unsaved changes (`SaveDot`): grey (`bg-fg-muted`) while edited, pulsing while saving, warm red after a failed save (tooltip: the error). Hover or keyboard focus turns it into the save glyph (a retry glyph after a failure); a click saves or retries (`onSave`, tooltip "Save (Ctrl/Cmd+S)"). While saving it's a plain `role="status"`, not a button; saved notes show nothing. The name is the file name, and a button: a click opens the note's menu under it ("Note actions", `onMenu`; a second click closes it; it keeps a soft fill while the menu is open, `menuOpen`), as a right-click anywhere on the header does. There is no separate ⋯ button. The menu's **Rename** (`renameRequest`, bumped by `PaneLeaf`) turns the name into a field in place, the name selected; **Enter** or clicking away renames the file (`onRename`, which `PaneLeaf` sends to `renameFile`, adding back `.md`), **Escape** backs out. No prompt, modal or palette. The draft, and a note with no vault or file handle, have no Rename (no `onRename`); with no note open the name is plain text. The command palette's `SearchPill` sits in the window's top-right corner (`EditorShell`). Quiet at rest: faint text, a soft fill on hover. It never hides while you type. A fade at the top of the pane (`PaneLeaf`) keeps it readable over scrolled text.

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
| renameRequest? | `number` | `0` | Bumped to start renaming in place (the menu's Rename) |
| onOpenFolder? | `(folder, anchor: DOMRect) => void` | — | Opens a breadcrumb's folder below its crumb; absent keeps the breadcrumb plain text |
| saveState | `SaveState` |  | Drives the dot (shown for `dirty`, `saving`, `error`) |
| saveErrorMessage? | `string` |  | The red dot's tooltip and label |
| onSave? | `() => void` |  | Saves from the dot; absent makes it plain |
| onRename? | `(name: string) => void` |  | Renames the note; absent means no in-place rename |
| onContextMenu | `(event) => void` |  | Opens the note's menu |
| onMenu? | `(anchor: DOMRect) => void` |  | Opens or closes the menu from a click on the name; absent makes the name plain text |
| menuOpen? | `boolean` | `false` | The menu is open from the name: keeps its fill and `aria-expanded` |
| menuButtonRef? | `Ref<HTMLButtonElement>` |  | The name's button, the menu's `anchorRef` |

