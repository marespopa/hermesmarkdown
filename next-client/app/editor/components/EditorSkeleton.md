# EditorSkeleton

Description: An outline of what the editor will show, shown full screen by [VaultAccessGate](VaultAccessGate.md) while the saved vault loads — while it's looked up (`atom_isVaultRestoring`), behind the "Vault Access Paused" prompt, and after access is granted until the vault is readable. It replaces the old "Restoring vault…" spinner dialog. On an /editor sub-page (`usePathname`: Templates, Tasks, Files, Settings) it outlines that page instead, on the sub-pages' paper backdrop ([RouteSkeletons](RouteSkeletons.md)). Normally it is the home feed, since a vault always opens on it: the vault bar outline (`FeedVaultSkeleton`), the real `FeedHeader` (greeting with `atom_userName`, weekday, date — none of it needs the vault), over five `FeedSkeleton` rows and the floating search bar (FeedBar's `SEARCH_PILL_CLASS` pill on glass and the sage new-note button), with no sidebar, as on the real feed. Until the date is read, the greeting and day are placeholder bars set in FeedHeader's own type (`SkeletonLine`), so the real header lands without a shift. On a refresh of a tab that already opened a vault (`atom_vaultOpenBehaviorAppliedFor` set to a vault key — not the `no-vault` marker — no `?view=home`, and the feed not already open (`atom_homeFeedOpen`, which the page reads from the URL before its first paint); re-checked when either atom changes) it is the workspace, mirroring the real layout so the editor appears in place: the sidebar on desktop when `atom_sidebarOpen` (at `atom_sidebarWidth`), floating over the panes as WorkspaceSidebar does (frosted `.glass-bar`, a plain hide button, its edge and shadow starting below its header, nav rows and two sections), so the sheet keeps the full width and only the pane header starts beside it; the pane header (`PANE_HEADER_CLASS`) with a sidebar button (in the sidebar's header while it's open, in the pane header otherwise), two tab pills and toolbar sections (`PANE_SECTION_CLASS`); and the paper panel (`.editor-canvas` / `.editor-sheet`, with its grain, full height, MarkdownEditor's page padding and `.editor-measure` text column, kept clear of the open sidebar the same way: `--sheet-pad-left` and `--pane-sidebar-inset`) holding a title bar and three paragraphs of placeholder lines. Placeholders pulse only when motion is allowed (`motion-safe:animate-pulse`). The sidebar and header are hidden at the mobile-chrome width (≤768px). `HomeFeedSkeleton` (the feed outline) is exported: the editor page shows it in its main area during its own mount delay and while the vault is locked when the feed is open, in place of the editor-shaped placeholder and the "Loading…" overlay. It's a `role="status"` region named "Loading vault" with screen-reader text; the shapes are `aria-hidden`.

## Local State & Storage
- State: Reads `atom_vaultOpenBehaviorAppliedFor`, `atom_userName`, `atom_sidebarOpen` and `atom_sidebarWidth`; the home variant reads the date only after mount — the skeleton is server-rendered (`atom_isVaultRestoring` starts `true`), and a server-side date or greeting would mismatch the browser's and fail hydration — showing placeholder bars in the header until then.
- Persistence: None itself (both atoms persist in `localStorage`).

## Dependencies
- Core: `jotai`, `home-feed/FeedHeader`, `home-feed/FeedSkeleton` (`FeedSkeleton`, `FeedVaultSkeleton`, `SkeletonLine`), `SEARCH_PILL_CLASS` from `palette-model.tsx`, `pane-header-classes.ts`, `editor.scss` (`.editor-canvas`, `.editor-sheet`).
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import EditorSkeleton from "./EditorSkeleton";

if (isVaultRestoring) return <EditorSkeleton />;
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) |  |  | Takes no props |
