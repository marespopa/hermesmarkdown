# HermesMarkdown — Engineering Handoff: iA Writer Direction

## Overview

This document defines the target UI/UX architecture for HermesMarkdown. The goal is a single-minded writing surface with navigation accessible but never in the way — iA Writer simplicity with full vault power underneath.

This handoff supersedes all previous step-by-step reskin plans.

---

## Design Philosophy

One rule drives every decision: **the editor is the product**. Every chrome element exists only to serve the writing surface. If it does not need to be visible right now, it is not visible.

The app opens in writing mode every time. Navigation is a deliberate action, never ambient noise.

---

## Structural Architecture

Building on the UX behaviors above, this section defines the actual structural breakdown — layout hierarchy, states, and how the pieces relate.

### Layout Hierarchy (outside-in)

1. **Viewport** — full browser/window height and width, no app frame visible
2. **Content column** — fixed max-width, horizontally centered, this is the only thing that's always present
3. **Overlays** — sidebar, command palette, quick switcher, WikiLink preview — all absolutely positioned over the content column, never pushing it or resizing it. The column's width never changes when an overlay opens; overlays float above it or slide in from an edge and get dismissed without a layout reflow.

This is the core structural rule: **the writing column is layout-stable.** Nothing that opens or closes should reflow the text you're looking at. That's what makes "no chrome at rest" feel true rather than just visually true — chrome that pushes content around still feels present even when it's invisible 90% of the time.

### States the Editor Needs to Support

| State | Trigger | Behavior |
|---|---|---|
| Rest | default | column only, everything else hidden |
| Sidebar open | keystroke / edge hover | slides in from left, overlays column, doesn't resize it |
| Command palette | keystroke | centered modal overlay, dims background slightly |
| Quick switcher | keystroke | same treatment as command palette, different content |
| Focus mode | toggle | dims all text except current sentence/paragraph within the same column |
| WikiLink hover | mouse/keyboard hover on a link | small popover near the link, dismisses on move-away |
| Full-screen | toggle | hides OS chrome too; column position/width unchanged from rest state |

### Component Boundaries

Useful for scoping actual build tickets.

- `EditorColumn` — owns text rendering, inline formatting, typewriter-mode scroll behavior. Has zero knowledge of sidebar/palette state.
- `OverlayLayer` — single layer above the column that mounts/unmounts sidebar, palette, switcher, hover previews. One system, not four separate ones, so they share dismissal logic (click-outside, Escape) consistently.
- `CommandRegistry` — the single source of truth for every action (format, navigate, AI command, toggle focus mode). Palette, keyboard shortcuts, and any future menu all read from this one registry rather than each implementing their own action list — this is what keeps "command palette is the only menu" actually true as the app grows.

### Mobile Structure

- Sidebar/palette overlays become bottom sheets or full-screen takeovers rather than side panels — same "doesn't reflow the column" rule applies, just a different overlay shape.
- Typewriter mode and focus mode both still apply; touch keyboards eat more vertical space, so fixed-line-position matters more on mobile, not less.

### Structural Decision: Build `OverlayLayer` Generically, Now

Given how much of the "feels minimal" experience depends on all overlays behaving identically (same dismiss behavior, same animation timing, same z-index rules), build the generic overlay layer first, even though it's more upfront work. Retrofitting four inconsistent overlay implementations into one system later is a bigger rewrite than building it right once.

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

Both writing surfaces are editable — this app has no true read-only preview, so the font split below is about *representation*, not read/write capability. **Source** is where you see raw markdown syntax (`#`, `*`, `[[wikilink]]`); **Rendered** is where you see the formatted document. They're different jobs — Source is scanned line-by-line while typing, Rendered is read like a finished page — so they get different fonts, sizes, and measure.

- **Source**: User-selected monospace. Default `JetBrains Mono` in this doc's original language / `IBM Plex Mono` in the actual `FONTS` list (`app/editor/settings/font-options.ts`). User-configurable. Do not change font logic. Monospace keeps markdown syntax characters honestly aligned, which matters since raw syntax stays visible here.
- **Rendered**: Its own atoms (`atom_renderedFontFamily`, `atom_renderedFontSize` in `app/atoms/ui-atoms.ts`), separate from Source's. Defaults to `Literata` (serif) at `18px` — one size step up from Source's `17px` default, reinforcing "finished document" over "draft." User-configurable via a second font picker in Settings > Editor > Rendered View Typography, mirroring the Source picker, reusing the same `FONTS` list. Line height and letter spacing stay shared with Source (not split) — only family and size diverge.
- **UI chrome**: `Inter`, small size, regular weight. Hierarchy through size and color only — no bold labels in chrome.

Resolved: the Source→Rendered font switch is subtle, not deliberately jarring (no separate transition/animation on view switch), and the Rendered font is user-configurable, not a fixed default.

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

**2. Icon rail — always visible**

A persistent, minimal icon rail sits at the left edge on desktop at all times (see Icon Rail, below). Clicking one of its panel icons (Files/Search/Tags/Views/Tasks) opens the detail panel beside it, defaulting to whichever panel was last open; clicking the active icon again collapses it back to just the rail.

**3. Keyboard toggle**

`Ctrl+Shift+E` (also in the command palette as "Expand/Collapse sidebar") opens or closes the detail panel the same way clicking a rail icon does. `Escape` closes it. This still reflows the editor's content width, matching the current desktop implementation — converting it to a true non-reflowing overlay is tracked separately. No separate persisted "pin" state — the rail itself is the permanent, always-reachable affordance, so the detail panel's open/closed state is simply the current session's, not saved across reloads.

### Tab Bar

Hidden when only one file is open.

Appears as a slim bar above the editor when two or more files are open. It overlays the top of the editor area — it does not push content down. Appears and disappears with a short opacity transition.

Closing files down to one hides the tab bar again.

### Status Bar

Follows the existing Apple-style pill pattern — idle hidden, appears only when there is something to say: saving in progress, AI running, sync status, conflict. Never persistent.

Position: bottom center of the editor, floating above the content.

---

## Sidebar Contents

Applies when the detail panel beside the icon rail is open.

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

Accessible via command palette commands (Search, Open Tags, Open Views, Open Tasks — see Command Registry), or by clicking the corresponding icon on the rail (see Icon Rail, below).

### Footer

None — the sidebar itself has no footer. The utility actions that used to live in one (Settings, Theme, Refresh Vault, Close/Open Vault) live in the icon rail's bottom group instead (see Icon Rail, below). Home and Documentation are command-palette-only, not rail or footer icons.

---

## Icon Rail

A persistent, minimal icon-only rail (~56px wide) sits at the left edge on desktop, always visible — not conditional on the sidebar being open. No border-radius, no box-shadow, matching the rest of the chrome; active items get a left-border accent plus a light tint, the same convention used elsewhere (Views, file tree).

- **Top group**: Files, Search, Tags, Views, Tasks. Clicking one opens the detail panel beside the rail showing that section; clicking the currently-active one again collapses it.
- **Bottom group**: Settings, Toggle Theme, Refresh Vault (vault-scoped, hidden with no vault open), Close/Open Vault (single icon, state-dependent).

The command palette remains available as a second entry point for the same actions (opening Files/Search/Tags/Views/Tasks, Home, Documentation, Voice, Settings, Toggle Theme are all still registered commands), but is no longer the *only* one for panel switching and the rail's own actions.

The one addition kept outside both the rail and the palette is **Chat** (`FabBar`): a single draggable floating button, present on both desktop and mobile, position persisted to `localStorage`. It's the one action kept outside the palette because it's a live-status toggle you want glanceable while writing (it pulses while the AI is busy) rather than a one-off navigation action — the same reasoning doesn't apply to Voice, which is a command like everything else despite also being a toggle, since its state is better surfaced elsewhere (recording indicator) than by needing a permanent floating button. Chat only renders when an AI provider is configured. Everything that used to live in the mobile control rail's "More" sheet (Open Files, Save, Copy Markdown, Document Info, Vault Health, Close Vault, Settings, Theme, Home, Documentation) is command-palette-only on mobile, since there's no icon rail there. On mobile, `MobileFileIndicator` (the persistent top bar showing the current filename) doubles as the tap target for the command palette when no files are open yet, since there's no keyboard shortcut on touch devices.

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
- Open Files / Search / Tags / Views / Tasks (panel switches — mobile-aware: branches to the mobile file/tasks overlays instead of a sidebar panel)
- Toggle sidebar (pin/unpin)
- Toggle right sidebar
- Toggle theme
- Toggle voice input
- Open settings
- Open vault
- Home
- Documentation
- Copy Markdown
- Close vault
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

### Navigation

No bottom navigation bar. Same command-palette-first model as desktop — Files, Search, Tasks, and everything else open via command palette commands (mobile-aware ones open a full-screen overlay instead of a sidebar panel where the two differ, e.g. Files/Tasks). The only persistent floating control is the draggable Chat button (`FabBar`), shown only when an AI provider is configured — see Icon Rail.

### File Switching

The "Open Files" command → full-screen overlay slides up (`MobileFileOverlay`). File tree same structure as desktop sidebar, includes a Views tab. Tap a file → overlay dismisses → editor focuses that file. The "Open Tasks" command opens the equivalent full-screen tasks overlay.

### Current File Indicator

Minimal top bar (`MobileFileIndicator`), single line height. Shows the current filename once a file is open — tappable, shows a list of open files if more than one is open, with a "Search all files…" row to reach the command palette. Before any file is open, this bar instead shows a plain "Search files…" tap target, so the command palette always has a reachable entry point on touch devices (no keyboard shortcut). Idle-fades while the editor is focused; reappears on a top-edge tap. Hides when the virtual keyboard is open.

### Formatting

No persistent toolbar. Select text → minimal floating toolbar appears above the selection with bold, italic, link only. Auto-dismisses on tap outside.

### Command Palette on Mobile

Opens as a full-screen overlay, triggered by tapping the current-file indicator (or its "Search all files…" row). Same fuzzy search and command registry as desktop. Keyboard opens automatically on palette open.

---

## Zen Mode

The default writing mode already functions as zen mode. The existing `Ctrl+Shift+Z` toggle remains but its behavior narrows:

- Desktop: force-dismisses any pinned sidebar
- Mobile: hides the current file indicator top bar and the floating Chat button

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
| 4 | Icon rail — persistent, always visible on desktop | New |
| 5 | Sidebar toggle — `Ctrl+Shift+E`, rail click, Escape (no persistence) | Behavior |
| 6 | Mobile bottom bar — four icons, visualViewport keyboard detection | New |
| 7 | Mobile overlays — file tree, search, command palette as full-screen sheets | New |
| 8 | Command palette | New |

---

## Acceptance Criteria

- [ ] App opens to full-screen editor with no chrome visible
- [ ] Content width is constrained and centered on desktop
- [ ] Icon rail is always visible on desktop; clicking a rail icon opens the detail panel without pushing the whole viewport (still reflows the content column today, tracked separately)
- [ ] Detail panel dismisses on Escape or clicking its active rail icon again
- [ ] Tab bar only appears when two or more files are open
- [ ] Status bar is pill-only, idle-hidden
- [ ] No earth-tone backgrounds anywhere — all surfaces are neutral
- [ ] Clay and moss appear only on interactive elements
- [ ] Icon rail is always visible on desktop (not conditional on the sidebar being open)
- [ ] Mobile bottom bar hides when virtual keyboard is open
- [ ] Mobile file switching is full-screen overlay
- [ ] Dark mode uses warm dark surfaces, not pure black
- [ ] No border-radius on any chrome surface
- [ ] No box shadows anywhere
- [ ] Transitions respect prefers-reduced-motion
- [ ] No flash of wrong theme on hard refresh
- [ ] Existing editor logic entirely untouched

