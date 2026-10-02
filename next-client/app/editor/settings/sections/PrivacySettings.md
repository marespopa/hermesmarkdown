# PrivacySettings

Description: The Settings → Privacy section. **Privacy Mode** chooses how notes marked sensitive in frontmatter (`sensitive: true`, `private: true`, or a `sensitive` / `private` tag) appear in listings: **Show titles** (title + lock, masked preview), **Blur previews** (title + lock, preview blurred until hover / focus) or **Hide notes** (left out of the home feed, the command palette and the Tasks page). The same levels are available as palette commands (`privacy-commands.ts`).

## Local State & Storage
- State: `atom_privacyLevel` (`app/atoms/privacy-atoms.ts`).
- Persistence: `atomWithStorage` under `localStorage["hermes_privacy_mode"]`, read on init so a reload never flashes the default level. Unknown stored values fall back to Show titles (`normalizePrivacyLevel`).

## Dependencies
- Core: `SettingControls` (`SettingGroup`, `SettingItem`, `SegmentedControl`).
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<PrivacySettings />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) | | | Reads and writes `atom_privacyLevel` directly |
