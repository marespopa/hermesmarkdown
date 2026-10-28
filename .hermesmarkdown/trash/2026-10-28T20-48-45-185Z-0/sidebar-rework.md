---
title: "Bear-style Sidebar for HermesMarkdown"
tags:
  - sidebar
  - hermes
---
# Bear-style Sidebar for HermesMarkdown

#### 1. Navigation & Mode Switching
Instead of replacing the folder tree, introduce a **Sidebar Mode Toggle** at the top of the sidebar (above the Search field).
- **Files Mode**: The existing `VaultFileTree` view.
- **Tags Mode**: A new `SidebarTags` view that generates a virtual tree based on `#tags`.
- **State**: Implement `activeSidebarTabAtom` ('files' | 'tags') to switch between these two components.

#### 2. System Quick-Filters (The "Smart" Section)
Place these above the main content area in both modes, or as a dedicated top section.
- **All Notes**: Flat list of all `.md` files.
- **Untagged**: Filter for files missing `#tags` in body/frontmatter.
- **Todo**: Filter for files containing `- [ ]`.
- **Today**: Filter for files where `mtime` (modification time) is today.
- **Archive**: Filter for files within a `.archive/` or `Archive/` folder.
- **Implementation**: Use a derived Jotai selector over `atom_vaultTreeSnapshot` to calculate these lists in real-time.

#### 3. Hierarchical Nested Tag Parser
Transform inline hashtags into a navigable tree.
- **Parser**: Extend `workers/parse-note.ts` to extract tags. Support the `#parent/child` syntax by splitting tag strings at `/`.
- **Virtual Tree**: Create a `TagTree` structure where `#work/projects/2026` becomes:
  - `work` (Parent)
    - `projects` (Child)
      - `2026` (Grandchild)
- **Counts**: Aggregate the number of files containing the tag (and all its children) to show as `(count)` next to the tag name.

#### 4. Integration with Existing "Pins"
Since HermesMarkdown already has `usePins` and `SidebarPinned`, integrate them into the Bear model:
- **Pinned Tags**: Allow users to right-click a tag in the Tag View to "Pin" it.
- **Pinned Section**: Pinned tags appear at the very top of the Tag View, separate from the alphabetical tree.
- **Tag Icons**: Create a `.hermes/tags.json` config file to map tag names to Lucide icons (e.g., `#journal` $\rightarrow$ `BookOpen`).

#### 5. Technical Execution Path
1. **Metadata Extraction**: Ensure the vault walk/parse phase extracts tags into a searchable index (`tagIndexAtom`).
2. **Component Development**:
   - Build `SidebarTags.tsx` (virtual tree).
   - Build `SidebarSystemFilters.tsx` (the quick-filter nodes).
3. **Layout Update**: Wrap the current `SidebarFiles` and the new `SidebarTags` in a conditional render based on the active tab.
4. **Mobile Optimization**: Ensure the `OverlayPanel` handles the tab switching and filtering without losing scroll position.

#### Progress
Findings: `editor/tags/tag-index.ts` already builds the nested tag tree with rolled-up counts and the All/Untagged/Todo filters from `atom_fileMetadata` (Privacy Mode applied), and the Tags page lists a tag's or filter's notes. The sidebar reuses them (the snapshot has no tags or mtimes, so the filters read the metadata, not `atom_vaultTreeSnapshot`).

- [x] 1. `atom_activeSidebarTab` ('files' | 'tags') in `atoms/sidebar-tab-atoms.ts`
- [x] 3. Parser: `parse-note.ts` extracts `tags` and `tagPaths` (`#parent/child` ancestry, `tagAncestry`); rolled-up counts in `buildTagIndex`
- [x] 2a. Add the Today and Archive filters to `tag-index.ts` (`NoteFilter`, `noteMatchesFilter`, counts) and the Tags page / mobile labels
- [x] 2b. `SidebarSystemFilters.tsx`: the five filter rows with counts, above the content in both modes
- [x] 5.2 `SidebarTags.tsx`: the nested tag tree with counts
- [x] 4a. Pinned tags at the top of the tag view; right-click a tag to Pin / Unpin
- [x] 4b. `.hermes/tags.json` tag icons (`tag-icons.ts`, `useTagIcons`)
- [x] 5.3 Layout: Files / Tags toggle in `WorkspaceSidebar` (and fix its misplaced import)
- [x] 5.4 Mobile: the drawer shares the sidebar tab atom; its Tags tab lists the same five filters (labels and counts from tag-index.ts)
- [x] Tests and docs (component `.md`s, sidebar `README.md`)
