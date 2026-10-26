# Engineer report — Vault-wide find and replace

## Built
- Raw-text matcher (literal/regex, Match case, Whole word, `$` expansion, ordinals shared between preview and apply, fingerprint): `app/workers/replace-search.ts`.
- `boardFenceRanges`: `app/utils/board/board-format.ts` (next to `stripBoardFence`).
- Cache extraction (`TextCache`, `readFileText`): `app/workers/text-cache.ts`; `text-grep.ts` now uses it (behavior unchanged).
- Worker scan (raw text, 8 readers, 120 ms reports, 5,000 cap, invalid): `app/workers/replace-scan.ts`; protocol `replace:scan|cancel|results` in `text-grep-protocol.ts`; dispatch with own `currentScanId` in `text-grep.worker.ts`.
- Client with its own worker instance, stale-id guard, accumulation, regex watchdog, `withContent` fallback (now exported): `app/services/replace-client.ts`, `text-grep-client.ts`.
- Atoms: `app/atoms/replace-atoms.ts` (`atom_replacePrefs` / `hermes_replace_options`, `atom_lastReplace`).
- Page and hooks: `app/editor/replace/` (`page.tsx`, `use-replace-files.ts`, `use-replace-preview.ts`, `use-replace-selection.ts`, `use-apply-replace.ts`, `components/ReplaceForm|ReplaceFileSection|ReplaceSummary.tsx`).
- `useOpenChange(path, line, column?)`; `editorReplaceHref`, `FIND_PARAM`, `REGEX_PARAM`; `replace-in-files` palette command (+ `…`-stripped disabled reason); `ReplaceSkeleton`.
- Phase 3: `PaletteFooter` `replace` prop/chip; `CommandPalette.tsx` passes it (386 lines).

## Tests/docs
- New tests: `workers/replace-search.test.ts`, `text-cache.test.ts`, `replace-scan.test.ts`, `services/replace-client.test.ts`, `editor/replace/use-apply-replace.test.tsx`, `use-replace-files.test.tsx`, `page.test.tsx`.
- Extended: `utils/board/board-format.test.ts`, `editor/utils/editor-url.test.ts`, `editor/components/RouteSkeletons.test.tsx`, `CommandPalette/AppCommands.test.tsx`, `CommandPalette.content-search.test.tsx`. `text-grep.test.ts` untouched.
- Docs: READMEs (workers, services, atoms, editor, editor/changes, new editor/replace), `ReplaceForm.md`, `ReplaceFileSection.md`, `ReplaceSummary.md`, `CommandPalette.md`, `PaletteFooter.md`, `RouteSkeletons.md`, in-app `editor-workspace.tsx` paragraph.

## Decisions
- `use-replace-selection.ts` added (not in PRD) to keep `page.tsx` small (167 lines).
- Per-file outcomes (replaced / skipped / failed) stay on the sections until the follow-up scan answers, then the fresh preview replaces them; the banner and toast carry the totals afterwards.
- Permission check is by feature detection (`queryPermission` present), so OPFS vaults skip it without reading the vault descriptor.
- Index refresh after writing runs in the background (not awaited); toast shows first.
- `page.test.tsx` mocks `use-replace-files`, `use-apply-replace` and `use-open-change` (their own tests cover them) rather than `usePaletteFiles`.
- `ReplaceFileSection` uses `Button variant="small"` for Open and `unstyled` for line numbers; checkboxes are raw `<input type="checkbox">`.

## Not done / open
- Nothing from the PRD's Tests list is missing. Not run: tests, typecheck, lint (not requested).

## To verify
- `corepack yarn tsc --noEmit`
- `corepack yarn vitest run app/workers app/services/replace-client.test.ts app/editor/replace app/editor/utils app/editor/components/RouteSkeletons.test.tsx app/components/CommandPalette app/utils/board`
- Manually: palette → Replace in Files…; type a find, check preview, uncheck a match, Replace, Undo; `/` search → Replace… chip; edit a note between preview and Replace (file is skipped).
