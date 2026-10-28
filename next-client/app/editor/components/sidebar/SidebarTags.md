# SidebarTags

Description: The sidebar's Tags view. The vault's tags nested on `/` (`#work/projects/2026` sits under `work` › `projects`), each with a disclosure for its sub-tags, its icon (`.hermes/tags.json`, `useTagIcons`; `#` without one) and the count of notes under it, sub-tags included (`useTagIndex`). A click opens the tag's notes on the Tags page (`useTagNavigation`); a right-click opens a menu with Pin / Unpin. Pinned tags are listed first under "Pinned tags", apart from the alphabetical tree (the same pins the sidebar's Pinned section lists, `usePins`). Reads the URL, so it sits in a Suspense boundary.

## Props
None.
