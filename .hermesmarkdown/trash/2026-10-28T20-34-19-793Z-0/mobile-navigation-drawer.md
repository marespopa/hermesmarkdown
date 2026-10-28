---
title: "Mobile navigation drawer (Files / Tags) + outline sheet"
tags: [mobile, navigation, drawer, plan]
status: implemented (touch action sheet and tag pinning deferred)
---

# Mobile navigation drawer (Files / Tags) + outline sheet

## Context
On mobile Chrome (`< 768px`), there is currently no sidebar: "Show Files" routes to the full-screen `/editor/files` page, the outline is hidden on narrow screens, and there is no tag browser within reach. This plan builds a touch-first mobile drawer containing **Files** and **Tags** views, system filters, a long-press context sheet, and a right-hand **Outline/Metrics** panel.

Existing infrastructure (`workers/parse-note.ts`, `atom_fileMetadata`, `VaultFileTree`, `OverlayPanel`) is reused to assemble the feature without adding redundant indexing or background workers.

## Plan
### 0. Location & Lifecycle
* **Plan path:** `plans/mobile-navigation-drawer.md` (moved to `plans/archive/` once shipped).

---

### 1. State & Storage Architecture
* **Jotai Atoms (`app/atoms/ui-atoms.ts`):**
  * `atom_mobileDrawerOpen`: `boolean` (memory only).
  * `atom_mobileDrawerTab`: `'files' | 'tags'`.
  * `atom_mobileDrawerOutlineOpen`: `boolean`.
  * `atom_activeEditorState`: Holds `{ view: EditorView | null, text: string }` updated from `MarkdownEditor`.
* **Metadata & Tag Indexing:** Derived Jotai selector over `atom_fileMetadata` (extracts tags and task states parsed by `workers/parse-note.ts`). Reuses existing `atom_selectedFileTags`.

---

### 2. Drawer Shell & Navigation Integration
* **Component:** `app/editor/components/MobileDrawer/MobileDrawer.tsx` (+ `.md`, tests).
* **Overlay Spec:** Built on `OverlayPanel variant="edge-panel"` (left edge) with dim backdrop, focus trap, and Esc key handling.
* **History Integration:** Hooks into `use-back-button-close` using `history.pushState` on open, ensuring native mobile back gestures close the active drawer/sheet first.
* **Mounting:** Mounted in `EditorShell.tsx` when `isMobileChrome && !isVaultLocked && !onSettings`.
* **Header & Tabs:** Segmented control (`Files` / `Tags`) + Settings gear shortcut + Close button. Keeps both tab panes mounted in the DOM (`hidden` attribute) to preserve individual scroll positions.

---

### 3. Touch Triggers & Gesture Handling
* **Header Button:** Hamburger icon button (`Button`) on the left of `MobileFileIndicator.tsx` (44px target).
* **Edge Swipe (`use-edge-swipe.ts`):** 
  * Listens on touch pointer events within a ~20px left-edge zone.
  * Opens on right swipe `≥ 60px`; closes on left swipe over the open panel.
  * Suppressed automatically when software keyboard is open or text selection drag is active.
* **Navigation Override:** Updates `use-show-files.ts` to set `atom_mobileDrawerOpen = true` and `atom_mobileDrawerTab = 'files'` on mobile instead of routing to `/editor/files`.

---

### 4. Files Tab & Touch Action Sheet
* **Files View:** Embeds `VaultFileTree` (virtualized tree, touch drag, inline rename/create) + footer `+ New File` / `+ New Folder` via `file-create-actions`. Tapping a file loads the note and optimistic-closes the drawer.
* **Touch Action Sheet (`vault-tree/TreeActionSheet.tsx`):**
  * Bottom-anchored `OverlayPanel variant="sheet"` presenting: Rename, Delete, Duplicate, New File, New Subfolder (reusing `tree-menu-items.tsx`).
* **Gesture Coordination (`use-touch-tree-drag.ts`):**
  * 400ms long-press triggers `TreeActionSheet` with haptic feedback (`navigator.vibrate?.(10)`).
  * If pointer movement exceeds `8px` before 400ms, long-press timer is cancelled immediately to allow tree drag-to-move.
  * Once action sheet fires, flags touch session as `handled` to suppress touchend file-open triggers.

---

### 5. Tags Tab & System Filters
* **Pane Component:** `TagsPane.tsx` utilizing `use-tag-index.ts` (extracted counting logic from `editor/tags/page.tsx`, respecting privacy-filtered `atom_noteDisplayItems`).
* **Sections:**
  * **System Filters:** All Notes, Untagged (`tags.length === 0`), Todo (`meta.tasks` open count).
  * **Nested Tag Tree:** Standard `/` delimiter hierarchy with collapsible parent nodes and rolled-up counts.
* **Selection Action:** Tapping a tag or system filter closes the drawer first, then smoothly routes to `/editor/tags?tag=...` or `/editor/tags?filter=untagged|todo|all`.
* **Tag Actions:** Long-press on tag node opens sheet with pin option (using `TagHeading` pin state).

---

### 6. Outline & Metrics Drawer (Right Edge)
* **Component:** `MobileOutlineDrawer.tsx` (`OverlayPanel variant="edge-panel"` from right edge).
* **Triggers:** Outline button in `MobileFileIndicator` + right-edge touch swipe.
* **Data Sources:** Reads `atom_activeEditorState` for live document text and view reference.
* **Content:**
  * **Heading Outline:** Headings generated via `use-outline-headings.ts` with jump navigation via `flash-line.ts`.
  * **Metrics Panel:** Word count (`count-words.ts`), character count, line count, reading time (words / 200).

---

### 7. Footer Quick-Links & Polish
* **Drawer Footer:** Persistent footer row across both drawer tabs featuring a filled secondary `Button` "Settings" (gear icon) closing the drawer and routing to `/editor/settings` (referencing `SidebarFooter`).
* **Visual Rules:** Solid `bg-overlay`/`bg-chrome` containers (no glass blur), standard backdrop dimming, accent colors strictly reserved for active focus states.
* **Accessibility & Motion:** `role="dialog"`, `aria-label`s, `inert` when closed, full support for `prefers-reduced-motion`, layout transitions driven by `duration-layout ease-layout` design tokens.

---

## Critical Files Touched

* `EditorShell.tsx`
* `MobileFileIndicator.tsx`
* `app/atoms/ui-atoms.ts`
* `app/hooks/use-show-files.ts`
* `vault-tree/use-touch-tree-drag.ts`
* `vault-tree/tree-menu-items.tsx`
* `editor/tags/page.tsx`
* `markdown-editor/EditorOutline.tsx`
* `OverlayLayer/OverlayPanel.tsx`

---

## Verification & Testing Strategy

* **Vitest Unit Tests:**
  * Test `use-tag-index` tag tree generation, `/` delimiter nesting, and roll-up counts.
  * Test system filter logic (Untagged & Todo matching).
  * Test gesture threshold logic in `use-touch-tree-drag` (cancelling long-press on `8px` movement).
  * Test drawer history state handling (`pushState` / popstate drawer close).
* **Manual Mobile Verification:** Validate edge-swipe feel, drawer transitions, and touch action sheet on iOS Safari and Android Chrome.
