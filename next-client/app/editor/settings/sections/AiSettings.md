# AiSettings

Description: The Settings → AI Features section: provider (Claude or Gemini), model picker loaded from the key's account (with a refresh button and fallback list), the API key with a "Remove AI key" button, and a connection test. Provider-specific copy and defaults live in one `PROVIDERS` table.

## Local State & Storage
- State: `atom_aiProvider`, `atom_selectedAiModel`, `atom_claudeKey`, `atom_geminiKey`, `atom_availableClaudeModels`, `atom_availableGeminiModels`; fetching, fetch error, and testing flags are local useState.
- Persistence: Keys and selections in `localStorage` (`hermes_claude_key`, `hermes_gemini_key`, …).

## Dependencies
- Core: `SettingControls`, `Input`, `Button`, `Toastr`, `app/services/ai` (`fetchClaudeModels`, `fetchGeminiModels`, `testAIConnection`).
- Network: Only with a key — model listing and the connection test (Claude via `/api/ai`, Gemini model listing directly from Google).

## Quick Usage
```tsx
<AiSettings />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) | | | Reads and writes its settings atoms directly |
