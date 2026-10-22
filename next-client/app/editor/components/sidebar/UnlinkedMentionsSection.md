# UnlinkedMentionsSection

Description: The library section "Unlinked mentions", collapsed by default: notes that name the note in front as plain text. Phrases are the file base name plus the frontmatter title when different (at least 2 characters; none left shows "Title too short to search"). The inner `MentionList` mounts only while the section is open, so no worker request runs while collapsed. It calls `findNoteMentions` (debounced 600 ms, re-run when the note, its phrases, `atom_fileMetadata` or the privacy listing change) over the paths in `atom_noteDisplayItems` except the current note; a superseded (null) result is ignored. Rows: display title with the snippet below. A click opens the note and sets `atom_pendingScrollTarget` to the hit's line and column. States: nothing while the first search runs, "Search isn't available in this browser" without a worker, "No unlinked mentions", and "Some notes are still being indexed" when `pending > 0`. View-only: there is no link action.

## Local State & Storage
- State: the last result (local).
- Persistence: None.

## Dependencies
- Core: `findNoteMentions`, `isContentSearchAvailable`, `atom_fileMetadata`, `atom_noteDisplayItems`, `atom_pendingScrollTarget`, `SidebarSection`.
- Zero-Cloud: The worker is local; no network or telemetry.
