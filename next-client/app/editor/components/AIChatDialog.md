# AIChatDialog

Description: Multi-turn AI chat about the active file and selection, with `@note` / `@folder:path` / `@vault` references, image and file attachments, a per-chat model picker, and apply modes (replace selection / insert at cursor, or replace all).

## Local State & Storage
- State: `atom_aiProvider`, `atom_selectedAiModel`, `atom_claudeKey`, `atom_geminiKey`, `atom_availableClaudeModels`, `atom_availableGeminiModels`, `atom_fileMetadata`, `atom_vaultHandle`. The message thread is local useState and is not persisted.
- Persistence: `localStorage` keys `hermes_ai_provider`, `hermes_claude_key`, `hermes_gemini_key`, `selectedAiModel`.

## Dependencies
- Core: `DialogModal`, `Button`, `app/services/ai` (`callAIChat`), `Toastr`, and the pieces in [`ai-chat/`](ai-chat/README.md): `useChatModels`, `useChatMentions`, `ChatMessageItem`, `MentionMenu`, `ChatContextChips`, `chat-helpers`.
- Network: Opt-in AI. Only on user action, it sends the prompt, the active file's content and any selection, any attachments, and the content of referenced notes (full text for `@note`, a path/title/tags index for `@folder:`/`@vault`) to the app's own `/api/ai` route (`app/services/ai.ts`), which forwards it to Anthropic or Gemini using the user's own API key. No telemetry. Listing Gemini models calls `generativelanguage.googleapis.com` directly.
- Context: every request carries the active file — its name, path and content (first 20,000 chars, `ACTIVE_FILE_CHAR_LIMIT`) — built by `buildChatSystemPrompt`; a selection is added on top as the edit target rather than replacing the file. The header shows the active file's name.
- Prompting: the system prompt includes `TABLE_FORMULA_GUIDE`, `NOTE_CALC_GUIDE` and `FORMULA_PRESERVATION_RULE` from `editor/utils/formula-ai-guide.ts`, so the model writes table totals as formulas, writes inline calculator lines (`rent + utilities`) instead of computed numbers, and never replaces existing formulas or calculator lines with values.

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
| currentFilePath? | `string` |  | Active file path; named in the prompt and header, and excluded from @mention options |
| onApply | `(suggestion: string, mode: "insert" \| "replace-all") => void` |  | Applies the AI output |
