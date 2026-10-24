# Pinned section: review

## Review 1

**PRD:** `next-client/plans/pinned-section.md`, in its current version: the Row and Row menu bullets and D18 now describe the leading icon as the row's menu button. **Change:** the uncommitted working tree on `release/6.41.0`, compared with HEAD. The `.yarn/install-state.gz` change was there before and isn't reviewed.

**Verdict: Approve with nits.**

### Checks

Deferred to CI. Following the instructions, I didn't run typecheck, lint, tests or the build, not even single test files. I traced the CI-risk tests by hand (see Tests below).

### PRD coverage

| Requirement | Status | Evidence |
|---|---|---|
| File format: header, `version: 1`, one flow mapping per line (`flowLevel: 2`, `lineWidth: -1`, `noRefs`) | done | `app/services/vault-pins-format.ts:131-136` |
| Entry rules: one kind key, path normalisation, `.`/`..`/`\` rejected, root folder rejected, tag normalised, page ids, icon rules | done | `vault-pins-format.ts:48-93` |
| Lenient reading: bad entries and duplicates hidden but kept, unknown keys kept, null/empty/comment-only means no pins | done | `vault-pins-format.ts:96-127` |
| Invalid YAML, non-mapping root, non-list `pins`: keep the last pins, warn, refuse writes with the exact toast | done | `vault-pins-format.ts:111-123`, `app/services/vault-pins.ts:288`, `app/atoms/pin-atoms.ts:54-58`, `app/hooks/use-pins-sync.ts:65-69` |
| `version > 1`: read, refuse writes with the newer toast | done | `vault-pins-format.ts:125`, `vault-pins.ts:289`, `pin-atoms.ts:60-63` |
| Writes: fresh read, no write when unchanged, serialised chain that survives a rejection, `ensureVaultFolder` + `withRetry` + `writeFileContent` (writable closed in `finally`) | done | `vault-pins.ts:281-310` |
| Live updates: vault change, `atom_fileSystemVersion`, the pins tab's `lastSavedContent`, a 250 ms debounced FileSystemObserver re-synced after each read, a run counter against stale reads | done | `use-pins-sync.ts:19,30-112` |
| Switching or closing the vault resets the pins | done | `use-pins-sync.ts:86-107` |
| Rename, move and undo follow pins (note and folder, prefix-safe, icon and position kept) | done | `app/atoms/vault-atoms.ts:261-262`, `pin-atoms.ts:75-78`, `vault-pins-format.ts:197-208` |
| In-app delete removes pins at and under the path | done | `app/hooks/file-system/use-delete-item.ts:79`, `pin-atoms.ts:82-85` |
| Missing targets: only once the indexer is idle; faint, with a title and a toast; still unpinnable | done | `app/editor/components/sidebar/use-pinned-rows.ts:42,62,68,72-77`, `SidebarPinned.tsx:115-118` |
| Privacy: hidden notes left out (pin kept), masked titles, no path title for private notes | done | `use-pinned-rows.ts:58-66` |
| Section placement first, above Open Notes, only with a vault and a listed pin, inside Suspense | done | `app/editor/components/WorkspaceSidebar.tsx:108-113`, `SidebarPinned.tsx:39` |
| Row per D18: leading icon button (`<label> actions`, hairline `border-edge` on hover, focus or open, about 12px gap), label button with `aria-current` and the title | done | `SidebarPinned.tsx:86-119` (`pr-1.5` + 1px border + `pl-1.5` is about 13px) |
| Default glyphs and the `aria-hidden` emoji | done | `app/editor/components/sidebar/pinned-pages.tsx`, `SidebarPinned.tsx:107` |
| Click behaviour (note, folder, tag in place or pushed, page) and the current row | done (one disclosed deviation, nit N4) | `use-pinned-rows.ts:54-100` |
| Row menu: Set/Change Icon…, Move Up/Down (listed neighbours, disabled at the ends), Unpin with a divider; right-click and the menu key on both buttons | done | `SidebarPinned.tsx:46-69,101,113` |
| Emoji picker: autofocused `BareInput`, up to 64 tiles, a pasted emoji first, `aria-pressed`, a filled secondary Remove Icon, loading and empty states, Enter, Escape, click outside, stays open on a failed write | done | `app/editor/components/PinIconPopover.tsx` |
| Entry points: tree Pin/Unpin for notes and folders (folder item after New Note/New Folder, before Rename), note menu, Pin Note command, palette Ctrl/Cmd+D | done | `vault-tree/tree-menu-items.tsx:69-91`, `sidebar/SidebarFiles.tsx:84-85`, `use-note-menu-items.tsx:58-64`, `use-editor-command-context.ts:111-112`, `use-palette-pins.ts:60` |
| Tags page Pin / Pinned (disabled) button, hidden on mobile, disabled without a vault | done | `app/editor/tags/TagHeading.tsx` |
| Pin Page to Sidebar… (id, category, keywords, six subcommands, "Already pinned", vault and mobile reasons) | done | `editor-commands/PinCommands.tsx`, mounted at `EditorShell.tsx:112` |
| `/editor/tags?tag=` follows URL changes (`useSearchParams` inside Suspense, no set-state-in-effect) | done | `app/editor/tags/page.tsx:31-49` |
| Migration from `hermes_home_pins`: once per vault per session, only after a valid read, one `addPins` write in stored order, entry removed only on ok/unchanged, key removed when empty, retried after an invalid file | done | `use-pins-sync.ts:40-49,74`, `app/hooks/pins-migration.ts` |
| Palette-pinned notes migrate through the same writer and are dropped only on ok/unchanged, with an in-flight guard | done | `use-palette-pins.ts:31-41` |
| `normalizeTag` moved to `app/utils/tag-normalize.ts`; js-yaml `dump` typings | done | `app/workers/parse-note.ts:8`, `types/js-yaml.d.ts` |
| `note-pin-atoms.ts`, `atom_notePins` and `atom_toggleNotePin`/`atom_forgetNotePins` gone; only `pins-migration.ts` reads `hermes_home_pins` | done | grep: no code hits outside `pins-migration.ts` (READMEs mention it only to describe the migration) |
| No `editor-commands/TagCommands.tsx` references | done | grep over the repo and `.next/`: no hits |
| Every source file under 400 lines; `CommandPalette.tsx` and `VaultFileTree.tsx` unchanged | done | the largest touched file is `ui-atoms.ts` at 379 lines; neither file is in the diff |

### Findings

No blocker or major findings.

**Minor**

- **M1. A migration into a newer-version file toasts without any user action.** `use-pins-sync.ts:74` calls `migrate` after any `ok` parse, and `newer` files parse as ok. With legacy pins present, `atom_updatePins` gets `PinsFileNewerError` and shows "…saved by a newer version of HermesMarkdown." when the vault opens. The same happens in the palette migration (`use-palette-pins.ts:31-41`). No data is lost: the legacy entry is kept. Failure scenario: a vault whose `pins.yaml` has `version: 2`, opened on a device with old `hermes_home_pins` entries, shows an error toast as soon as it opens. Suggested fix: skip both migrations while the last read was `newer`. That needs `newer` (or a status) recorded in `PinsState`.
- **M2. `PinCommands.tsx` has no sibling `.md`.** AGENT_RULES asks for one per component. The PRD only asked for a README entry, and the existing `RegisteredCommands.tsx` in the same folder has no `.md` either, so this follows the folder's habit. Add `PinCommands.md` if the rule is meant strictly.
- **M3. The tree offers Pin on non-`.md` files, and choosing it does nothing.** With Show Hidden Files on, the tree lists `.hermes/*` files (`vault-scan.ts:126`). `SidebarFiles.tsx:85` maps every `"file"` to a note pin, and `addPins` drops a target without `.md` (`vault-pins-format.ts:150-153`), so the write returns `unchanged`. Failure scenario: right-click `.hermes/pins.yaml`, choose Pin, and nothing happens with no feedback. Suggested fix: in `SidebarFiles`, pass `isPinned`/`togglePin` only for `.md` paths, or hide the item in `pinItems` for non-notes.
- **M4. A note pin whose metadata has no handle does nothing on click.** `use-pinned-rows.ts:63,68`: when `meta` exists but `meta.handle` is null, the row isn't missing and its click is a no-op. The old pinned list filtered these rows out (`metadata[path]?.handle`). This is rare, because indexed notes carry handles. Suggested fix: resolve a fresh handle through `resolveFileHandleAtPath`, or treat the row as missing.

**Nits**

- **N1.** `CommandPalette.tsx:40` still says pinned notes are "shared with the sidebar's Files". The engineer disclosed this and left it because the PRD keeps that file unchanged. It's a one-word follow-up.
- **N2.** The row doesn't call `sidebarItemClass(isCurrent)` directly. It builds `SIDEBAR_ROW_CLASS` and adds the shared `SIDEBAR_ITEM_CURRENT_CLASS`/`SIDEBAR_ITEM_IDLE_CLASS` (`SidebarPinned.tsx:19,82`). It's needed for D18's two padded buttons and gives the same look. It's flagged only because the PRD names the helper.
- **N3.** A rename or move now awaits the pins write (`vault-atoms.ts:262`) through the serialised chain. It's correct, because `atom_updatePins` never throws, but a slow pins write delays the end of a rename.
- **N4.** Disclosed deviation: clicking the pinned **Tags** page while a tag is selected clears `?tag` instead of doing nothing (`use-pinned-rows.ts:94-97`). This fits the current-row rule (Tags is only current with no tag selected). Note it in the PRD if it should stay.

### Specific checks requested

- **Migration safety.** The vault key and handle are set together in one block (`use-vault-manager.ts:215-216`), so a migration can't use one vault's key against another vault's handle. The legacy entry is removed only after `ok`/`unchanged` (`use-pins-sync.ts:46`). It is retried this session after `invalid` and kept for the next session after `error`/`newer`. An invalid first read never reaches `migrate` (`use-pins-sync.ts:65-69`). Paths that break the entry rules (none in practice, since only `.md` notes were indexed) are skipped by `addPins` and then forgotten with the entry. Nothing that could have been listed is lost.
- **Invalid or newer files are never overwritten.** Every write goes through `applyEdit`, which parses the fresh text and throws before any write (`vault-pins.ts:286-289`). Remap, forget and both migrations use the same path.
- **Rename, move, undo and delete.** All three callers of `atom_remapVaultPaths` (rename, move, undo) reach `atom_remapPins`. `remapPath` is prefix-safe (`notes-old.md` is untouched). `forgetPinPaths` covers the path and everything under it. Both trash and delete-forever go through `removeFromState` → `forgetPins`.
- **Stale-read protection.** `read` drops its result when the run counter, the vault or the state object changed during the read (`use-pins-sync.ts:61-63`). So a read started before one of the app's own writes can't bring back the old pins.

### Tests

Traced by hand, not run:

- `use-pins-sync.test.tsx`. The effect order (the vault effect is declared before the read effect) makes the "loading" assertion and the dropped late read hold. In the fake-timer case, `readPinsFile` is called synchronously inside `Promise.all`, so the 249/250 ms counts are right. The observer `sync` Map equality works. The migration cases match the code (order, removing the entry or key, the invalid file, a failed write, once per session). The `atom_openFiles` value fits `FileState`.
- `vault-pins-format.test.ts`. With js-yaml 4.3.2, `flowLevel: 2` gives block mappings at levels 0 and 1 and flow entries at level 2, and sequences are indented by 2 by default, so `  - {folder: projects}` and `version: 1` on line 2 hold. Emoji are printable plain scalars. The rule, edit and immutability cases match the implementation. `Intl.Segmenter` exists under `@vitest-environment node`.
- `remap-vault-paths.test.ts`. Uses the real `vault-pins` with `MemoryDirectoryHandle`, which throws named `NotFoundError`/`TypeMismatchError` and has `createWritable`. `{...raw, note}` keeps the key order, so the exact-string assertion should hold. The "nothing affected" case relies on `touchesPath` skipping the write.
- `CommandPalette.test.tsx`. `Hydrate` takes `any[]`, so the loose `pinnedNotes()` tuple compiles. The in-memory `updatePinsFile` mock plus `atom_pinsState.vault === notesVault` makes Ctrl+D, context-menu pin and the migration land. The migration runs exactly once because the effect is guarded by `migrating` and drops the file items afterwards.
- The other new tests are behavioural and mock `next/navigation`, `useFileSystem`, toasts and `vault-pins` as required: SidebarPinned, WorkspaceSidebar, PinIconPopover, PinCommands, tree-menu-items, use-delete-item, pin-atoms, vault-pins, the tags page, editor-url and tag-normalize. They cover every case the PRD lists, with SidebarPinned taking most of the WorkspaceSidebar cases (disclosed). `SidebarPinned.test.tsx` uses the D18 `"<label> actions"` icon button.
- The fixtures use products, tasks and statuses only. No test reads the clock, so `vi.setSystemTime` isn't needed.

### Rules, tokens, naming

- Only project components are used (`Button` with `unstyled`/`secondary`, `BareInput`, `TabContextMenu`). There is no raw `<button>`, `<input>` or `<a>`.
- Colours use tokens only (`text-fg-faint`, `border-edge`, `bg-fill`, `bg-accent/15`, `MENU_PANEL_CLASS`). Pin and Remove Icon are filled `secondary` buttons.
- There are no new network calls: js-yaml and the emoji index load from local chunks.
- Neither the diff nor the new files mention "iAWriter", "Typora", any other editor product or "rail".
- Docs are updated: every README and component doc the PRD lists, the new `SidebarPinned.md`, `PinIconPopover.md` and `TagHeading.md`, and the in-app `get-started.tsx` and `vault.tsx`. The docs describe the D18 icon-opens-menu behaviour.

### Handoff

None required. Optional follow-ups for a later pass: M1 to M4 and N1.
