engineer run 2: review-1 fix list done (tests only); nothing run.
engineer: all three phases implemented; some secondary tests not written (see reports/engineer.md); nothing run.

## Review 1 fix list (changes requested)
The implementation reads correct against the PRD. The tests are missing.
1. Add `UnlinkedMentionsSection.test.tsx` (collapsed by default with no call, phrases and paths, hits, click opens and sets the scroll target, empty/unavailable/too-short/pending states; fake timers).
2. Add `use-rename-item.test.tsx` and `use-move-item.test.tsx` (mock `useRewriteLinksAfterMove`; order after remap and before scan; toasts with and without a count; a throw still rescans).
3. Extend `content-search-client.test.ts`: mentions and search don't supersede each other; a second mentions request resolves the first with null.
4. Extend `content-search.test.ts`: `content:mentions` routes to `content:results` with the `searchId`.
5. Extend `WorkspaceSidebar.test.tsx`: Linked from visible for a vault note on /editor, hidden for the draft and without a vault.
6. Confirm `note-links.test.ts` covers the tie-break order, alias/heading/embed backlinks, multiple occurrences per line, the relative link in a moved note, double-backtick spans and the hermes-board fence.
