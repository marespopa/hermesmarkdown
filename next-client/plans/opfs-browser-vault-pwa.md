# Browser Vault (OPFS) + Offline PWA Plan

## Problem and approach

Local vaults depend on `window.showDirectoryPicker`, which only Chromium ships. `isVaultSupported`
(`app/hooks/file-system/shared.ts:12`) is false on Safari, iOS and Firefox, so the welcome wizard
(`editor/components/welcome-wizard/VaultStep.tsx`) disables "Create/Open Vault" and shows
"requires Chrome, Edge, or Brave". Those users only get the in-memory draft or a GitHub vault.
There is also no service worker, so the installed app does not start offline.

Most of the groundwork already exists:

- The whole file layer (`atom_vaultHandle`, `vault-scan.ts`, the CRUD hooks, the metadata worker)
  works on `FileSystemDirectoryHandle`, not on picker-specific APIs.
- GitHub vaults already run on OPFS: `getGitHubVaultWorkspace()` in
  `services/github-vault-workspace.ts` returns `navigator.storage.getDirectory()/hermes-vaults/<id>`
  and passes it to `initVaultFromHandle()`.
- `VaultDescriptor` (`atoms/vault-atoms.ts:18`) is already a tagged union (`local | github`).

Approach: add a third vault kind, **browser vault**. It is an OPFS directory under `hermes-vaults/`
that the existing handle-based pipeline opens without changes. Harden the few places that assume
Chromium-only handle methods, add whole-vault import/export so data is never locked in, and add a
hand-written service worker so the installed app starts offline. Chromium keeps the disk-folder flow
as the primary option. Browser vaults are offered everywhere, and they are the default where the
picker is missing.

## Todos

### 1. Capability detection

- In `hooks/file-system/shared.ts`, keep `isVaultSupported` (disk picker) and add
  `isBrowserVaultSupported = !!navigator.storage?.getDirectory`. Expose both through
  `useFileSystem()` (`hooks/use-file-system.ts`), gated on `mounted` like the existing flags.
- Move `getStorageRoot()` out of `github-vault-workspace.ts` into a shared `services/opfs.ts`,
  then import it from both vault kinds.

### 2. Browser vault descriptor and persistence

- Extend `VaultDescriptor` with
  `{ kind: "browser"; version: 1; id: string; displayName: string; createdAt: number }`.
- `services/opfs.ts`: add `getBrowserVaultWorkspace(id)` (`hermes-vaults/browser-<id>`),
  `listBrowserVaults()`, `deleteBrowserVault(id)` (`removeEntry(..., { recursive: true })`), and
  `requestPersistentStorage()` (`navigator.storage.persist()`, plus `estimate()` for the UI).
- `services/idb.ts`: add `saveBrowserVaultDescriptor` and `loadBrowserVaultDescriptor` under a new
  key. Saving one kind of descriptor clears the other two, the same way `saveVaultHandle` and
  `saveGitHubVaultDescriptor` already clear each other. `clearVaultHandle` clears all three.

### 3. Vault manager wiring (`hooks/file-system/use-vault-manager.ts`)

- `initVaultFromHandle`: handle the `browser` branch. It persists the descriptor, skips
  `detectCloudVault`, and the toast uses `displayName`.
- Add `createBrowserVault(name)` and `openBrowserVault(id)`. They resolve the workspace, call
  `requestPersistentStorage()` once, then run `initVaultFromHandle`.
- Mount restore (`init()` effect): try the local handle first, then the browser descriptor, then
  the GitHub descriptor. OPFS needs no permission, so skip `queryPermission` and `isVaultPending`
  for browser vaults.
- `restoreVault` / `verifyPermission` / `queryPermission` (`services/idb.ts:170-190`): guard with
  `typeof handle.queryPermission === "function"` and treat a missing method as granted. Safari and
  Firefox handles do not implement it, so the current calls throw there.
- `openVault()`: when the picker is missing, route to the browser-vault chooser instead of the
  "Try Chrome or Edge" error toast.

### 4. Cross-engine write path

`createWritable()` is called directly in at least 7 places (`use-save-file.ts`,
`use-create-item.ts` x2, `use-rename-item.ts`, `use-duplicate-item.ts`, `use-move-item.ts`,
`utils/paste-image.ts`, `github-vault-workspace.ts`). Older Safari (before 26) has no
`createWritable` on OPFS handles and only supports `createSyncAccessHandle` inside a worker.

- Add `writeFileContent(handle, data, ctx?)` to `hooks/file-system/shared.ts`. It uses
  `createWritable` when available. Otherwise it posts `{ vaultPath, filePath, data }` to a new
  `workers/opfs-writer.worker.ts` that resolves the path from `navigator.storage.getDirectory()` and
  writes with `createSyncAccessHandle` (`truncate(0)` → `write` → `flush` → `close`).
- Replace the direct `createWritable()` calls with this helper. Keep the existing
  `withRetry` and save-retry semantics in `use-save-file.ts` (covered by `save-retry.test.ts`).
- Rename and move already fall back from `handle.move()` to copy+delete. Check that the fallback
  path also goes through the new helper.

### 5. UI entry points

- `VaultStep.tsx`: add a "Create Browser Vault" option (hint: "Stored in this browser · Offline").
  When the picker is unsupported, show it first. Replace the red "requires Chrome" line with a
  neutral note that browser vaults live in this browser's storage and should be exported for backup.
- `VaultEmptyState.tsx`, `PaneEmptyState.tsx`, `MobileFileOverlay.tsx`: show the browser-vault
  actions when `isBrowserVaultSupported`. Include a small list of existing browser vaults to reopen.
- Vault commands (`editor-commands/document-vault-commands.ts`): add "New browser vault",
  "Open browser vault…", "Export vault…", "Import into vault…", and "Delete browser vault".
  "Delete browser vault" asks for confirmation.
- Settings: show storage usage (`estimate()`) and whether storage is persisted, with a button to
  request persistence.
- Naming follows existing rules: "file tree" / "Explorer", never "sidebar" or "rail".

### 6. Whole-vault export / import (zero lock-in)

- Add the `fflate` dependency (small, tree-shakeable zip/unzip). Add `services/vault-archive.ts`:
  - `exportVaultZip(handle)`: walk the vault with the same ignore rules as `collectVaultFiles`
    (`vault-scan.ts`), including `.hermes/` and attachments, then download `<vault>.zip` through
    the existing download pattern in `use-export-file.ts`.
  - On Chromium, also offer "Export to folder…", which copies into a folder chosen with
    `showDirectoryPicker`. This covers moving a browser vault to a disk vault.
  - `importIntoVault(handle, source)`: the source is a `.zip`, a `webkitdirectory` file list
    (desktop Safari and Firefox), or multiple `.md` files (iOS has no directory input). Existing
    files are never overwritten silently: a name conflict gets a suffix, following the
    `use-duplicate-item.ts` naming.
  - After import, run `scanVault` and `indexVaultTags`.
- A GitHub vault can already sync any vault's contents. Note in the docs that a GitHub vault
  gives multi-device sync, and a browser vault is for single-device offline use.

### 7. Offline PWA

- Merge the two manifests. `app/layout.tsx` links `/manifest.json` (`app/manifest.json`), while
  `public/site.webmanifest` also exists. Keep one, and add `id`, `scope`, `start_url: "/editor"`,
  and `any` + `maskable` icon purposes.
- Add a hand-written `public/sw.js` with no build plugin, so Next 16 / Turbopack stay untouched:
  - Install: precache `/editor`, `/editor/files`, the icons and the manifest.
  - Serve `/_next/static/*` cache-first; the files are immutable and hashed.
  - Serve navigations network-first with a cached-shell fallback.
  - Skip `/api/*` (AI routes) and cross-origin requests.
  - Version the cache name with the `package.json` version. `scripts/bump-version.mjs` already
    bumps the version, so cleanup on `activate` removes old caches.
- Add a `components/ServiceWorkerRegister.tsx` client component, rendered in `app/layout.tsx`.
  Register the worker only in production. Show a toast with a Reload action when a waiting
  worker appears.
- Add `apple-mobile-web-app-capable` and status-bar meta tags for the iOS home-screen install.
- Add headers for `/sw.js` in `netlify.toml`: `Cache-Control: no-cache` and
  `Service-Worker-Allowed: /`.

### 8. Docs

- `documentation/content/get-started.tsx`: explain the three vault kinds, where browser-vault data
  lives, eviction (Safari clears site data after about 7 days of no use unless the app is installed
  or storage is persisted), and backing up with export.
- Update the manifest `description` and the README browser-support table.

## Risks and mitigations

- **Storage eviction (Safari/iOS).** Request `persist()`, prompt the user to install as a PWA, and
  show a "last exported" reminder once a vault has more than N notes or has not been exported for
  more than 14 days.
- **The OPFS sync handle is worker-only and exclusive.** The writer worker runs writes one at a
  time per path, so concurrent autosaves cannot collide.
- **`handle.move()` / `removeEntry({recursive})` differ between engines.** Keep the copy+delete
  fallbacks and check them against real Safari and Firefox.
- **Stale app shell after deploy.** Network-first navigations plus the update toast.

## Verification

Per the repo's working rules, run the build or tests only when asked, and do not screenshot-verify
with headless Chromium.

- Unit tests (vitest, following `use-file-system.test.ts` and `save-retry.test.ts`):
  - descriptor save/load/clear exclusivity in `idb.ts`;
  - `writeFileContent` choosing `createWritable` vs. the worker fallback;
  - the permission guard when `queryPermission` is missing;
  - zip export → import round trip (paths, `.hermes/`, conflict suffixing);
  - mount-restore order across the local, browser and GitHub kinds.
- `yarn check` (tsc + eslint).
- Manual matrix for the user to run:
  - Chrome: disk vault unchanged; browser vault create/edit/reload; export to folder.
  - Firefox desktop: create browser vault, edit, reload, import a folder, export a zip.
  - Safari macOS 26 and iOS (installed to home screen): create, edit, go offline (airplane mode),
    relaunch, confirm notes and the app shell load; import `.md` files.
  - After a version bump, confirm the update toast appears and old caches are removed.
