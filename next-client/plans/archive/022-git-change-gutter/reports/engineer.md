# 001 git change gutter — engineer report

## Built
- Git reader: `app/services/git/` (`git-refs`, `git-repo`, `git-objects`, `git-pack`, `git-tree`, `git-read`, `git-fs`), worker `workers/git-read.worker.ts` + `git-read-protocol.ts`, client `services/git-read-client.ts` (dedupes, inline fallback).
- `@codemirror/merge` 6.12.3 (exact) added; yarn.lock updated.
- Gutter: `editor/codemirror/git-changes.ts` (`setGitBaseline`, `gitChanges`, `computeGitMarkers`, `gitChangesField`); compartment wired in `extensions.ts`, `plain-text-extensions.ts`, `use-codemirror-editor.ts`.
- `atoms/git-atoms.ts` (`atom_showGitChanges`, `atom_gitAvailable`), re-exported in `atoms.ts`; `hooks/use-git-baseline.ts`; `MarkdownEditor.tsx` wiring; palette command and Settings row.
- Docs: vault.tsx git section, editor-workspace.tsx, landing-content.ts, editor/README.md, services/ workers/ atoms/ READMEs, EditorSettings.md, SettingsCommands.md, MarkdownEditor.md.

## Tests
New: `services/git/{git-refs,git-repo,git-objects,git-pack,git-tree}.test.ts` + `git-test-utils.ts`, `editor/codemirror/git-changes.test.ts`, `editor/hooks/use-git-baseline.test.tsx`, `editor/settings/sections/EditorSettings.test.tsx`. Updated: `AppCommands.test.tsx` (palette toggle), `extensions.test.ts` (new options), `memory-file-system.test-utils.ts` (`File.slice`, `lastModified`).

## Decisions
- Deviation (PRD Design, Editor): `useGitBaseline` also takes `vaultHandle` (from `useFileSystem` in MarkdownEditor) instead of reading it itself.
- The gutter reserves its 6px only once a baseline is set, so text shifts 6px once when the baseline first arrives, and never for non-repos.
- The SettingsCommands test lives in `AppCommands.test.tsx` (its existing host).
- `git-read.ts` shares the worker/inline reads; `git-fs.ts` holds read helpers.
- Any read failure → baseline `"off"`, one `console.warn` per file+commit.

## Not done / open
- Nothing run (rules). Pack inflate relies on fflate `Unzlib` tolerating bytes after the zlib stream end; first place to check if pack tests fail.

## To verify
`corepack yarn tsc --noEmit`; `corepack yarn vitest run app/services/git app/editor/codemirror/git-changes.test.ts app/editor/hooks/use-git-baseline.test.tsx app/editor/settings app/components/CommandPalette/AppCommands.test.tsx app/editor/codemirror/extensions.test.ts`. Manually: open a git-repo vault, toggle Git Changes, edit, commit in a terminal, refocus; try after `git gc`.
