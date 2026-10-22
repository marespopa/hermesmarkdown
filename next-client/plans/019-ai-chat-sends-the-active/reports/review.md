## Review 1

**Verdict:** Approve with nits

**Checks:** Deferred to CI.

**Brief coverage**
- Veiled private note not sent: done. `AIChatDialog.tsx:48-54` blanks `documentContent` when the note is private (content or indexed frontmatter) and neither reveal-all nor the per-path reveal is set. This is the same rule as `PrivateNoteGate`. `buildChatSystemPrompt` then skips the active-file block, because it needs non-empty content.
- Revealed note is sent: done. Covered by a test that seeds `atom_revealedPrivatePaths`.
- "The AI sees …" chip matches what is sent: done. `AIChatDialog.tsx:213` uses the same gated `documentContent`.
- Repro test first: the new tests (`AIChatDialog.test.tsx:75-105`) assert that the secret text and the `ACTIVE FILE` block are absent and the chip is hidden. They would fail on the old code. They also cover the revealed case and a plain note. They use a Jotai store, and the existing mocks cover network and router.

**Findings**
- Minor: `AIChatDialog.md` is not updated. The component doc should say that a veiled private active note is not sent and that the chip is hidden until it is revealed. Files: `AIChatDialog.md`.
- Minor (safe direction): `PrivateNoteGate` latches a note that becomes private while it is open and shown. The latch is only written to `atom_revealedPrivatePaths` for non-draft paths. An unsaved draft that gets `private: true` typed into it stays visible in the editor, but the chat withholds it. This is conservative and acceptable.
- Not an issue: `selectedText` is still sent, but a veiled note has no mounted editor, so there is no selection.

**Handoff:** none required.
