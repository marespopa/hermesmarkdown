---
title: TerminalSettings
created: 2026-10-27
---

# TerminalSettings

Description: The **Terminal** group of Settings → General (between `ProfileSettings` and `GuideSettings`). Sets the user and host that the **Open Terminal** palette command opens as `ssh://user@host` through the operating system's SSH handler. Both fields are trimmed on blur. The Host row's description shows the URI the command will open, or asks for a host when `buildSshUri` refuses it (the field is then `aria-invalid`). A `SettingNote` says the browser asks before handing the link over, that the target needs SSH (Remote Login on macOS) turned on, and that nothing opens where no app handles `ssh://` links.

## Local State & Storage
- State: `atom_terminalUser` (default `""`), `atom_terminalHost` (default `"localhost"`).
- Persistence: `atomWithStorage` (`localStorage`).

## Dependencies
- Core: `SettingControls`, `BareInput`, `services/terminal-uri.ts` (`buildSshUri`).
- Zero-Cloud: No network or telemetry side effects; nothing is opened from here.

## Quick Usage
```tsx
<TerminalSettings />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) | | | Reads and writes its atoms directly |
