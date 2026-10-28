---
title: "Quick vault switch command"
tags: [command-palette, vault, plan]
status: planned
---

# Quick vault switch command

## Context
Switching vaults today goes through the sidebar header menu, the "No vault" crumb or the Recent Vaults dialog. With several pinned vaults, the command palette (the center of the app) has no quick way to jump between them. Add a "Switch Vault…" palette menu that lists the pinned vaults and opens the chosen one.

## Plan
Follow the `PinCommands.tsx` pattern: a small component that registers one menu command (with `subcommands`) via `useRegisterCommand`.

### New component
`app/editor/components/editor-commands/SwitchVaultCommands.tsx` (plus sibling `SwitchVaultCommands.md`, per the project rules).

- Read `allRecentVaults` and `openRecentVault` from `useRecentVaults()` (`app/editor/hooks/use-recent-vaults.ts`), and `atom_vaultKey` from `app/atoms/vault-atoms.ts`.
- `pinned = allRecentVaults.filter(e => e.pinned)`.
- Register `null` unless `pinned.length >= 2` (the "multiple vaults pinned" condition). Otherwise register:
  - `id: "switch-vault"`, `label: "Switch Vault…"`, `category: "Vault"`, `keywords: ["vault", "workspace", "change", "open"]`, no-op `action`.
  - `subcommands`: one per pinned vault, `id: \`switch-vault:${entry.key}\``, `label: entry.name`, `action: () => openRecentVault(entry)`. The open vault gets `disabledReason: "Current vault"`.
- `openRecentVault` already handles permission prompts (it runs from the Enter/click gesture), browser vs local vaults and failure toasts, so there is no new switching logic.

### Mount
In `EditorShell.tsx`, next to `<PinCommands />` (inside `{!isVaultLocked && ...}`), so the command works on every `/editor` route, including with no editor mounted.

### Tests
`SwitchVaultCommands.test.tsx`, modelled on `PinCommands.test.tsx` (hoisted `useRegisterCommand` mock, jotai `Provider`, mocked `useRecentVaults`):
- not registered with 0 or 1 pinned vault;
- registered with 2+ pinned, subcommands are only the pinned vaults, in pinned order;
- the current vault's subcommand is disabled with "Current vault";
- running a subcommand calls `openRecentVault(entry)`.

### Docs
- `editor-commands/README.md`: add the `SwitchVaultCommands` entry (mounted by `EditorShell`).
- `EditorShell.md`: mention the mount.
- `documentation/content/get-started.tsx` (~line 214): mention "Switch Vault…" next to the other palette commands.

## Verification
Build and tests are not run automatically. On request: `corepack yarn tsc --noEmit` and `corepack yarn vitest run app/editor/components/editor-commands/SwitchVaultCommands.test.tsx`. Manual check: pin two vaults, open the palette, type "switch vault".
