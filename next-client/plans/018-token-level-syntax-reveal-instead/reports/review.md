## Review 1

**Verdict:** Approve with nits

**Checks:** Deferred to CI. I ran `syntax-reveal.test.ts` and `highlight.test.ts` only: 40 tests passed.

**PRD coverage**
- Design (`RevealAt`, `revealAt`, `touches`, `INLINE_TOKENS`, new signature, plugin update): done, `syntax-reveal.ts:21-48,55-135`. `activeLines` is kept and unchanged. The file is 136 lines.
- Behaviors 1-5 (inclusive edges, per-token reveal, nesting, multi-line tokens, multi-range selections): done, `syntax-reveal.ts:84-87`. Touch is tested against the token's range via the parent node.
- Behavior 6 (hide ranges are exactly the parser's mark nodes): done. Hide ranges are unchanged and come from the same tree.
- Behavior 7 (block marks stay line-level): done, `:89,96`. Inline tokens inside a heading follow the token rule.
- Behavior 8 (unfocused shows no marks): done. `lines` and `ranges` are both empty.
- Bench updated to `revealAt(state, true)`: done.
- Header comments in `syntax-reveal.ts`, `live-markers.ts` and `highlight-inline.ts`: done.
- Tests: all the PRD cases are present in `syntax-reveal.test.ts`. The heading-size test is in `highlight.test.ts`.
- Docs: `README.md`, `MarkdownEditor.md` and `editor-writing.tsx` are updated.
- Scope: no creep. No other editor is named.

**Findings (minor)**
- `syntax-reveal.test.ts`: the `***both***` nesting case from Behavior 3 has no test. The PRD's Tests list doesn't require it.
- `MarkdownEditor.md`: "a heading's `#`s and a quote's `>`s on the caret's lines" leaves out callouts' `[!type]`. The wording is slightly inconsistent with the rest of the sentence.
- `highlight.test.ts`: the new test reads `value.spec` via `any`. It works, but it is a little brittle.

**Tests & docs gaps:** none that block approval.

**Handoff:** none.
