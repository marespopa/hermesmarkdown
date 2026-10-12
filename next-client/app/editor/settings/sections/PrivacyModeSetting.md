# PrivacyModeSetting

Description: The **Privacy** group at the end of Settings → Files (there is no separate Privacy section). **Privacy Mode** chooses how private notes — frontmatter `private: true` or a `private` tag, nothing else — appear in the home feed, the command palette's quick open (search, `#tag`, recent and pinned rows, `!` tasks) and the Tasks page: **Mask in lists** (title with a lock; preview, file name, tags and task text masked) or **Hide from lists** (left out). Independent of the level, a private note opens behind a veil in the editor, never matches note-text search (`/`) and is never sent to AI; Files and tab titles still show its file name. The same levels are palette commands (`privacy-commands.ts`).

## Local State & Storage
- State: `atom_privacyLevel` (`app/atoms/privacy-atoms.ts`). The stored values stay `show_title` (Mask in lists) and `hidden` (Hide from lists).
- Persistence: `atomWithStorage` under `localStorage["hermes_privacy_mode"]`, read on init so a reload never flashes the default level. Unknown stored values fall back to Mask in lists (`normalizePrivacyLevel`).

## Dependencies
- Core: `SettingControls` (`SettingGroup`, `SettingItem`, `SegmentedControl`).
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
// Rendered by FilesSettings as its last group.
<PrivacyModeSetting />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) | | | Reads and writes `atom_privacyLevel` directly |
