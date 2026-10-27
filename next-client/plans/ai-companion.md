# AI Companion — rework plan

## Context
Today the AI is a floating chat (`AIChatDialog`) plus one-shot selection actions reviewed in `AIReviewDialog`. It can only *read* notes (search_notes, read_note, list_open_tasks); the only write is a click-to-save template card. Calls are non-streaming. The goal is one **AI companion** that writes and edits notes, edits code (fenced blocks and plain code files in the vault), organises the vault (create/rename/move/trash), and creates templates, inside a quiet, palette-centred UI.

Decisions made:
- **Docked right side panel**, hidden until opened, pushes content like the library sidebar.
- **Changes apply at once**, with **one undo for the whole turn**; trash still asks first.
- **Claude and Gemini** both stay (AI SDK).
- **Code** covers note code blocks and vault code files.

## Architecture
- **Streaming, with tools run in the browser.** Keys stay in localStorage and the vault never leaves the client.
  - Add `@ai-sdk/react` (it is not installed yet).
  - Client: `useChat` with `DefaultChatTransport`, whose `body` carries `{provider, apiKey, modelKey}`. `onToolCall` runs the tool locally and calls `addToolResult`. `sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls` drives the loop, and a round cap (~12) calls `stop()`.
- **New route** `app/api/ai/companion/route.ts`: `convertToModelMessages` → `streamText({ model, system, tools })` → `toUIMessageStreamResponse()`. Tools are declared without `execute`, as `app/api/ai/chat-tools.ts` does today.
- **Shared server code:** move `createAIModel`, error sanitising and status mapping out of `app/api/ai/route.ts` into `app/api/ai/providers.ts` and `app/api/ai/errors.ts`. The old route keeps `models`, `test`, `text` and `object`; `chat` is removed in phase 5.
- **Gemini parity:** a `foldSystem` option keeps today's habit of folding the system prompt into the first user message. Thought signatures ride along in the UI messages' providerMetadata. Each provider gets a route test with `streamText` mocked.

## Tools
Schemas go in `app/services/companion-tool-defs.ts`, which extends `NOTE_TOOL_DEFS` from `note-tool-defs.ts`. Runners go in `app/editor/components/companion/tools/*.ts`: pure functions, each under 400 lines, each with a test.

| Kind      | Tools                                                                                                                                                                       |
| :-------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Read      | existing `search_notes`, `read_note`, `list_open_tasks`; new `list_folder(path, page?)`, `read_file(path)`, `get_active_note()` (path, selection, code block at the cursor) |
| Edit      | `edit_file(path, edits:[{find,replace}])`, `edit_code_block(path, index \| lang+firstLine, code)`                                                                           |
| Organise  | `create_file`, `create_folder`, `rename` (rewrites links through `renameFile`), `move` (`moveItems`), `trash` (shows a confirmation card first)                             |
| Templates | `create_template(name, body, folder?)`                                                                                                                                      |

- **`edit_file`:** each `find` must match exactly once. On 0 or many matches the tool returns the match count and the model retries.
- **Writes:** every write goes through `useNoteBuffer().writeThrough` (`app/hooks/file-system/use-note-buffer.ts`), so disk wins over cached tab text.
- **Code files:** allowed for the text kinds `file-kinds` knows. `.hermesmarkdown/` is blocked.
- **`trash`:** the runner waits on a `TrashConfirmCard` (Trash / Keep). If the user keeps the files, the tool result is "user declined".
- **`create_template`:** runs `lintTemplate` (`app/utils/templates/template-lint.ts`) first. If it finds problems they go back to the model and nothing is written. Otherwise it saves through `saveAsTemplate` into `_templates/`. This replaces `TemplateSaveCard` and the `/template` save path.
- **`tools/path-guard.ts`:** normalises paths, keeps them inside the vault, and refuses Trash, `.hermesmarkdown` and private notes.
- **Privacy:** reuse `isPrivateFrontmatter` / `isPrivateContent` from `ai-chat/chat-tool-runners.ts` for every read, list, search and edit target.
  - Private notes show as "private (hidden)" and can't be edited or moved.
  - The active private note is never auto-attached.
  - A tool result is capped at about 40 KB per file.

## Turn-level undo
- **`companion/turn-journal.ts`** keeps one record per turn:
  - `content {path, before, afterFingerprint}`, the same pattern as `app/editor/replace/use-apply-replace.ts` (`textFingerprint`)
  - `create {path}`
  - `move {from,to}[]`, from what rename, move and trash produce
- **Shared with the app's undo:** extend `FileUndoGroup` in `app/atoms/vault-atoms.ts` with optional `contents` and `creates`. `app/hooks/file-system/use-file-undo.ts` reverses an entry in reverse order. `recordUndo` gains a group id, so every write in a turn lands in a single "AI changes" group. The existing Undo command, the toast and the panel's **Undo turn** button then all reverse the same thing.
- **Safety:** undo only restores a file whose fingerprint still matches. Files the user has edited since are skipped, and the panel lists them.
- **Optimistic UI:** the tool chip appears at once and a spinner shows only after ~300ms. A failed write marks its chip failed; there is nothing to roll back.

## Panel (`app/editor/components/companion/`, with a README and a `.md` beside each component)
- **`CompanionPanel.tsx`** is mounted in `app/editor/components/EditorShell.tsx`, mirroring `WorkspaceSidebar`.
  - It sets `--content-right` from `atom_companionOpen` / `atom_companionWidth` in `app/atoms/ui-atoms.ts`.
  - Page and ShellPage containers get right padding where they already use `--content-left`.
  - On mobile it becomes a full-height sheet.
- **Components:**
  - `CompanionHeader` (model picker, New chat, Close)
  - `CompanionThread`
  - `CompanionMessage`, adapted from `ChatMessageItem`
  - `ToolActivityChip`
  - `TrashConfirmCard`
  - `TurnSummary` (files changed, **Undo turn**)
  - `CompanionComposer`, which reuses `use-chat-mentions`, `MentionMenu`, `ChatContextChips`, `user-skills`, `skill-context`
- **Hooks:**
  - `use-companion-chat.ts`: useChat, the transport, and status into `app/services/ai-status.ts`
  - `use-companion-tools.ts`: tool dispatch and the turn journal
- **System prompt:** rewritten from `ai-chat/chat-helpers.ts`. Read before editing, prefer `edit_file`, never invent paths.
- **Entry points all open the panel**, with the selection and active path added as context chips:
  - Cmd+J and "Ask or Edit with AI…" (`editor-commands/editor-ai-commands.ts`)
  - the slash "AI Chat" entry (`AI_CHAT_SENTINEL`)
  - SelectionToolbar "Ask AI"
  - `MobileFileIndicator`
  - Cmd+Shift+B (`use-editor-shortcuts.ts`)
- **UI rules:** flat tokens, buttons that look like buttons, accent only for focus, caret and selection.

## Reuse vs delete
- **Keep:** the mention, skill and model helpers; `callAI` in `app/services/ai.ts` for small one-shot calls; `formula-ai-guide.ts` and `hermes-syntax-guide.ts` in the system prompt.
- **Convert:** `useAIEditorActions` and `ai-action-prompts.ts` become `companion/quick-actions.ts`. Each one sends a prepared prompt into the companion, which applies the result through `edit_file` with turn undo. `ai-table-headings.ts` moves to that path.
- **Delete in phase 5:**
  - `AIChatDialog`, `AIReviewDialog`, `AIThinkingOverlay`
  - `ai-chat/use-chat-tools.ts`, `TemplateSaveCard`
  - `callAIChat`, `callAIChatTurn`, `generateContentFix`, `generateFileFromPrompt`, `generateFrontmatterData`
  - the route's `chat` action
  - `aiBuilderRequest`, if nothing still uses it
- **WebMCP:** read tools only. Write tools sit behind a new Settings toggle that is off by default.

## Phases (each one can ship on its own)
1. **Streaming panel with read tools.**
   - Covers the new route, the shared server code, `CompanionPanel` with the push layout, and the rewired entry points. The old dialog stays as a fallback.
   - Tests: the route for both providers, panel open/close/width, tool dispatch.
2. **Edits and turn undo.**
   - Covers `edit_file`, `edit_code_block`, `create_file`, the turn journal, the `FileUndoGroup` extension and `TurnSummary`.
   - Tests: patches that match 0, 1 or many times; undo skips files edited since; disk wins with a tab open (copying the setup in `use-note-buffer.test.tsx`).
3. **Organising.**
   - Covers create_folder, rename, move, and trash with confirmation.
   - Tests: a mixed turn (edits and moves) undoes in order; the path guard.
4. **Templates.**
   - Covers `create_template` with lint retries, and `/template` rewired to it.
   - Tests: a lint rejection reaches the model; the file lands in `_templates/`.
5. **Quick actions and cleanup.** Selection actions move into the companion, the old dialogs and dead code are deleted, and the WebMCP write tools are gated.
6. **Docs.** Rewrite `app/documentation/content/ai-features.tsx`, update `AiSettings.tsx` (width, WebMCP write toggle), the directory READMEs and `ARCHITECTURE.md`, then archive the plan.

## Risks
- **Restored tab text:** text that turn undo restores into an open CodeMirror tab is outside CodeMirror's own history. Turn undo is the way back, by design.
- **Large vaults:** they need `list_folder` paging and capped search results.

## Verification
- Vitest tests sit beside each new module (`corepack yarn vitest run <file>`). Typecheck and lint run in CI through the release-pr flow, not locally.
- **Manual check by the user, once per phase:**
  - Open the panel with Cmd+J and ask it to edit the current note; the text changes at once. Undo turn restores it.
  - Ask it to make a folder and move two notes there, then undo; both return.
  - Ask for a template; it appears in `_templates/` and passes lint.
  - Edit a `.py` file and a code block.
  - Confirm private notes are hidden.
  - Repeat with Gemini.
