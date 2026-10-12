# AIChatDialog

Description: Multi-turn AI chat about the active file and selection, with `@note` / `@folder:path` / `@vault` references, image and file attachments, a per-chat model picker, and apply modes (replace selection / insert at cursor, or replace all).

## Local State & Storage
- State: `atom_aiProvider`, `atom_selectedAiModel`, `atom_claudeKey`, `atom_geminiKey`, `atom_availableClaudeModels`, `atom_availableGeminiModels`, `atom_fileMetadata`, `atom_vaultHandle`. The message thread is local useState and is not persisted.
- Persistence: `localStorage` keys `hermes_ai_provider`, `hermes_claude_key`, `hermes_gemini_key`, `selectedAiModel`.

## Dependencies
- Core: `DialogModal`, `Button`, `app/services/ai` (`callAIChat`), `Toastr`, and the pieces in [`ai-chat/`](ai-chat/README.md): `useChatModels`, `useChatMentions`, `useChatSkills`, `ChatMessageItem`, `MentionMenu`, `ChatContextChips`, `chat-helpers`, `chat-skills`.
- Network: Opt-in AI. Only on user action, it sends the prompt, the active file's content and any selection, any attachments, and the content of referenced notes (full text for `@note`, a path/title/tags index for `@folder:`/`@vault`) to the app's own `/api/ai` route (`app/services/ai.ts`), which forwards it to Anthropic or Gemini using the user's own API key. No telemetry. Listing Gemini models calls `generativelanguage.googleapis.com` directly.
- Context: every request carries the active file — its name, path and content (first 20,000 chars, `ACTIVE_FILE_CHAR_LIMIT`) — built by `buildChatSystemPrompt`; a selection is added on top as the edit target rather than replacing the file. The header shows the active file's name.
- Skills: the **template skill** turns on for a chat once any user message mentions "template(s)" or starts with `/template`. While on, each request's system prompt also carries the skill instructions (`--- SKILL ---` block: the template grammar from `TEMPLATE_SYNTAX_GUIDE` and the `~~~~hermes-template <name>` output format), or the body of `.hermes/skills/create-template.md` when that vault file exists (read fresh each turn, never written by the app). Each template block in a reply gets a save card (`TemplateSaveCard`) under the message; only its **Save template** / **Replace template** click writes `<templates folder>/<name>.md`. No new network calls: the skill only adds text to the same `/api/ai` request. See `ai-chat/chat-skills.ts` and `use-chat-skills.ts`. Two more skills work the same way and also send app data: the **weekly review** (`/review`, or "weekly review", "recap last week"…) adds the week's rollup and daily sheets (`weekDataBlock`; last week when the asking message says so), and **tasks** (`/tasks`, or "task(s)", "to-do(s)", "action items") adds the vault's open tasks, most pressing first, capped at 150, with today's date (`openTasksBlock`). Both leave private notes out and only count them (`ai-chat/skill-context.ts`); their instructions can be overridden by `.hermes/skills/weekly-review.md` / `tasks.md`. The hint under the input lists the commands.
- Tools: with a vault open, each turn runs through `useChatTools().converse` (`ai-chat/use-chat-tools.ts`): the request carries `tools: true`, and the system prompt adds `TOOLS_GUIDE`. When the model calls a tool (`search_notes`, `read_note`, `list_open_tasks`, `add_to_today`, declared server-side in `app/api/ai/chat-tools.ts`), the browser runs it against the vault, sends the results back, and repeats (at most `MAX_TOOL_ROUNDS`, 6) until the model answers. Each tool run adds a quiet activity line to the thread (`kind: "activity"`, never sent back). `add_to_today` shows a [ToolApprovalCard](ai-chat/ToolApprovalCard.md) in place of the typing dots and waits for **Add** (Quick jot appends the lines) or **Don't add**; closing the chat declines. Without a vault the chat makes one plain request, as before.
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
