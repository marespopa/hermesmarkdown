# AIChatDialog

Description: Multi-turn AI chat about the current document and selection, with vault file references and apply modes (insert or replace all).

## Local State & Storage
- State: `atom_aiProvider`, `atom_selectedAiModel`, `atom_claudeKey`, `atom_geminiKey`, `atom_availableClaudeModels`, `atom_availableGeminiModels`, `atom_fileMetadata`, `atom_vaultHandle`. The message thread is local useState and is not persisted.
- Persistence: `localStorage` keys `hermes_ai_provider`, `hermes_claude_key`, `hermes_gemini_key`, `selectedAiModel`.

## Dependencies
- Core: `DialogModal`, `app/services/ai` (`callAIChat`, `fetchClaudeModels`, `fetchGeminiModels`), `Toastr`.
- Network: Opt-in AI. Only on user action, it sends the prompt plus the selected or document text to the app's own `/api/ai` route (`app/services/ai.ts`), which forwards it to Anthropic or Gemini using the user's own API key. No telemetry. Listing Gemini models calls `generativelanguage.googleapis.com` directly.

## Quick Usage
```tsx
import AIChatDialog from "./AIChatDialog";

<AIChatDialog isOpen={open} onClose={close} documentContent={doc} selectedText={sel} onApply={apply} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| isOpen | `boolean` |  | Visibility |
| onClose | `() => void` |  | Dismiss handler |
| documentContent | `string` |  | Full document context |
| selectedText | `string` |  | Current selection |
| currentFilePath? | `string` |  | Used to resolve references |
| onApply | `(suggestion: string, mode: "insert" \| "replace-all") => void` |  | Applies the AI output |
