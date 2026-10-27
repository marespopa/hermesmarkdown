---
title: Auto Model Picker (AI Companion)
tags: [plan, ai, companion]
status: done
---

# Auto Model Picker

## Context
The companion header lets the user pick one model (`atom_selectedAiModel`, shared with Settings → AI). Every request uses that model. Easy prompts ("fix this typo") cost as much and wait as long as hard ones ("restructure these notes"). An **Auto** choice should pick a model per message from how hard the task looks.

All paths are under `next-client/`.

## Current State
- `app/atoms/ui-atoms.ts`: `atom_selectedAiModel` (`atomWithStorage`, default `"sonnet-5"`), a plain string model id.
- `app/services/ai.ts`: `getAIConfig()` reads `selectedAiModel` from storage and returns `{ provider, apiKey, baseUrl?, modelKey }`.
- `app/editor/components/companion/companion-chat-store.ts:96`: the transport's `body: () => ({ ...getAIConfig(), ... })` is evaluated per request. There is no prompt in scope at that point.
- `app/editor/components/ai-chat/use-chat-models.ts`: `modelOptions` per provider, from the API with `FALLBACK_*` lists in `chat-helpers.ts`.
- `app/editor/components/companion/CompanionHeader.tsx`: the model button and its pop-up menu.
- `app/api/ai/providers.ts`: `createAIModel` maps a `modelKey` to a provider model. No change needed.
- Ollama has no fixed model list, so tiers cannot be hard-coded for it.

## Goals
- **Auto is the default**: a fresh install, and anyone who has never picked a model, starts on Auto. Each message goes to a model chosen from its difficulty.
- **Auto is a normal choice in Settings → AI**: the first option of the model select, next to the real models, and the first row of the companion's model menu.
- Works for Claude, Gemini and Ollama.
- Instant: the choice is synchronous, with no extra network call before streaming starts (Optimistic UI rule).
- Visible and overridable: the chosen model shows on the reply, and the user can re-run it with a different one.
- Escalates when the user retries.

## Non-Goals
- An LLM classifier call (can be added later behind `pickTier`; see Open Questions).
- Cascading (answer cheap, then re-answer if the check fails).
- Auto for one-shot actions in `app/services/ai.ts` (`/api/ai`). They have fixed, known tasks and keep the selected model.
- Per-tool or per-turn switching inside one multi-step tool loop. A turn uses one model.

## Design

### 1. Tiers and the router (pure, new file)
`app/editor/components/ai-chat/auto-model.ts`

```ts
export type Tier = "fast" | "balanced" | "deep";
export const AUTO_MODEL_ID = "auto";

export interface AutoSignals {
  prompt: string;
  contextChars: number; // attached note text, selection, mentions
  hasAttachments: boolean;
  retries: number;      // consecutive regenerations of this turn
}

export function scoreTask(s: AutoSignals): number;   // heuristic
export function pickTier(s: AutoSignals): Tier;      // score → tier
export function resolveAutoModel(
  provider: AIProvider,
  tier: Tier,
  available: { id: string; name: string }[],
): string;                                           // model id for the provider
```

Heuristic (tunable constants at the top of the file, each unit-tested):
- `+1` prompt over ~600 chars; `+1` context over ~8,000 chars; `+1` attachments.
- `+2` hard intent words (`refactor`, `restructure`, `analy[sz]e`, `plan`, `compare`, `organi[sz]e`, code fences).
- `-1` easy intent words (`typo`, `rename`, `summari[sz]e`, `translate`, `fix grammar`).
- `+retries` (escalate on regenerate).
- Slash commands from `companion-commands.ts` may declare a fixed tier (for example `/compact` → `fast`) that wins over the score.
- `score >= 3` → `deep`, `>= 1` → `balanced`, else `fast`.

`resolveAutoModel` per provider:

| Provider | fast | balanced | deep |
|---|---|---|---|
| claude | `haiku-4-5` | `sonnet-5` | `opus-4-8` |
| gemini | `gemini-3.1-flash-lite` | `gemini-3.5-flash` | `gemini-3.1-pro` |
| ollama | smallest of `available` | middle of `available` | largest of `available` |

Ollama ordering: parse the parameter size from the id or tag (`llama3:8b`, `qwen3:32b`) and sort ascending; ids with no size keep list order. With one model, all tiers map to it. With none, fall back to the existing "No model selected" error. Claude and Gemini ids reuse the `FALLBACK_*` ids so they stay in step with `providers.ts`; if the live list lacks one, step to the nearest tier that exists.

### 2. State
- `atom_selectedAiModel` accepts the sentinel `"auto"` and its default changes from `"sonnet-5"` to `"auto"` (`ui-atoms.ts:351`). No new storage key.
- **Existing users keep their stored model.** `atomWithStorage` only uses the default when nothing is stored, so only new installs and users who never picked a model land on Auto. They can switch to Auto themselves; no migration or forced reset.
- **Settings → AI** (`AiSettings.tsx:268`): "Auto" is the first option of the model `SelectControl` for every provider, labelled "Auto (picks by task)". It is selectable even while models are still loading or the Ollama list is empty (the select's `disabled` no longer applies to Auto alone).
- Changing provider (`AiSettings.tsx:181`) resets the model to `"auto"` instead of `PROVIDERS[next].defaultModel`. The Ollama guard at line 117 (`!loaded.some(...)` → first model) must skip `"auto"`, so loading the model list never overrides it.
- `getAIConfig` Ollama check: with `"auto"` and no models available, keep throwing the "No model selected" error, now worded to cover pulling a model.
- `getAIConfig()` returns `modelKey: "auto"` unchanged; resolution happens in the companion only. One-shot actions (`ai.ts:262`, and the connection test) must map `"auto"` to the `balanced` tier of the provider (`resolveAutoModel(provider, "balanced", ...)`), so the default setting never sends an unknown id. This matters now that Auto is the default.

### 3. Resolve per message
In `companion-chat-store.ts`, `body: () => ...` has no prompt. Resolve at send time instead:
- `use-companion-chat.ts` (the `send` at ~line 139) computes `AutoSignals` from `text`, `context` and attachments, then writes the resolved id to a small module-level ref on the store (`companionHandlers.modelOverride`) just before `sendMessage`.
- `body()` uses `companionHandlers.modelOverride ?? getAIConfig().modelKey`. The override is set only when the selected model is `"auto"` and cleared after the turn starts.
- The resolved model and tier are stored on the assistant message metadata (`metadata: { model, tier, auto: true }`) so the footer can show "Auto → Sonnet 5".

Retries: the thread already supports regenerating a reply. Count consecutive regenerates of the same user message in `use-companion-chat.ts` and pass `retries`. A new user message resets it to 0.

### 4. UI
- `CompanionHeader.tsx`: add an **Auto** row first in the menu (`checked` when selected). The button label shows "Auto" while selected, not a model name. The button is enabled even while models load, because Auto needs no list.
- Assistant reply footer (`CompanionMessage.tsx`): when `metadata.auto`, show the chosen model name quietly. Clicking it opens the same menu; picking a model re-runs that turn with it (selected model stays "Auto" unless the user changes it in the header). Use existing `Button` variants (`menu-row` for rows, `unstyled` for the footer label).
- The label updates in the same frame the user sends, since the choice is synchronous.
- No spinner is needed. If the chosen model errors (for example an Ollama model no longer pulled), show the existing error toast and keep the user's prompt in the composer.

### 5. Telemetry-free tuning
Keep it local: log the chosen tier, score and any override/retry to `console.debug` behind a dev check only. No network telemetry.

## Implementation Steps
- [ ] Add `auto-model.ts` with `pickTier`, `scoreTask`, `resolveAutoModel` and the `Tier`/`AUTO_MODEL_ID` exports.
- [ ] Add `auto-model.test.ts`: easy/medium/hard prompts, retry escalation, slash-command fixed tier, per-provider mapping, Ollama size ordering, one model and zero models.
- [ ] Teach `getAIConfig` consumers in `app/services/ai.ts` (lines ~45 and ~262, plus `testAIConnection`) to map `"auto"` to the provider's balanced model. Test: default config never reaches `createAIModel` with `"auto"`.
- [ ] Default `atom_selectedAiModel` to `"auto"`; make Auto the first option of the Settings model select; reset to `"auto"` on provider change; keep the Ollama guard from overriding it.
- [ ] Companion: add `modelOverride` to `companionHandlers`, compute signals in `use-companion-chat.ts`, use the override in `body()`, store `metadata`.
- [ ] `CompanionHeader`: Auto row and label.
- [ ] `CompanionMessage`: chosen-model footer with re-run menu.
- [ ] Tests: Settings (Auto first in the select, kept on provider switch and after the Ollama list loads; seed through `store.set`, not storage), header (Auto listed first, selecting it persists), `use-companion-chat` (Auto sends the resolved model; fixed selection is untouched; regenerate bumps the tier). Mock `useRouter`, the file system hooks and network, and wrap in `<Provider>` per the project rules.
- [ ] Docs: update `CompanionHeader.md`, `CompanionMessage.md`, `CompanionPanel.md` if touched, `ai-chat/README.md`, and add `auto-model.md`. Mention Auto in the user docs for the companion.
- [ ] Keep files under 400 lines; `auto-model.ts` stays separate from the hooks.

## Risks
- **Heuristic misroutes.** Mitigation: visible chosen model, one-click override, retry escalation, constants in one place.
- **Stale model ids.** Resolving against the live `modelOptions` list, with the fallback list as a backstop, avoids sending a removed id.
- **Ollama size parsing.** Ids without a size fall back to list order; the table above documents it.
- **`"auto"` reaching code that doesn't know it.** It is now the default, so every non-companion reader of `selectedAiModel` must map it; covered by the `ai.ts` step and its test. Grep for `selectedAiModel` readers when implementing.
- **Cost surprise for new users.** Auto can route to a deep model. Mitigated by the visible footer and the heuristic leaning to `fast`/`balanced` for short prompts.

## Decisions
- Auto is the default for new installs and sits in Settings → AI.
- Existing users keep their stored model; they can switch to Auto themselves. No migration.
- No classifier call in this change. Revisit only if real use shows the heuristic misroutes often; it would slot in behind `pickTier`.
- No confirmation before routing to a deep (Opus-class) model. The chosen model is shown on the reply, and the user can re-run with another.
