# Sensitive notes privacy: review

## Review 1

**Verdict: Approve with nits**

All three phases are implemented as the PRD describes, with tests and docs. Typecheck, the full test suite and the production build pass. The lint failure comes from a stray, git-ignored build folder that predates this change. ESLint is clean on every directory the change touches. The two minor findings below are wording and small accessibility issues, not data leaks.

### Checks
| Check | Result | Caused by the change? |
|---|---|---|
| `corepack yarn tsc --noEmit` | Pass | — |
| `corepack yarn lint` | **Fail**: thousands of errors, all in `next-client/next-client/.next/dev/static/chunks/*.js` (e.g. `0ku3_katex_dist_katex_mjs_0-yu0v9._.js 184:20 no-control-regex`) | **No.** That stray nested `.next` folder dates from Sep 28, is git-ignored (`!! next-client/`) and isn't in the diff. `corepack yarn eslint app/utils app/atoms app/components/CommandPalette app/components/SensitiveBadge app/editor/components app/editor/settings app/editor/tasks app/documentation/content/vault.tsx` is clean. Deleting `next-client/next-client/` (outside this change) fixes `yarn lint`. |
| `corepack yarn vitest run` | Pass: 116 files, 792 tests | — new/changed suites ran: `note-privacy`, `note-display`, `task-atoms`, `remap-vault-paths`, `feed-model`, `HomeFeed`, `PrivacySettings`, `build-editor-commands`, `CommandPalette`, `TaskRow`, `SensitiveNoteGate` |
| `corepack yarn build` | Pass (24 static pages) | — |

### PRD coverage
| Requirement / acceptance criterion | Status | Evidence |
|---|---|---|
| Marking: `sensitive: true` (case, quotes) or `sensitive`/`private` in frontmatter `tags` (flow, block, scalar; `#`, quotes, case); any positive wins; inline `#private` and missing frontmatter don't count | Done | `app/utils/note-privacy.ts:9-38` (frontmatter only, through `parseFmFields`) |
| Display factory (`PrivacyLevel`, `normalizePrivacyLevel`, mask constants, `NoteDisplayItem`, `noteDisplayTitle`, `createNoteDisplayItem`, `buildNoteDisplayItems`, `maskTask`) | Done | `app/utils/note-display.ts:9-90` |
| Title never from body; empty name → "Untitled sensitive note"; `feedTitle` delegates | Done | `note-display.ts:43-52`, `home-feed/feed-model.ts:30-32` |
| `atom_privacyLevel` (`hermes_privacy_mode`, default `show_title`, `getOnInit`), reveal atoms, `atom_noteDisplayItems`; re-exported | Done | `app/atoms/privacy-atoms.ts:14-38`, `atoms.ts:10` |
| Home feed: show_title lock + `MASKED_PREVIEW`, no real text in DOM; blurred, unblurred on hover / focus-visible (not on selection); hidden omitted, day labels computed after exclusion | Done | `feed-model.ts:62-91`, `FeedRow.tsx:16-43,60-67`, `HomeFeed.tsx:48-50` |
| Settings → Privacy → Privacy Mode (Show titles / Blur previews / Hide notes) after "files" | Done | `settings/sections/PrivacySettings.tsx`, `settings/page.tsx:37-42` |
| Palette level commands with the current one disabled; `reveal-sensitive-session` toggle clears the set when turned off | Done | `editor-commands/privacy-commands.ts:29-65`, `build-editor-commands.ts:24`, `use-editor-command-context.ts:126-128,194-198` |
| Palette file / recent / pinned / `#tag` rows: lock; omitted in hidden | Done | `CommandPalette/use-palette-files.ts:14-48`, `CommandPalette.tsx:69,163-183,325-331` |
| Palette `!` rows masked, matched only by the empty query, omitted in hidden | Done | `palette-model.tsx:68-78`, `task-atoms.ts:24-36` |
| Tasks page: masked text and tags with a lock; checkbox, due date and subtitle kept; never matches search/tag; hidden omits and doesn't count | Done | `task-atoms.ts:24-75`, `tasks/components/TaskRow.tsx:43-89`, `TasksList.tsx:84`. Writeback still works: `patchLineInContent` uses `raw`/`lineHash`, which `maskTask` keeps (`taskExtractor.ts:96-113`). |
| Editor veil (content OR metadata, reveal set, reveal-all, non-empty instance latch, key on the gate); `secondary`/`tertiary` buttons, `min-h-11`, autofocus | Done | `SensitiveNoteGate.tsx:27-55`, `SensitiveNoteVeil.tsx:17-48`, `PaneLeaf.tsx:323-336` |
| Reveal survives rename / move | Done | `vault-atoms.ts:196-200` |
| Not-yet-indexed note veiled through the content check | Done | `SensitiveNoteGate.tsx:38` |
| Marking an open note sensitive doesn't hide it mid-edit; a saved draft stays visible | Done (see minor finding 1 on how the docs describe it) | `SensitiveNoteGate.tsx:39-40`, `PaneLeaf.tsx:59-63` |
| All backends / mobile | Done by construction (derived only from `atom_fileMetadata` and tab content; one `PaneLeaf`/`HomeFeed`/palette) | — |
| No network, no raw `<button>`/`<input>` (the only raw input is the checkbox, which existed before and is allowed), tokens, files < 400 lines | Done | Largest touched files: `PaneLeaf.tsx` 368, `CommandPalette.tsx` 353, `TasksList.tsx` 312 |
| Scope creep | None. The "Privacy" `Command.category` union member is needed for the PRD's category. Making `sortTasks` generic is needed to keep the `DisplayTask` type. | `CommandPaletteContext.tsx:13`, `task-sort.ts:30-35` |

### Findings

**Minor 1: the in-app docs overstate how long a "marked while open" note stays visible.** `app/documentation/content/vault.tsx:183-185`
- **Problem:** The docs say an open note you mark sensitive is "veiled the next time you open it after a reload". The code latches only for the editor instance. `PaneLeaf.tsx:59-63` gives every tab switch (and every rename) a new key, which remounts the gate and resets `shownRef`.
- **Failure scenario:** Open `Plan.md` and add `sensitive: true`. It stays visible, as intended. Switch to another tab and back: the veil appears right away, in the same session. Renaming `Plan.md` from its tab also shows the veil, because the path isn't in `atom_revealedSensitivePaths` and so the remap has nothing to carry.
- **Fix (either):**
  - (a) Reword the docs: "…doesn't hide it while you're editing; it's veiled the next time you open it."
  - (b) In `SensitiveNoteGate`, when the latch is set while the content is sensitive, also call `revealPath(filePath)`. That keeps the note revealed for the session, the existing remap carries it across renames, and the current docs become accurate.

  (b) matches the PRD sentence "veiled the next time it's opened after a reload" more closely. If you choose (b), add a gate test: latched on sensitive content → remount with a new key → no veil.

**Minor 2: screen readers aren't told that a home feed row is sensitive.** `app/editor/components/home-feed/FeedRow.tsx:59`
- **Problem:** The row `Button` has `aria-label={entry.title}`, which overrides its content, so the `SensitiveBadge` label and the sr-only "Preview hidden" / "Preview blurred" text are never read. The engineer fixed this in the palette ("(sensitive)" in the label), but not in the feed.
- **Failure scenario:** A screen reader user hears "Payroll" for a masked row, the same as for a normal note.
- **Fix:** When `entry.isSensitive`, use `aria-label={`${entry.title} (sensitive)`}`. The `HomeFeed.test.tsx` privacy tests currently pass only because they assert on `textContent`. Add an accessible-name assertion.

No blockers or majors. I checked and ruled these out:
- **Masked-task writeback:** safe.
- **Latch reset on tab switch:** correct.
- **`atom_activeEditorView` while veiled:** cleared on editor unmount (`MarkdownEditor.tsx:270`).
- **Recent and pinned rows in hidden:** both resolve through the filtered `files` (`CommandPalette.tsx:165,183`).
- **`existingFiles` for the Create row:** documented as a decision.
- **Other surfaces leaking `preview` or task text:** none; `<MarkdownEditor` and `atom_allTasks` have no other consumers.

### Tests and docs gaps
- Every test case the PRD lists is present. The only gap is the a11y assertion from minor finding 2, plus the latch-reveal test if minor finding 1 is fixed with option (b).
- All new sibling docs (`SensitiveBadge.md`, `SensitiveNoteGate.md`, `SensitiveNoteVeil.md`, `TaskRow.md`, `PrivacySettings.md`), the updated component docs, the README indexes, `ARCHITECTURE.md` and the in-app "Sensitive notes" section are present. There's no settings-section index file to update (same as before this change).
- Not caused by this change: `TaskRow.tsx:11-12` keeps the hard-coded `text-red-600` / `text-amber-600` colors it inherited from `TasksList.tsx`.

### Handoff
Approved, so no fix list goes to the mailbox. The two minor findings are optional follow-ups:
1. Make the "marked while open" behavior and `vault.tsx:183-185` agree (option (b) preferred: reveal the path when the latch is set on sensitive content, and add a test).
2. Add "(sensitive)" to the accessible name of sensitive feed rows (`FeedRow.tsx:59`), and assert it in `HomeFeed.test.tsx`.

Outside this change: delete the stray `next-client/next-client/.next` folder so `corepack yarn lint` passes again.
