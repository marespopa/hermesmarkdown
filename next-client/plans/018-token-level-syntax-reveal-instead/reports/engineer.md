# Engineer report: token-level syntax reveal

**Built:** `syntax-reveal.ts` gains `RevealAt`/`revealAt`, `touches` (inclusive) and `INLINE_TOKENS`. Inline marks hide unless a selection range touches their parent token. Heading/quote marks stay line-level via `reveal.lines`. The plugin passes `revealAt`. Bench updated; comments in `live-markers.ts` and `highlight-inline.ts` updated.
**Tests/docs:** `syntax-reveal.test.ts` (updated, new cases), `highlight.test.ts` (heading size), `editor/README.md`, `MarkdownEditor.md`, `editor-writing.tsx`.
**Decisions:** none beyond the PRD. Nothing run.
**To verify:** `corepack yarn vitest run app/editor/codemirror/syntax-reveal.test.ts app/editor/codemirror/highlight.test.ts`, `corepack yarn tsc --noEmit`.
**Risk:** the nested/multi-line test expectations depend on Lezer parsing (`**bold\nstill**`).
