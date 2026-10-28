# MobileDrawer

Description: The phone's left navigation drawer, an `OverlayPanel variant="edge-panel"` with a dim backdrop. A segmented control switches Files / Tags; both panes stay mounted (the inactive one `hidden`) so each keeps its scroll position. Settings sits in the footer as a filled secondary button.

## Local State & Storage
- State: `atom_mobileDrawerOpen`, `atom_mobileDrawerTab` (`app/atoms/mobile-drawer-atoms.ts`), in memory only: it always starts closed.
- Closing: the back gesture (OverlayPanel's `useBackButtonClose`), Escape, the backdrop, a swipe toward the left edge (`useSwipeToClose`) or ×.

## Behavior
- Optimistic: opening a note or picking a tag/filter/Settings closes the drawer first, then opens the note or routes.
- Opened by the header's menu button (`MobileFileIndicator`), a right swipe from the left edge (`useEdgeSwipe`), or Show Files (`useShowFiles`, on the Files tab).

## Dependencies
- `OverlayPanel`, `Button` (`segment`, `close`, `secondary`), `FilesPane`, `TagsPane`.
