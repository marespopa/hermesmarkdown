## AI Chat no longer sends a veiled private note

- The active note is withheld from AI Chat while it is private and still veiled in the editor; once revealed it is sent as before.
- The header's "The AI sees …" chip is hidden whenever the note is withheld, so it matches what is sent.
- `AIChatDialog` applies the same privacy check as `PrivateNoteGate` (content, indexed frontmatter, reveal atoms).
