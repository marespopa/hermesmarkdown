# Engineer report: note links (015)

## Built
- Core: `app/utils/note-links/{wikilink-scan,link-resolver,backlinks,rewrite-links}.ts`; `resolve-file-by-name.ts` delegates to the resolver.
- Linked from: `atom_backlinkIndex` (`app/atoms/link-atoms.ts`), `sidebar/LinkedFromSection.tsx`, `link-jump.ts`, wired in `WorkspaceSidebar.tsx`.
- Unlinked mentions: `workers/content-mentions.ts`, `content:mentions` in protocol + `handleContentMessage`, `findNoteMentions` (own supersede slot) in `content-search-client.ts`, `sidebar/UnlinkedMentionsSection.tsx`.
- Rewrite: `hooks/file-system/use-rewrite-links.ts`, called from `use-rename-item.ts` (toast), `use-move-item.ts` (toast suffix), `use-file-undo.ts` (non-Trash reverse moves, error toast only).

## Tests/docs
Tests: `note-links.test.ts`, `content-mentions.test.ts`, `use-rewrite-links.test.tsx`, `LinkedFromSection.test.tsx`, extended `use-file-undo.test.tsx`. Docs: new section .md files, `utils/note-links/README.md`, sidebar/hooks/atoms/workers READMEs, `WorkspaceSidebar.md`, ARCHITECTURE, in-app wikilinks docs.

## Decisions
- Mention phrases use file base name + `frontmatter.title` (not the display title, which may be masked for private notes).
- `content-mentions.ts` and `content-search.ts` import each other (functions/constants used at call time only).

## Not done / open
- Not written (time): `UnlinkedMentionsSection.test.tsx`, `WorkspaceSidebar.test.tsx` additions, `content-search(.client).test.ts` additions, rename/move hook tests.
- Nothing was run (no typecheck/tests by rule); existing tests that render rename/move hooks may need `use-rewrite-links` mocked.

## To verify
`corepack yarn tsc --noEmit`; `corepack yarn vitest run app/utils/note-links app/workers app/hooks/file-system app/editor/components/sidebar`. Manually: rename a linked note, move it, undo; open Linked from / Unlinked mentions.

## Run 2 (review 1 fix list)
Added the missing tests; no source changes. Nothing was run (no typecheck/tests by rule). The "Not done" list above is now done.
- New: `sidebar/UnlinkedMentionsSection.test.tsx`, `hooks/file-system/use-rename-item.test.tsx`, `use-move-item.test.tsx`.
- Extended: `content-search-client.test.ts` (separate slots, mentions supersede), `content-search.test.ts` (`content:mentions` routing), `WorkspaceSidebar.test.tsx` (Linked from visibility; `renderSidebar` takes a `leftActive` path), `note-links.test.ts` (tie-break, alias/heading backlinks, several links per line, relative link in a moved note, double-backtick and hermes-board fence).
- To verify: `corepack yarn vitest run app/utils/note-links app/workers app/services/content-search-client.test.ts app/hooks/file-system app/editor/components`. The move test patches `resolve()` onto the in-memory vault handle, which may need adjusting.
