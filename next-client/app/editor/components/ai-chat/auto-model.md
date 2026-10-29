# auto-model

Description: Auto is the default value of `atom_selectedAiModel` (`"auto"`, `AUTO_MODEL_ID`). It is the first choice in Settings → AI and in the companion's model menu. The companion picks a model for each message from how hard it looks; the choice is synchronous, with no extra request.

## Exports
| Name | Description |
|---|---|
| `Tier` | `"fast" \| "balanced" \| "deep"` |
| `scoreTask(signals)` | Heuristic score: +1 long prompt, +1 large context, +1 attachments, +2 hard intent words or a code fence, −1 easy intent words, + retries |
| `pickTier(signals)` | `fixedTier` if given, else score ≥ 3 → deep, ≥ 1 → balanced, else fast. Constants are at the top of the file |
| `resolveAutoModel(provider, tier, available)` | Claude and Gemini: a fixed id per tier (the nearest tier the live list has when one is missing). Ollama: models sorted by parameter size (`modelSize`), smallest / middle / largest; `""` when there are none |

## How it is used
- `use-companion-chat.ts` computes the signals on send, writes the resolved id to `companionHandlers.modelOverride` (used by the transport's `body()` for every round of the turn) and records `{ model, name, tier }` in the user turn's `metadata.auto`; the reply shows it as "Auto → name". The same prompt sent again right after counts as a retry and steps up a tier.
- Everything else (`getAIConfig`, `testAIConnection`) maps `"auto"` to the provider's balanced model, so no request ever carries `"auto"`. For Ollama it uses the models `fetchOllamaModels` last reported.
- Users who already picked a model keep it; only a fresh install (or one that never picked) starts on Auto.
