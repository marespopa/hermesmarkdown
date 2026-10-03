# Home feed + frictionless new notes

## Intent
A vault opens to a **home feed** of recent notes. The **command palette** is how you reach anything, and a new note is always one tap or keystroke away: no folder picker, no name prompt, no empty files on disk.

## Behavior
- **Drafts save themselves.** New file (`Cmd+N`, `+`, the empty-pane button) opens a blank draft that isn't on disk yet. In a vault it's saved to the "new notes" folder (vault root by default), named after its first line with markdown and illegal characters stripped, capped at 60 chars, and falling back to `YYYY-MM-DD HHmm`. A name that's taken gets `(1)`, `(2)`, so nothing is overwritten. It saves:
  - on autosave, once the first line is finished;
  - on `Cmd+S` or the Save button;
  - on window blur or backgrounding (unless autosave is manual).

  The draft tab becomes the file in place, and the editor stays mounted so the caret and undo survive. Whitespace-only drafts are never written. The old picker + prompt flow is still available as the palette command "New file in folder…".
- **Home feed.** Opens on vault open (Settings → On Vault Open, default Home feed; "Resume last tabs" is the alternative), from the Home button (far left of the desktop header, left of the mobile header), or with the "Home feed" command. It shows:
  - a weekday header with an accent dot;
  - notes newest first, with a day label in the gutter on each day's first note;
  - title plus a 3-line preview, computed by the metadata worker;
  - no `.hermes/`, `.obsidian/` or `_`-prefixed files.

  Keyboard: `j`/`k` or arrows, Enter, Escape (back to the workspace), and typing to search. The bottom bar has "Search or create…" (opens the palette) and `+`. An empty vault shows "Start writing". Opening any file closes the feed.
- **Palette "Create '…'"**: a file query with no exact title match ends with a row that creates the note (`# Query` heading, caret below it) and opens it.
- **Header.** With one note in an unsplit workspace (Settings → Auto-hide Tabs, on by default), the tab strip becomes a title bar with the same styling: Home on the left, the title centered with a save dot, and palette / Save / More on the right. With several tabs, Home stays far left and the palette button joins the actions. The floating command-palette button and its setting are removed.

## Key files
- `app/editor/utils/draft-title.ts`, `app/utils/markdown-preview.ts`, `app/hooks/file-system/unique-file.ts`
- `app/atoms/file-atoms.ts` (`atom_openDraft`, `atom_materializeDraft`), `app/atoms/ui-atoms.ts` (`atom_onVaultOpen`, `atom_newNoteFolder`, `atom_autoHideTabs`, `atom_homeFeedOpen`)
- `app/editor/hooks/use-materialize-draft.ts`, `use-draft-flow.ts`, `use-home-feed.ts`, `use-vault-open-behavior.ts`
- `app/editor/components/HomeFeed.tsx` + `home-feed/`, `PaneTitleBar.tsx`, `PaneLeaf.tsx`
- `app/components/CommandPalette/*` (Create row, `setCreateNote`)
- `app/workers/metadata.worker.ts` (`preview`)

## Deferred
- Full-text search in the palette.
- ~~IndexedDB preview cache~~ — done: `services/metadata-cache.ts` + the `hooks/file-system/vault-index.ts` pipeline (stat pass, cache reuse, newest-first parsing), and the feed virtualizes above 100 notes.
- Streak strip.
- A keyboard shortcut for Home.
