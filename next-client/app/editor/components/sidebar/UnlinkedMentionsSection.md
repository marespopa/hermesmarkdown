# UnlinkedMentionsSection

Description: The library section "Unlinked mentions", collapsed by default and rendered only when the search finds at least one mention: notes that name the note in front as plain text. Phrases are the file base name plus the frontmatter title when different (at least 2 characters; with none left it searches nothing). The search runs while the section is collapsed too, since an empty result hides it. It calls `findNoteMentions` (debounced 600 ms, re-run when the note, its phrases, `atom_fileMetadata` or the privacy listing change) over the paths in `atom_noteDisplayItems` except the current note; a superseded (null) result is ignored. Rows: display title with the snippet below. A click opens the note and sets `atom_pendingScrollTarget` to the hit's line and column. Nothing renders while the first search runs, without a worker, or with no hits; with hits, "Some notes are still being indexed" follows them when `pending > 0`. View-only: there is no link action.

## Local State & Storage
- State: the last result (local).
- Persistence: None.

## Dependencies
- Core: `findNoteMentions`, `isContentSearchAvailable`, `atom_fileMetadata`, `atom_noteDisplayItems`, `atom_pendingScrollTarget`, `SidebarSection`.
- Zero-Cloud: The worker is local; no network or telemetry.
