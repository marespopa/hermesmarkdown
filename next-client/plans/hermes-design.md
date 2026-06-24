# HermesMarkdown — Engineering Handoff: iA Writer Direction

## Overview

This document defines the target UI/UX architecture for HermesMarkdown. The goal is a single-minded writing surface with navigation accessible but never in the way — iA Writer simplicity with full vault power underneath.

This handoff supersedes all previous step-by-step reskin plans.

---

## Design Philosophy

One rule drives every decision: **the editor is the product**. Every chrome element exists only to serve the writing surface. If it does not need to be visible right now, it is not visible.

The app opens in writing mode every time. Navigation is a deliberate action, never ambient noise.

---

## Color System

Replace all earth-tone surface tokens with neutrals. Clay and moss become accent-only — they appear exclusively on interactive elements, never as backgrounds.

### Light Mode

| Role | Usage |
|---|---|
| Editor surface | Soft off-white, no color cast — the primary writing surface |
| Chrome surface | Slightly darker off-white — sidebar, overlays, tab bar. Visibly distinct from editor |
| Primary text | Near-black with slight warmth, not pure black |
| Secondary text | Mid-grey |
| Borders / dividers | Light grey, subtle |
| Accent (clay) | Active states, focus rings, links, unsaved indicators, left border indicators |
| Secondary accent (moss) | Icons, muted interactive elements |

### Dark Mode

| Role | Usage |
|---|---|
| Editor surface | Warm dark with slight brown cast — not pure black |
| Chrome surface | Slightly darker than editor, same warmth |
| Primary text | Warm off-white |
| Secondary text | Warm mid-grey |
| Borders / dividers | Dark warm grey |
| Accent (clay) | Same role as light, brightened slightly for contrast |
| Secondary accent (moss) | Same role as light, brightened slightly |

### Accent Usage Rules

Clay and moss **never** appear as backgrounds. They appear as:
- Left border indicators on active items
- Focus outlines
- Link colors
- Active icon colors
- Unsaved dot on tabs
- Hover text color transitions

Everywhere else is neutral.

---

## Typography

- **Editor**: User-selected monospace. Default `JetBrains Mono`. User-configurable. Do not change font logic.
- **UI chrome**: `Inter`, small size, regular weight. Hierarchy through size and color only — no bold labels in chrome.

---

## Desktop Layout

### Default State — Writing Mode

Editor takes the full viewport. Nothing else visible. No sidebar, no tab bar, no status bar.

Editor properties:
- Max content width: 680px, centered
- Generous horizontal padding inside that width
- Line height: 1.8
- Font size: 17–18px
- Cursor line: very subtle warm tint, barely perceptible

This is the state the app opens in every time, including on returning to an existing session.

### Accessing Navigation

Three entry points. None of them disrupt the writing surface permanently.

**1. Command palette — primary navigation method**

Trigger: `Ctrl+Shift+P` on Windows/Linux, `Cmd+Shift+P` on Mac.

Note: `Ctrl+P` is reserved by the browser for print. Do not use it.

Opens a centered modal above the editor. Fuzzy search across all registered commands and files. Clay accent on selected item. Dismisses on `Escape` or action execution.

**2. Mouse to left edge — hover sidebar**

Moving the mouse to the left edge of the viewport slides the sidebar in as an overlay. It does not push or reflow the editor. A semi-transparent backdrop sits behind it.

Moving the mouse back to the editor or pressing `Escape` dismisses it automatically.

**3. Pinned sidebar — explicit toggle**

`Ctrl+Shift+E` pins the sidebar open persistently. When pinned, the editor content area adjusts its left offset to accommodate. Pinned state persists to `localStorage` and restores on next open.

### Tab Bar

Hidden when only one file is open.

Appears as a slim bar above the editor when two or more files are open. It overlays the top of the editor area — it does not push content down. Appears and disappears with a short opacity transition.

Closing files down to one hides the tab bar again.

### Status Bar

Follows the existing Apple-style pill pattern — idle hidden, appears only when there is something to say: saving in progress, AI running, sync status, conflict. Never persistent.

Position: bottom center of the editor, floating above the content.

---

## Sidebar Contents

Applies when sidebar is open via hover or pinned.

### Views Section (top)

Formerly called Smart Workspaces. Renamed to Views — more familiar, maps to what users expect.

- Today's Work always first, clay dot indicator marking it as built-in
- User-created views below
- New View affordance at the bottom of the section
- Active view: clay left border, light tinted background
- Section ends with a divider before the file tree

### File Tree Section (below divider)

- Vault name in small uppercase at the top — the one place uppercase is intentional
- Folders and files, names only, no icons
- Active file: clay left border
- New file / new folder as icon-only buttons in the vault name row, visible on sidebar hover only
- Right-click context menu: Rename, Delete, New File, New Folder — keep existing behavior

### Search and Tags

Accessible via icon rail icons — same overlay behavior as the sidebar. Icon rail is only visible when the sidebar is open, not at rest in writing mode.

---

## Icon Rail

Narrow vertical strip on the absolute left edge of the sidebar. Visible only when the sidebar is open.

Icons: Files, Search, Tags in top section. Settings, Theme toggle in bottom section.

Active icon: clay color. Inactive: moss color. Hover: steps toward primary text color. No backgrounds, no border-radius on any icon button. Tooltip on hover after 400ms delay, positioned to the right of the icon.

---

## Command Palette

Trigger: `Ctrl+Shift+P` / `Cmd+Shift+P`.

Centered modal, 560px wide, max 8 visible results, scrollable. Autofocused input. Fuzzy search across all registered commands.

Keyboard navigation: arrow keys to move, `Enter` to execute, `Escape` to close.

Selected item: clay left border, clay tinted background. No border-radius anywhere in the palette. Neutral surface. Keyboard shortcut hint right-aligned in secondary text color.

### Command Registry

All existing app actions must be registered:

- Open file (fuzzy file search mode)
- New file
- New folder
- Toggle sidebar (pin/unpin)
- Toggle right sidebar
- Toggle theme
- Open settings
- Open vault
- Export current file
- Toggle frontmatter collapse
- Open Builder / AI
- Focus editor
- Close current tab
- Close all tabs
- Zen mode

Implemented as a `CommandPaletteProvider` context. Commands register via a `useRegisterCommand` hook. Keyboard listener at `document` level. Palette renders as a portal into `document.body`.

---

## Mobile Layout

### Writing Surface

Full viewport, no chrome visible while writing. Content full width with horizontal padding only. Line height and font size match desktop. Virtual keyboard detection via `visualViewport` API — when keyboard opens, all chrome hides automatically.

### Bottom Navigation Bar

Always visible when keyboard is closed. Hides when virtual keyboard opens. Reappears when keyboard closes.

Four icons only, left to right:
1. Files
2. Search
3. New File
4. Menu (command palette)

### File Switching

Tap Files → full-screen overlay slides up. File tree same structure as desktop sidebar. Includes Views section above file tree. Tap a file → overlay dismisses → editor focuses that file.

Tap Search → full-screen search overlay. Same dismiss behavior.

### Current File Indicator

Minimal top bar, single line height, current filename only. Visible when keyboard is closed. Tappable — shows list of open files if more than one is open. Hides when keyboard is open.

### Formatting

No persistent toolbar. Select text → minimal floating toolbar appears above the selection with bold, italic, link only. Auto-dismisses on tap outside.

### Command Palette on Mobile

Opens as a full-screen overlay from the Menu icon. Same fuzzy search and command registry as desktop. Keyboard opens automatically on palette open.

---

## Zen Mode

The default writing mode already functions as zen mode. The existing `Ctrl+Shift+Z` toggle remains but its behavior narrows:

- Desktop: force-dismisses any pinned sidebar
- Mobile: hides the current file indicator top bar and bottom navigation

Essentially: even more nothing.

---

## Transitions

| Element | Duration | Easing |
|---|---|---|
| Sidebar slide in/out | 200ms | ease-out |
| Overlay backdrops | 150ms | opacity fade |
| Tab bar appear/disappear | 150ms | opacity fade |
| Status bar pill | existing behavior | keep |

No other animations anywhere. Transitions must respect `prefers-reduced-motion`.

---

## Theme Toggle

Lives in the icon rail bottom section, and on mobile accessible via settings overlay.

- Sun icon when in dark mode, Moon icon in light mode
- On click: toggles `dark` class on `<html>`, saves preference to `localStorage`
- Respects `prefers-color-scheme` on first load via blocking inline script in `<head>` before React hydration — no flash of wrong theme on hard refresh

---

## Global Rules

- No border-radius on any chrome surface. Restore only where accessibility requires (checkboxes, toggle switches).
- No box shadows anywhere. Use borders for separation.
- No gradients.
- Scrollbars: thin, neutral track, clay thumb. Styled in both modes.
- Selection highlight: clay at low opacity.
- Focus rings: clay outline, no default browser blue.
- Both light and dark mode correct throughout every surface.

---

## Breakpoints

Single breakpoint: below 768px is mobile layout, above is desktop. No tablet-specific layout — desktop layout works on tablet. Hover sidebar behavior does not apply on touch devices — use bottom nav instead.

---

## What Does Not Change

- Editor textarea/pre sync logic
- Frontmatter collapse behavior
- All existing keyboard shortcuts except where noted above
- `/` slash command menu — keep as-is, command palette is additive
- Smart Workspace / Views query logic — rename only, no functional change
- Google Drive sync logic
- AI Builder behavior
- Table editor behavior
- BYOK key storage

---

## Implementation Order

| Step | Task | Type |
|---|---|---|
| 1 | Color system update | Restyle |
| 2 | Editor surface — content width, line height, padding | Restyle |
| 3 | Desktop chrome hide/show — sidebar as overlay, tab bar conditional, status bar pill | Behavior |
| 4 | Left edge hover trigger — sidebar slide-in on mouse proximity | Behavior |
| 5 | Pinned sidebar — `Ctrl+Shift+E`, localStorage persistence | Behavior |
| 6 | Mobile bottom bar — four icons, visualViewport keyboard detection | New |
| 7 | Mobile overlays — file tree, search, command palette as full-screen sheets | New |
| 8 | Command palette | New |
| 9 | Icon rail — simplified, only visible when sidebar is open | Restyle + Behavior |

---

## Acceptance Criteria

- [ ] App opens to full-screen editor with no chrome visible
- [ ] Content width is constrained and centered on desktop
- [ ] Mouse to left edge reveals sidebar as overlay without pushing editor
- [ ] Sidebar dismisses on mouse-out or Escape
- [ ] Tab bar only appears when two or more files are open
- [ ] Status bar is pill-only, idle-hidden
- [ ] No earth-tone backgrounds anywhere — all surfaces are neutral
- [ ] Clay and moss appear only on interactive elements
- [ ] Icon rail only visible when sidebar is open
- [ ] Mobile bottom bar hides when virtual keyboard is open
- [ ] Mobile file switching is full-screen overlay
- [ ] Dark mode uses warm dark surfaces, not pure black
- [ ] No border-radius on any chrome surface
- [ ] No box shadows anywhere
- [ ] Transitions respect prefers-reduced-motion
- [ ] No flash of wrong theme on hard refresh
- [ ] Existing editor logic entirely untouched

