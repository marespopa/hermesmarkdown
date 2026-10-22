# Engineer report: 019 private note in AI Chat

- **Built:** `app/editor/components/AIChatDialog.tsx` blanks the document content when the note is private (content or indexed frontmatter) and not revealed (`atom_revealAllPrivate` / `atom_revealedPrivatePaths`). `buildChatSystemPrompt` omits the block for empty content and the chip already requires non-empty content, so both follow.
- **Tests/docs:** `AIChatDialog.test.tsx` (3 new cases: veiled → not sent and no chip; revealed → sent; normal note sent). The veiled case fails on the old code. `AIChatDialog.md` updated.
- **Decisions:** fix lives in the dialog, not page.tsx, so chip and prompt share one value. Selection text untouched. Drafts have no path, so a private draft stays withheld.
- **To verify:** `corepack yarn vitest run app/editor/components/AIChatDialog.test.tsx`; `corepack yarn tsc --noEmit`.
