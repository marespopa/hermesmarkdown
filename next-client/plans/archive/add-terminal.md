---
title: Terminal option (palette command + ssh:// link)
tags: [plan, feature, terminal]
status: done
---

# Terminal option (palette command + ssh:// link)

## Context
User wants a "terminal option" to reach their local terminal from the app. The app is browser-only (no server shell, no pty), so a browser can't spawn a terminal. Chosen approach: a palette command that opens `ssh://user@host` through the OS protocol handler (Terminal/iTerm/Windows OpenSSH), with user and host configured in Settings. No new dependencies.

## Changes (all under `next-client/app/`)
1. **Atoms** — `atoms/ui-atoms.ts`: add `atom_terminalUser` (default `""`) and `atom_terminalHost` (default `"localhost"`) via `atomWithStorage`, next to `atom_userName` (line ~234).
2. **URI helper** — new `services/terminal-uri.ts` (+ `.test.ts`): `buildSshUri(user, host)` trims, validates host (hostname/IPv4/bracketed IPv6; no whitespace, `/`, `@`), encodes user, returns `ssh://user@host` or `ssh://host`, or `null` when invalid.
3. **Settings section** — new `editor/settings/sections/TerminalSettings.tsx` (+ `.md`, `.test.tsx`) using `SettingGroup`/`SettingItem`/`BareInput` like `ProfileSettings.tsx`: User and Host fields (trim on blur), a note that it opens the system's default SSH handler and needs SSH/remote login enabled on the target. Register in `editor/settings/page.tsx` (alongside `GuideSettings`/`ProfileSettings` in General, to avoid a new nav tab).
4. **Palette command** (split up; `AppCommands.md` and a registered-commands list don't exist, so the README row and a normal test stand in for them)
   - [x] 4a. `AppCommands.tsx`: read `atom_terminalUser` / `atom_terminalHost` with `useAtomValue`, compute `buildSshUri`, register `open-terminal`: label "Open Terminal", description the URI when valid, category `Workspace`, `keywords: "shell ssh console command line terminal"`, `disabledReason: "Set a terminal host in Settings"` when the URI is null, action `window.location.href = uri`. No `opens` (the page stays put), no shortcut. Check the file stays < 400 lines.
   - [x] 4b. `AppCommands.test.tsx`: valid host → label, no `disabledReason`, action sets `window.location.href` (stub `window.location` with `vi.stubGlobal` or `Object.defineProperty`, restore after); user + host → `ssh://dev@build.local`; invalid host (`"my host"`) → `disabledReason` and the action doesn't navigate.
   - [x] 4c. `CommandPalette/README.md`: add Open Terminal to the `AppCommands.tsx` row (ssh:// via the OS handler, disabled without a valid host, set in Settings → General → Terminal).
5. **Docs** (split up)
   - [x] 5a. `documentation/content/settings-mobile.tsx`: new `settingsGroup` item `id: "terminal"`, title "Terminal": the lead (open your system terminal over SSH from the palette), a `KV` (Settings → General → Terminal; User/Host; command: Open Terminal), a paragraph on setup (SSH / Remote Login on the target) and a `Callout` on the browser's "open this app?" prompt and that nothing opens without an `ssh://` handler (most phones, Android/Termux). Keywords: `terminal shell ssh console command line remote login`.
   - [x] 5b. Check `documentation/content/index.ts` and any docs test that lists item ids; add `terminal` if they enumerate them.
   - [x] 5c. Check `documentation/content/keyboard-shortcuts.tsx` doesn't need a row (no shortcut, so likely nothing).
6. **Wrap-up**
   - [x] 6a. Re-read the touched files for the rules (project components, < 400 lines, sibling `.md`s current, no person names in fixtures).
   - [x] 6b. Set this plan's `status` to `done`.

### Done
- [x] 1. Atoms in `ui-atoms.ts`.
- [x] 2. `services/terminal-uri.ts` + test; `services/README.md` row.
- [x] 3. `TerminalSettings.tsx` + `.md` + test, registered in General between Profile and Guide; `page.test.tsx` order check includes Terminal. The settings folder has no README index to update.

## Rules to honor
Use project `Button`/`BareInput`; Jotai atoms; files < 400 lines; sibling `.md` per component; Vitest with Jotai `<Provider>` and mocked router; no build/test run unless asked (CI runs them); no person names in fixtures; no commit attribution trailers (per saved memory). Read `node_modules/next/dist/docs/` only if touching Next APIs (not needed here).

## Verification
- Unit tests above (run only when you ask; otherwise CI).
- Manual: set host in Settings → General → Terminal, run "Open Terminal" from the palette; browser asks to open the system SSH handler.
- Note: on Android/Termux or systems with no `ssh://` handler, nothing opens — documented in the setting note.

