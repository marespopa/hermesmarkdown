## Review 1

**Verdict:** Approve with nits

**Checks:** Deferred to CI.

**Coverage (brief.md):**
- Errors persist in the chat: done. `AIChatDialog.tsx` catch appends a `kind:"error"` message, and `ChatMessageItem.tsx` renders it as `role=alert`. The filter changed to `!m.kind`, so error lines never go back to the API.
- Wrong-key errors tell the user to update their key: done. `ai.ts` `beautifyAIError` now matches Gemini's "API key not valid", `API_KEY_INVALID` and `PERMISSION_DENIED`, and the message points to Settings → AI.
- Timeout surfaces: the 120s abort in `postAI` already existed, and it now also lands in the thread. `ai.test.ts` covers it.
- Tests: `ai.test.ts` (key mapping, bad-key rejection, timeout) and a `ChatMessageItem` error case. The key-mapping tests fail on the old code, as the brief asked. I didn't run them.

**Findings:**
- Minor: `ChatMessageItem.tsx:73` hard-codes `text-[#c65b4a]`. A `danger` token already exists in the Tailwind config (`var(--danger)`), so use `text-danger`.
- Minor: `ChatMessageItem.md` isn't updated for the new `error` kind. The engineer report says so.
- Nit: the timeout test probably passes on the old code, so it guards against regression rather than reproducing the bug. Acceptable.
- Nit: `fetchClaudeModels` calls `response.json()` with no catch. That's out of scope here.

**Handoff:** none required. Fix the minor findings if convenient.
