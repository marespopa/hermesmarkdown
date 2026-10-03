# home-feed

Building blocks of [`HomeFeed`](../HomeFeed.md).

| File | Role |
|---|---|
| `feed-model.ts` | Pure model: `isFeedPath()` (Markdown only; no dotfolders such as `.hermes/`/`.obsidian/`, no `_`-prefixed meta), `feedTitle()` (frontmatter title, else file name; delegates to `noteDisplayTitle` in `app/utils/note-display.ts`), `dayLabel()` ("Today", "Yesterday", weekday, short date), `buildFeed(metadata, displayItems, now)` (newest first; notes missing from the privacy display items are left out before day labels are assigned; each entry carries `isSensitive` and `previewStyle`) |
| `greetings.ts` | `timeOfDay()` (morning from 5, afternoon from 12, evening from 17, night from 22), `greeting()` ("Good morning/afternoon/evening, Ada!", "Up late, Ada!" at night; no name when unset) |
| `FeedHeader.tsx` | Greeting ("Good morning, Ada!"), weekday with an accent dot; month and day on the right |
| `FeedRow.tsx` | One note: gutter day label, title (with a `SensitiveBadge` lock for sensitive notes), 3-line preview. `previewStyle` `masked` shows `MASKED_PREVIEW` (sr-only "Preview hidden"); `blurred` blurs the real preview until the row is hovered or keyboard-focused (not on selection; sr-only "Preview blurred") |
| `FeedSkeleton.tsx` | Pulsing placeholder rows (FeedRow layout; `rows`, default 3) shown while the vault loads and no notes are listed yet; `EditorSkeleton` shows five |
| `FeedStatus.tsx` | Indexing status line; rotates through `INDEXING_VERBS` every `ROTATE_MS` (stable `aria-label` for screen readers) |
| `FeedBar.tsx` | Floating bottom bar: the search pill (`data-palette-anchor`, same classes as the palette's `PaletteSearchBar`, morphs into it; its `>` opens command mode), `+` new note, and a folder button that opens the Explorer (below 400px it folds into the pill as an icon and the placeholder shortens); lifted above the on-screen keyboard |
