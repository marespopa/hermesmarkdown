# BoardViewLoader

Description: Lazy boundary for `BoardView`. `next/dynamic` with `ssr: false`; while the chunk loads it shows `h-full bg-surface-raised motion-safe:animate-pulse` (not `EditorSkeleton`, which outlines the whole editor). `PaneLeaf` imports only this file, so Excalidraw stays out of the editor's first load.

## Props
Same as `BoardView` (`BoardViewProps`): `path`, `content`, `isActivePane?`, `onEditAsMarkdown`.

## Storage & Network
None.
