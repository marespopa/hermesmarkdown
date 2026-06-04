# Atoms

Jotai state model. Each file owns a domain; `atoms.ts` is the barrel.

## Domains

| File | Domain | Persistence |
|------|--------|-------------|
| `file-atoms.ts` | Open files, live FS handles, content, save status, conflict state | `atom_openFiles` persisted via `atomStorage`; `atom_liveHandles` ephemeral (handles can't be serialized) |
| `vault-atoms.ts` | Vault handle, current directory, vault tree, cloud-vault flag, pending state | Vault handle persisted via `services/idb` |
| `workspace-atoms.ts` | Pane tree layout, active pane id | `atom_workspaceLayout` → localStorage |
| `ui-atoms.ts` | Theme, font size, word wrap, zen mode, sidebar width, onboarding, autosave mode, focus, cursor, global dialog | Preferences persisted; editor focus / cursor / dialog ephemeral |
| `metadata.ts` | Per-file metadata (tags etc.), custom workspaces | `atom_customWorkspaces` → localStorage |
| `layout-actions.ts` | Write-only action atoms: `atom_splitPane`, `atom_closePane`, `atom_closeTab`, `atom_moveTab` | n/a |

## Support

- `atoms.ts` — builds `contentStore` and re-exports every atom from the domain files. Treat as the public surface.
- `utils.ts` — pure helpers for the pane tree: `findLeaf()`, `updateLeaf()`, `generateId()`.

## Cross-domain reads

These edges matter when refactoring — break them carefully:

- `file-atoms` → `workspace-atoms` (the active pane decides the active file)
- `vault-atoms` → `file-atoms` (vault rebinding writes into `atom_liveHandles` / `atom_openFiles`)
- `layout-actions` → `workspace-atoms` + `utils`

## Conventions

- Every atom is named `atom_<camelCase>`.
- Action atoms read like verbs (`atom_splitPane`, `atom_rebindHandles`).
- Anything that can't be JSON-serialized (FS handles, AbortControllers) stays ephemeral.
