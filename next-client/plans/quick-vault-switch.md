---
title: "Quick vault switch command"
tags: [command-palette, vault, plan]
status: planned
---

# Quick vault switch command

## Context
Switching vaults today goes through the sidebar header menu, the "No vault" crumb, or the Recent Vaults dialog. With several pinned or recently opened vaults, the command palette (the center of the app) has no quick way to jump between them. Add a "Switch Vault…" palette menu that lists the top vaults (pinned and recently accessed) and opens the chosen one.

---

## Plan
Follow the `PinCommands.tsx` pattern: a small component that registers one menu command (with `subcommands`) via `useRegisterCommand`.

### New component
`app/editor/components/editor-commands/SwitchVaultCommands.tsx` (plus sibling `SwitchVaultCommands.md`, per project rules).

- Read `allRecentVaults` and `openRecentVault` from `useRecentVaults()` (`app/editor/hooks/use-recent-vaults.ts`), `atom_vaultKey` from `app/atoms/vault-atoms.ts`, and `atom_recentVaultsDialogOpen` from `app/atoms/ui-atoms.ts`.
- **Trigger condition:** Register `null` unless `allRecentVaults.length >= 2`.
- **Sorting & Selection Logic:**
  - Sort `allRecentVaults`: **Pinned first**, then by **`lastOpened` timestamp descending**.
  - Cap directly listed subcommands to the **top 6 entries** (`sorted.slice(0, 6)`) to keep the palette concise and prevent vertical clutter.
- **Commands & Subcommands Registration:**
  - `id: "switch-vault"`, `label: "Switch Vault…"`, `category: "Vault"`, `keywords: ["switch", "vault", "workspace", "change", "open", "recent"]`, no-op `action`.
  - `subcommands`: 
    - One per display vault (up to 6):
      - `id: \`switch-vault:${entry.key}\``
      - `label`: `entry.name` (appends type/context if duplicate names exist, e.g. `entry.name (Local)`)
      - `action: () => openRecentVault(entry)`
      - `disabledReason`: `entry.key === currentVaultKey ? "Current vault" : undefined`
    - **Fallback subcommand (if `allRecentVaults.length > 6`):**
      - `id: "switch-vault:view-all"`
      - `label: "View All Recent Vaults…"`
      - `action: () => setRecentVaultsDialogOpen(true)` (opens full searchable modal dialog)
- `openRecentVault` already handles permission prompts (it runs from the Enter/click gesture), browser vs. local vaults, and failure toasts, so no new switching logic is required.

---

### Mount
In `EditorShell.tsx`, next to `<PinCommands />` (inside `{!isVaultLocked && ...}`), so the command works on every `/editor` route, including when no document editor is mounted.

---

### Tests
`SwitchVaultCommands.test.tsx`, modeled on `PinCommands.test.tsx` (hoisted `useRegisterCommand` mock, Jotai `Provider`, mocked `useRecentVaults`):
- Not registered when there are 0 or 1 recent vaults;
- Registered when 2+ vaults exist;
- Correctly sorts pinned vaults first, followed by recency;
- Caps listed subcommands at 6 vaults;
- Includes "View All Recent Vaults…" subcommand when `allRecentVaults.length > 6` and triggers the dialog atom when executed;
- Disables the active vault's subcommand with `"Current vault"`;
- Executing a vault subcommand calls `openRecentVault(entry)`.

---

### Docs
- `editor-commands/README.md`: add the `SwitchVaultCommands` entry (mounted by `EditorShell`).
- `EditorShell.md`: mention the mount.
- `documentation/content/get-started.tsx` (~line 214): mention "Switch Vault…" next to the other palette commands.

---

## Verification
Build and tests are not run automatically. On request: `corepack yarn tsc --noEmit` and `corepack yarn vitest run app/editor/components/editor-commands/SwitchVaultCommands.test.tsx`. Manual check: open/pin multiple vaults, open the palette, type "switch" or "vault", and verify top 6 vault list and "View All..." fallback.