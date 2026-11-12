# MobileDrawer

Description: The phone's left navigation drawer, an `OverlayPanel variant="edge-panel"` with a dim backdrop. It shows the vault's Files under a "Files" title. Settings sits in the footer as a filled secondary button.

## Local State & Storage
- State: `atom_mobileDrawerOpen` (`app/atoms/mobile-drawer-atoms.ts`), in memory only: it always starts closed.
- Closing: the back gesture (OverlayPanel's `useBackButtonClose`), Escape, the backdrop, a swipe toward the left edge (`useSwipeToClose`) or the shared `Button` close control (`IoClose`).

## Behavior
- Optimistic: opening a note or going to Settings closes the drawer first, then opens the note or routes.
- Opened by the header's menu button (`MobileFileIndicator`), a right swipe from the left edge (`useEdgeSwipe`), or Show Files (`useShowFiles`).

## Dependencies
- `OverlayPanel`, `Button` (`close`, `secondary`), `FilesPane`.
