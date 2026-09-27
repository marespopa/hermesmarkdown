# AIChatDialog

Description: Multi-turn AI chat about the current document and selection, with `@note` / `@folder:path` / `@vault` references, image and file attachments, a per-chat model picker, and apply modes (replace selection / insert at cursor, or replace all).

## Local State & Storage
- State: `atom_aiProvider`, `atom_selectedAiModel`, `atom_claudeKey`, `atom_geminiKey`, `atom_availableClaudeModels`, `atom_availableGeminiModels`, `atom_fileMetadata`, `atom_vaultHandle`. The message thread is local useState and is not persisted.
- Persistence: `localStorage` keys `hermes_ai_provider`, `hermes_claude_key`, `hermes_gemini_key`, `selectedAiModel`.

## Dependencies
- Core: `DialogModal`, `Button`, `app/services/ai` (`callAIChat`), `Toastr`, and the pieces in [`ai-chat/`](ai-chat/README.md): `useChatModels`, `useChatMentions`, `ChatMessageItem`, `MentionMenu`, `ChatContextChips`, `chat-helpers`.
- Network: Opt-in AI. Only on user action, it sends the prompt, the selected or document text, any attachments, and the content of referenced notes (full text for `@note`, a path/title/tags index for `@folder:`/`@vault`) to the app's own `/api/ai` route (`app/services/ai.ts`), which forwards it to Anthropic or Gemini using the user's own API key. No telemetry. Listing Gemini models calls `generativelanguage.googleapis.com` directly.
- Prompting: the system prompt includes `TABLE_FORMULA_GUIDE` and `FORMULA_PRESERVATION_RULE` from `editor/utils/formula-ai-guide.ts`, so the model writes table totals as formulas and never replaces existing formulas with values.

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
