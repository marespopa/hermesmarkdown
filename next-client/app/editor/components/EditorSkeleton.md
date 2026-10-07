# EditorSkeleton

Description: An outline of what the editor will show, shown full screen by [VaultAccessGate](VaultAccessGate.md) while the saved vault loads — while it's looked up (`atom_isVaultRestoring`), behind the "Vault Access Paused" prompt, and after access is granted until the vault is readable. It replaces the old "Restoring vault…" spinner dialog. Normally it is the home feed, since a vault always opens on it: the vault bar outline (`FeedVaultSkeleton`), the real `FeedHeader` (greeting with `atom_userName`, weekday, date — none of it needs the vault), over five `FeedSkeleton` rows and the outline of the floating search bar, with no sidebar, as on the real feed. On a refresh of a tab that already opened a vault (`atom_vaultOpenBehaviorAppliedFor` set to a vault key — not the `no-vault` marker — and no `?view=home`; read after mount) it is the workspace, mirroring the real layout so the editor appears in place: the sidebar on desktop when `atom_sidebarOpen` (at `atom_sidebarWidth`), the pane header (`PANE_HEADER_CLASS`) with a sidebar button (in the sidebar's header while it's open, in the pane header otherwise), two tab pills and toolbar groups, and the paper panel (`.editor-canvas` / `.editor-sheet`, with its grain) holding a title bar and three paragraphs of placeholder lines. Placeholders pulse only when motion is allowed (`motion-safe:animate-pulse`). The sidebar and header are hidden at the mobile-chrome width (≤768px). It's a `role="status"` region named "Loading vault" with screen-reader text; the shapes are `aria-hidden`.

## Local State & Storage
- State: Reads `atom_vaultOpenBehaviorAppliedFor`, `atom_userName`, `atom_sidebarOpen` and `atom_sidebarWidth`; the home variant reads the date only after mount — the skeleton is server-rendered (`atom_isVaultRestoring` starts `true`), and a server-side date or greeting would mismatch the browser's and fail hydration — showing placeholder bars in the header until then.
- Persistence: None itself (both atoms persist in `localStorage`).

## Dependencies
- Core: `jotai`, `home-feed/FeedHeader`, `home-feed/FeedSkeleton` (`FeedSkeleton`, `FeedVaultSkeleton`), `pane-header-classes.ts`, `editor.scss` (`.editor-canvas`, `.editor-sheet`).
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
