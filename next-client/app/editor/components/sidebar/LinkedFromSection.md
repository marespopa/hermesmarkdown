# LinkedFromSection

Description: The library section "Linked from" under Outline: the notes whose `[[wikilinks]]` or `![[embeds]]` resolve to the note in front (bare, path, alias and heading forms), from `atom_backlinkIndex`. Rows are the source's display title (`atom_noteDisplayItems`, so private notes are absent at the `hidden` level), sorted case-insensitively; two rows with the same title also show the parent folder. Empty: "No notes link here". A click opens the source (`onOpen`) and, via `link-jump.ts#jumpToFirstLink`, puts the caret on its first link (outside code) to the note through `atom_pendingScrollTarget`. Shown by `WorkspaceSidebar` for a vault note on the editor route (not the draft, not on mobile).

## Local State & Storage
- State: none (derived rows). Collapsed state is `SidebarSection`'s.
- Persistence: None.

## Dependencies
- Core: `atom_backlinkIndex`, `atom_noteDisplayItems`, `atom_fileMetadata`, `SidebarSection`, `Button`.
- Zero-Cloud: No network or telemetry side effects.
