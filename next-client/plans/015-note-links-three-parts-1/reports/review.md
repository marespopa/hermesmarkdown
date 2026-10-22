## Review 1

**Verdict:** Changes requested

**Checks:** Deferred to CI.

### PRD coverage
- Pure core (`wikilink-scan`, `link-resolver`, `backlinks`, `rewrite-links`), the `resolveFileMetaByName` delegate and `atom_backlinkIndex`: done, and they match the Design.
- Linked from (`LinkedFromSection.tsx`, `link-jump.ts`, `WorkspaceSidebar.tsx:110-115`): done. Covers privacy filtering, sorting, the duplicate-title folder label, the empty line and jump-to-link.
- Unlinked mentions:
  - Worker (`content-mentions.ts`, protocol, `handleContentMessage`): done.
  - Client (`findNoteMentions` with per-slot supersede): done, so the palette search and mentions search do not cancel each other.
  - Section (`UnlinkedMentionsSection.tsx`): done. It is collapsed by default, debounced 600 ms, and has the unavailable, too-short, empty and pending states.
- Rewrite on rename/move/undo (`use-rewrite-links.ts`, `use-rename-item.ts`, `use-move-item.ts`, `use-file-undo.ts`): done.
  - It runs after remap and before rescan.
  - Failures only toast.
  - Trash undo never rewrites.
  - The move toast suffix matches the PRD.
- Docs: done. Hooks, atoms, workers, sidebar, WorkspaceSidebar, ARCHITECTURE and in-app documentation are updated. The two new components have `.md` files.
- Source files are under 400 lines, with no raw buttons or inputs and no new network calls. No scope creep seen.

### Findings
**Major: PRD-listed tests are missing.** Tests are required with every behavior change, and several acceptance criteria are untested.
- `UnlinkedMentionsSection.test.tsx` does not exist. Nothing covers:
  - collapsed by default and no request until expanded (an acceptance criterion);
  - the phrases and paths passed to the search;
  - click opening the note and setting the scroll target;
  - the empty, unavailable, too-short and pending states.
- `use-rename-item.test.tsx` and `use-move-item.test.tsx` do not exist. Nothing covers:
  - the call order (rewrite after remap, before scan);
  - the toast texts;
  - a rewrite throw still rescanning.
- `use-file-undo.test.tsx` was extended, but only for the call and the Trash case. The failure toast is untested.
- `content-search-client.test.ts` and `content-search.test.ts` were not touched. Missing:
  - "mentions and search don't supersede each other" (an acceptance criterion);
  - "a second mentions request resolves the first with null";
  - `content:mentions` routing.
- `WorkspaceSidebar.test.tsx` was not touched. Nothing covers Linked from showing for a vault note on `/editor` and hiding for the draft or without a vault.
- The pure-core tests are folded into one `note-links.test.ts`, which is acceptable. Confirm it covers:
  - the resolver tie-break order;
  - backlinks via alias, heading and embed;
  - multiple occurrences in one line;
  - the relative link inside a moved note;
  - double-backtick spans and the `hermes-board` fence.

**Minor**
- `use-rename-item.ts:157-165` shows the "Updated links" success toast; there is no wording problem. No other nits.

### Handoff (fix list for hermes-engineer)
1. Add `UnlinkedMentionsSection.test.tsx` per the PRD (fake timers, mock `findNoteMentions` and `isContentSearchAvailable`).
2. Add `use-rename-item.test.tsx` and `use-move-item.test.tsx`. Mock `useRewriteLinksAfterMove`. Assert the order (after remap, before `scanVault`), the toasts with and without a count, and that a rewrite throw still rescans.
3. Extend `content-search-client.test.ts`: mentions and search don't supersede each other, and a second mentions request resolves the first with null.
4. Extend `content-search.test.ts` with the `content:mentions` routing test.
5. Extend `WorkspaceSidebar.test.tsx` with the Linked from visibility cases (vault note, draft, no vault).
6. Cover the pure-core cases listed under Findings if they are not already in `note-links.test.ts`.

## Review 2

**Verdict:** Approve with nits

**Checks:** Deferred to CI.

### Review 1 fix list
All six items have a matching file in the working tree:
- `UnlinkedMentionsSection.test.tsx`
- `use-rename-item.test.tsx`
- `use-move-item.test.tsx`
- extended `content-search-client.test.ts`
- extended `content-search.test.ts`
- extended `WorkspaceSidebar.test.tsx`

I did not run these tests and did not read them line by line. The consolidated `utils/note-links/note-links.test.ts` is 131 lines, so it is small for the pure-core cases the PRD lists. CI will show whether they pass.

### Code re-read
- `rewrite-links.ts`: the rule matches the PRD. A link is rewritten only if it resolved before and no longer resolves to the mapped path after. Case-only renames produce no edit. Edits are applied from the end, and `.md`, `#heading`, `|alias` and the embed `!` are preserved.
- `wikilink-scan.ts`: fence open/close and inline-code masking are correct, and offsets are preserved.
- `link-resolver.ts`: it keeps the old semantics, and `resolveFileMetaByName` is now a delegate.
- `use-rewrite-links.ts`: it takes a fresh handle, writes through `writeThrough`, and counts updated and failed. One failed note does not stop the rest.
- The rename, move and undo hooks run the rewrite after the remap and before the rescan. Each is wrapped in its own try/catch. The undo hook rewrites only for non-Trash moves.
- `content-mentions.ts` and the client: mentions and search now use separate supersede slots, so they no longer cancel each other.
- File sizes are fine (all new source files are under 160 lines; `use-move-item.ts` is 231). No raw buttons or inputs, and no network calls.

### Findings (minor, none block)
- `UnlinkedMentionsSection.tsx:22-38`: the phrases are the file base name plus `frontmatter.title`. The PRD says "display title (`noteDisplayTitle` / `frontmatter.title`)". A note whose title comes from its H1 only is searched by file name alone, so prose using the H1 wording is missed. Fix: also use `atom_noteDisplayItems.get(path)?.title`.
- `content-mentions.ts:25`: `MAX_OCCURRENCES_PER_NOTE` stops the whole note scan at 200, which the PRD allows. Nothing to change.
- The `useEffect` that depends on `metadata` and `display` re-runs the debounced search on every metadata change. The PRD asks for this.

### Handoff
None required.
