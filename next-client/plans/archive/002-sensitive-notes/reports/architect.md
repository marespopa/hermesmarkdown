# Architect report — 002 sensitive notes

## Run 1

**PRD:** `next-client/plans/002-sensitive-notes/prd.md`

### Summary
The PRD has 3 phases:
- **Phase 1: model, setting, home feed.** Detect sensitive notes from frontmatter: `sensitive: true`, or `sensitive` / `private` in `tags`. A pure display factory (`app/utils/note-display.ts#createNoteDisplayItem`) and a derived `atom_noteDisplayItems` decide title, preview and exclusion per privacy level. A persisted `atom_privacyLevel` (`hermes_privacy_mode`, default `show_title`, read on init so nothing flashes) sets the level. The phase also adds a Settings → Privacy section and three palette commands. The home feed is routed through the factory, with a lock badge and masked, blurred or omitted previews.
- **Phase 2: command palette and Tasks page.** File, recent, pinned and `#tag` rows get a lock, or are left out in `hidden`. Tasks from sensitive notes (palette `!` scope and the Tasks page) are masked or omitted, and never match text search. This needs two extractions to stay under 400 lines: `use-palette-files.ts` and `TaskRow.tsx`.
- **Phase 3: editor veil.** A `SensitiveNoteGate` in `PaneLeaf` stands in for the editor with a veil ("Show note" / "Show all sensitive notes this session") until the note is revealed. The reveal lasts only for the session, carries over renames, and never hides a note mid-edit.

### Already exists
- The metadata worker already indexes frontmatter (`metadata.worker.ts:50`) and restores it from the IndexedDB cache, so no worker or cache change is needed.
- Feed titles never fall back to body paragraphs (`feed-model.ts#feedTitle`).
- There are no wikilink hover previews (`link-display.ts` sets only a `title` attribute), so there's nothing to change there.
- Settings controls (`SegmentedControl`, `SettingItem`) and the command builder pattern can be reused.

### Decisions / open questions to review
- **No "off" level.** The session reveal covers editor friction.
- **Reveal is editor-only.** Listings follow only the privacy level.
- **Tasks count as body snippets.** The Tasks page and the palette `!` scope mask or hide them.
- **`hidden` applies to the home feed, the palette and the Tasks page.** The file tree, Explorer filter, mobile search panel, Smart folders and the wiki-link picker show names only and stay unchanged.
- **The H1-derived title counts as a title.** The fallback is the file name, then "Untitled sensitive note".
- **Any marker wins.** `sensitive: false` doesn't cancel a `private` tag.
- **Blurred previews unblur on hover or keyboard focus, not on selection.**
- **Open questions:**
  - Should sensitive notes be excluded from AI `@vault` / `@folder` context? They are sent to the AI provider today. Recommended: yes, as a follow-up.
  - Should `hidden` also filter the Explorer and mobile search?
  - Sensitive drafts take their file name from the first line. Is a docs hint enough?

### Handoff
Implement next-client/plans/002-sensitive-notes/prd.md, phase 1
