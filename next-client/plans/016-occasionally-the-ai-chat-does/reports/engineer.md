# Engineer report 016
**Cause:** errors surfaced only as a 4s toast (easily missed over the chat dialog), and Gemini's "API key not valid" wording wasn't recognised, so raw text showed with no key hint.
**Built:** `services/ai.ts` (beautifyAIError matches Gemini key errors, hints Settings → AI; exported); `AIChatDialog.tsx` (adds an error message to the thread, excluded from API messages); `ChatMessageItem.tsx` (renders `kind: "error"` as role=alert); `chat-helpers.ts` (type).
**Tests:** new `services/ai.test.ts` (key mapping, bad-key rejection, timeout rejection); `ChatMessageItem.test.tsx` error case. Not run (per rules); the key-mapping cases fail on old code, as does the thread error.
**Not done:** ChatMessageItem.md not updated; no in-app docs change.
**To verify:** `corepack yarn vitest run app/services/ai.test.ts app/editor/components/ai-chat/ChatMessageItem.test.tsx`; `corepack yarn tsc --noEmit`. Manually: set a bad Gemini key, send a chat message; the error stays in the thread.
**Risk:** fake-timer timeout test; any existing test matching the old "Please check your settings" text.
