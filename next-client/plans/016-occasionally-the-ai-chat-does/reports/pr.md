## AI chat shows timeout and wrong-key errors in the thread
- A failed AI Chat request now leaves its reason in the conversation (not only a brief toast), so a timeout or bad key is never silent.
- Gemini's "API key not valid" / `API_KEY_INVALID` errors now map to "Invalid API Key. Update your key in Settings → AI".
- New `kind: "error"` chat message; filtered out of what's sent to the model. `beautifyAIError` is exported for tests.
