# TagsPane

Description: The drawer's Tags tab. System filters (All Notes, Untagged, Todo, Today, Archive) on top, then tags nested on `/` with a collapsible chevron per parent and rolled-up counts (`useTagIndex`). Rows are 44px touch targets. Picking one calls `onNavigate` with `/editor/tags?tag=…` or `?filter=…`.

## Dependencies
- `useTagIndex` (`app/editor/tags/tag-index.ts`), `editorTagHref`, `editorNoteFilterHref`.
