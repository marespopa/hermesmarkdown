# Architect report — 015 note links

## Run 1

**PRD:** `next-client/plans/015-note-links-three-parts-1/prd.md`

**Summary (3 phases):**
- Phase 1: shared pure link core (`app/utils/note-links/`: wikilink scanner that skips code, a map-based resolver with the same rules as `resolveFileMetaByName`, which now delegates to it, and a backlink index), plus a **Linked from** section in the library under Outline. Clicking a row opens the source note with the caret on the link.
- Phase 2: **Unlinked mentions** section, collapsed by default. It uses a new `content:mentions` worker query over the existing note-text index: whole-word, body-only matches, never inside `[[…]]`, private notes excluded. It has its own supersede slot, so it never cancels the palette's search.
- Phase 3: **link rewrite** after rename, move and undo (`useRewriteLinksAfterMove`, run between `atom_remapVaultPaths` and the rescan). The minimal-diff rule rewrites only links that would stop resolving to the same note. Heading, alias and embed are kept, code is skipped, and writes go through `writeThrough` (disk wins, no prompts), so all three vault backends work.

**Already exists:**
- Link extraction into `FileMetadata.links` (`parse-note.ts`).
- The resolver (`resolve-file-by-name.ts`).
- The note-text index and search in the worker.
- `atom_remapVaultPaths`, which already makes tabs, layout, metadata and pins follow renames and moves.
- `writeThrough` for open-tab-safe writes.
- `atom_pendingScrollTarget` for opening a note at a line.
- `SidebarSection` with remembered or default collapse.

**Decisions to look at before handoff:**
- The sections go in the desktop library, not at the bottom of the note. Mobile gets nothing for now, the same as Outline.
- Mentions search the file base name plus the display title when it differs. Aliases aren't supported.
- Mentions are view-only, with no "Link" action.
- The rewrite is automatic, with a count toast. There is no confirm and no setting. Undo restores the link text.
- Notes not yet indexed while the first vault pass is still running are missed by the rewrite.
- Linked from still counts links inside code blocks, as metadata does today. The rewrite and the jump-to-link skip code.

**Open questions (non-blocking):**
- Should there be a mobile surface later?
- Is the move toast wording (`· updated links in N notes`) right?

**Handoff:** `Implement next-client/plans/015-note-links-three-parts-1/prd.md, phases 1–3 (in order).`
