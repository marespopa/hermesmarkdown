# AiSettings

Description: The Settings → AI Features section. One group holds the **AI features** switch, off by default and worded as optional. Turned on, a **Setup** group follows: Provider (Claude, Gemini or Ollama, a segmented control; Ollama adds a **Base URL** field, `https://ollama.com` by default with a **Reset URL** button, and its API key is optional; with no models it says to pull one first, and a local URL shows the `OLLAMA_ORIGINS` note), the API key (with where to get one and that it stays in this browser), then, once a key is in, compact gray **Test connection** / **Remove key** buttons (filled, like the other settings actions, so they never read as plain text) and the Model picker (**Auto (picks by task)** first and the default, then the models loaded from the key's account, with a refresh button and fallback list; changing provider returns to Auto, and a loaded Ollama list never replaces it), then, with Claude as the provider, the **Let the companion search the web** switch (`atom_aiWebSearchEnabled`, off by default; it says searches are billed on the key, may quote notes, and must be allowed in the Anthropic Console), and a note on what is sent and when. Provider-specific copy and defaults live in one `PROVIDERS` table. Last, always shown, a **Browser agents** group: the **Let browser agents read notes** switch (WebMCP), off by default and independent of AI features; its description says what agents can do (search, read a note, list open tasks; private notes hidden, nothing written unless allowed), or that this browser doesn't offer WebMCP yet. Once it's on, **Let browser agents change notes** (`atom_webMcpWritesEnabled`, off by default) shows under it: agents may then use the companion's edit and organising tools and `create_template`, never the Trash or private notes, each change undoable from its toast or ⌘Z in Files.

## Logic
- `atom_aiEnabled` (`localStorage["hermes_ai_enabled"]`): never stored reads as on when a Claude or Gemini key was saved before the switch existed, so those setups keep working; otherwise off.
- `atom_isAiConfigured` needs the switch on and the provider's key, so every AI entry point (chat, Ask AI, slash menu, `AI: …` palette actions, Ctrl/Cmd+Shift+B) follows the switch. With it off, the palette lists no AI actions.
- Turning it off keeps the key; **Remove key** deletes it. Models are only fetched while it's on.
- `atom_webMcpEnabled` (`localStorage["hermes_webmcp_enabled"]`): read by `hooks/use-webmcp-tools.ts`, which registers the note tools with the browser while it's on and a vault is open. Support is read with `useSyncExternalStore` (`isWebMcpSupported`, false on the server), so hydration matches.

## Local State & Storage
- State: `atom_aiEnabled`, `atom_webMcpEnabled`, `atom_aiProvider`, `atom_selectedAiModel`, `atom_claudeKey`, `atom_geminiKey`, `atom_ollamaKey`, `atom_ollamaBaseUrl`, `atom_availableClaudeModels`, `atom_availableGeminiModels`, `atom_availableOllamaModels`; fetching, fetch error, and testing flags are local useState.
- Persistence: The switch, keys and selections in `localStorage` (`hermes_ai_enabled`, `hermes_claude_key`, `hermes_gemini_key`, …).

## Dependencies
- Core: `SettingControls` (`SettingGroup`, `SettingItem`, `SettingNote`, `SegmentedControl`, `SelectControl`), `Toggle`, `Input`, `Button`, `Toastr`, `app/services/ai` (`fetchClaudeModels`, `fetchGeminiModels`, `fetchOllamaModels`, `testAIConnection`).
- Network: Only with the switch on and a key: model listing and the connection test (Claude via `/api/ai`, Gemini model listing directly from Google, Ollama via `/api/ai`, whose base URL is checked by `app/api/ai/base-url.ts`; a local Ollama URL — localhost or a private address — is called straight from the browser by `app/services/ollama-direct.ts`: model list, connection test, one-shot actions and companion chat).

## Quick Usage
```tsx
<AiSettings />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) | | | Reads and writes its settings atoms directly |

## Skills and local project checks
The settings section also includes `SkillSettings` for creating and editing declarative vault skill notes, and `ProjectCheckSettings` for pairing a user-started loopback helper. The helper is local-only, requires approval per run and does not provide an OS sandbox.
