# DemoFiles

Description: The files chapter's picture, still (no loop): the editor with its sidebar open, drawn from the sidebar's own classes and glyphs (`sidebar-classes.ts`, `SidebarSection`, `SidebarPinned`, `FileIcon`, `FolderRow`). On the left are the vault's name, a **Pinned** section whose notes lead with the emoji picked for them (`PINS`), and a **Files** tree with a folder holding notes, code, config and an image, each with its kind's glyph (`TREE`). The current note is on the accent fill in both. On the right, that note is drawn as the editor draws it, with marks hidden off the caret's line, using [LandingLoop](LandingLoop.md)'s `Line`. It is one labelled `role="img"`.

## Local State & Storage
- State: none. Persistence: none.

## Dependencies
- Core: [DemoFrame](DemoFrame.md) (its `sidebar` slot), `Line` from [LandingLoop](LandingLoop.md), `react-icons/hi`. Zero-Cloud: no network requests.

## Quick Usage
```tsx
<DemoFiles />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) |  |  | Takes no props |
