# home-feed

Building blocks of [`HomeFeed`](../HomeFeed.md).

| File | Role |
|---|---|
| `feed-model.ts` | Pure model: `isFeedPath()` (Markdown only; no dotfolders such as `.hermes/`/`.obsidian/`, no `_`-prefixed meta), `feedTitle()` (frontmatter title, else file name), `dayLabel()` ("Today", "Yesterday", weekday, short date), `buildFeed()` (newest first, day label on the first note of each day) |
| `FeedHeader.tsx` | "Welcome, <name>!" (when a name is set), weekday with an accent dot; month and day on the right |
| `FeedRow.tsx` | One note: gutter day label, title, 3-line preview |
| `FeedSkeleton.tsx` | Three pulsing placeholder rows (FeedRow layout) shown while the vault loads and no notes are listed yet |
| `FeedStatus.tsx` | Indexing status line; rotates through `INDEXING_VERBS` every `ROTATE_MS` (stable `aria-label` for screen readers) |
| `FeedBar.tsx` | Floating bottom bar: the search pill (`data-palette-anchor`, same classes as the palette's `PaletteSearchBar`, morphs into it; its `>` opens command mode), `+` new note, and a folder button that opens the Explorer (below 400px it folds into the pill as an icon and the placeholder shortens); lifted above the on-screen keyboard |
