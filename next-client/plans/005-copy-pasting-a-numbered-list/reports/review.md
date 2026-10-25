## Review 1

**Verdict:** Approve

**Checks:** Deferred to CI. Ran `app/tools/cleaner` tests only: 4 files, 48 tests, all pass.

**Brief coverage**
- Bug fixed: the `^(\d+)\. ` → `$1\. ` escape is removed from `ESCAPES` (`app/tools/cleaner/html-to-markdown.ts:~29`). A pasted `2. Title` stays `2. Title`.
- Reproducing test: `html-to-markdown.test.ts:63-67` covers plain, bold-wrapped and multi-paragraph cases. Each would produce `2\. Title` on the old code, so each fails before the fix.
- Scope: a one-line fix plus its comment. No creep.

**Leftover-identifier check:** The only other tests mentioning `\.` are in `html-paste.test.ts` (lines 31 and 82). They use a mocked `convert` and a pure helper, so they are unaffected.

**Findings**
- Minor: the comment wording at `html-to-markdown.ts:14-16` is slightly awkward. Not blocking.

**Tests & docs gaps:** None. There is no sibling .md for this module, and no user-visible docs mention the escaping.
