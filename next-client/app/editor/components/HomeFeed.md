# HomeFeed

Description: The vault's home screen — recent notes, newest first, in the editor's column width. A greeting for the time of day ("Good morning" from 5:00, "Good afternoon" from 12:00, "Good evening" from 17:00, "Up late" from 22:00), with `atom_userName` when one is set (from the welcome wizard's first step) ("Good morning, Ada!"; "Good morning!" without one) sits above a large weekday header with an accent dot (month and day on the right), then one row per note: day label in the left gutter ("Today", "Yesterday", the weekday for the rest of the past week, a short date after that; only on the first note of each day), the title, and up to three lines of plain-text preview. A floating bar at the bottom holds the search pill and a `+` new-note button. The pill is the command palette's search field at rest. It shares a view-transition name with that field, so clicking it (or typing on the feed, or pressing ⌘K) morphs the pill into the palette, and closing morphs it back. Both use the same icon, type size and "Search or create a note…" wording, and the palette's "Create '…'" row makes new notes. An empty vault shows the header and a quiet "Start writing" button. Large vaults: indexing dates every note first (a stat pass), so the feed is in the right order almost at once. Notes then show their day label with a placeholder preview until parsed. Parsing runs newest first, so the rows at the top fill in first, and unchanged notes come straight from the IndexedDB cache. Notes that can't be dated sort last, with no label. While the indexer runs, a status line cycles through verbs ("Indexing notes…", "Gathering notes…", "Reading notes…", … every 0.9 s, each indexing run picking up at the next verb; screen readers hear a steady "Indexing notes"), and until the first notes are listed the feed shows three pulsing skeleton rows in place of the "Start writing" button.

Keyboard: `j`/`k` or arrows move, Enter opens, Escape returns to the workspace, and any other printable key opens the palette with that key typed. Keys with Ctrl/Cmd/Alt, and keys typed in inputs or dialogs, are ignored.

Shown by the editor page in place of the workspace while `atom_homeFeedOpen` is true: on vault open (Settings → "On Vault Open", default Home feed), from the Home button in the pane header / mobile header, or the "Home feed" command. Opening any file closes it (`useOpenFile`).

## Local State & Storage
- State: `atom_fileMetadata`, `atom_indexerState` and `atom_userName` (read); selection is local. Above 100 notes the list is virtualized (`@tanstack/react-virtual`, rows measured, header as scroll margin), so only the rows in view plus overscan are in the page, however far you scroll. Keyboard selection scrolls with `scrollToIndex`.
- Persistence: None. Titles, dates and previews come from the metadata index (`preview` is computed by the metadata worker).

## Dependencies
- Core: [`home-feed/`](home-feed/README.md) (`FeedHeader`, `FeedRow`, `FeedBar`, `feed-model`), `Button`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<HomeFeed onOpenNote={open} onNewNote={newNote} onSearch={openPalette} onClose={closeFeed} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| onOpenNote | `(path: string) => void` |  | Opens a note by vault path |
| onNewNote | `() => void` |  | Starts a blank draft |
| onOpenExplorer? | `() => void` |  | Opens the Explorer (folder button beside `+`); hidden when omitted |
| onSearch | `(initialQuery?: string) => void` |  | Opens the command palette, optionally prefilled |
| onClose | `() => void` |  | Leaves the feed |
| isSearchOpen? | `boolean` | `false` | Palette open: the pill hides and hands its transition name to the palette field |
