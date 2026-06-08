# HermesMarkdown AI Features — Engineering Handoff

## Overview

Five AI-powered features using the user's own API keys (Claude or Gemini). Requests go **browser → AI Provider directly** via the [Vercel AI SDK](https://ai-sdk.dev). HermesMarkdown servers are never in the loop. Zero ongoing cost to you.

---

## Foundation — `ai.ts` Service Module

Single shared module using Vercel AI SDK.

```typescript
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText, generateObject } from 'ai';
import { z } from 'zod';

const getProvider = () => {
  const provider = localStorage.getItem("hermes_ai_provider") || 'claude';
  const apiKey = localStorage.getItem(`hermes_${provider}_key`);
  
  if (!apiKey) throw new Error(`No API key set for ${provider}`);

  if (provider === 'claude') {
    return createAnthropic({
      apiKey,
      headers: { "anthropic-dangerous-direct-browser-access": "true" }
    })('claude-3-5-sonnet-latest');
  } else {
    return createGoogleGenerativeAI({
      apiKey
    })('gemini-1.5-pro-latest');
  }
};

export async function callAI(system: string, prompt: string) {
  const { text } = await generateText({
    model: getProvider(),
    system,
    prompt,
  });
  return text;
}
```

---

## Settings Panel

**Location:** Existing settings UI

**Fields:**
- **AI Provider Selection:** Dropdown [`Claude`, `Gemini`]
- **Claude API Key:** Password field (visible if Claude selected)
- **Gemini API Key:** Password field (visible if Gemini selected)
- **Test connection** button — sends a minimal ping, shows ✅ or ❌
- **Save button** → persists provider choice and keys to `localStorage`.

**Display note to user:**
> Your API keys are stored locally in your browser and never sent to HermesMarkdown servers.

---

## Feature 1 — Auto-fill Frontmatter

**Trigger:** `✨ Generate` button in the frontmatter wizard toolbar

**Implementation:** Use `generateObject` for guaranteed JSON structure.

```typescript
const { object } = await generateObject({
  model: getProvider(),
  schema: z.object({
    scope: z.string().describe("one sentence summary, max 20 words"),
    tags: z.array(z.string()).describe("3-5 lowercase kebab-case tags"),
    read_when: z.array(z.string()).describe("2-3 phrases starting with 'when you need to...'"),
  }),
  prompt: `Generate metadata for this note body: ${noteBody}`,
});
```

**On response:** Write fields into frontmatter YAML. Show `✨ Generated` confirmation.

---

## Feature 2 — Summarize Note → `scope:`

**Trigger:** Small `Summarize` button inline next to the `scope:` field

**System prompt:**
```
You are a precise summarizer. 
Return a single sentence, max 20 words. 
No quotes, no period at the end.
```

**On response:** Replace current `scope:` value in place.

---

## Feature 3 — Suggest Related Notes

**Trigger:** `🔗 Suggest` button next to the `related:` field

### Vault Index Strategy (Capped at 50 notes)
1. Tag-matched notes first.
2. Pad with recent notes.
3. Send only `title`, `tags`, and `scope`.

**Implementation:** Use `generateObject` to get an array of titles.

**On response:** Render suggestions as clickable pills. Click to append `[[WikiLink]]`.

---

## Feature 4 — Expand Idea

**Trigger:** Select text → context menu `✨ Expand` or slash command `/ai-expand`

**System prompt:**
```
You are a thinking partner. Expand the selected idea with depth and clarity.
Match the writer's existing tone. Return only the expanded text, no preamble.
```

**On response:** Insert expanded text **below** the selection with one blank line separator. Show subtle inline loader while waiting.

---

## Feature 5 — Fix / Improve Writing

**Trigger:** Select text → context menu `✨ Improve` or slash command `/ai-improve`

**System prompt:**
```
You are a writing editor. Improve clarity, flow, and conciseness.
Preserve the author's voice and meaning exactly.
Return only the rewritten text, nothing else.
```

**On response:** Replace selection in place immediately.

---

## Error States

- **No API key set**: "Add your API key in Settings to use AI features."
- **Invalid key**: "API key invalid. Check your key in Settings."
- **Network failure**: "Could not reach AI provider. Check your connection."

---

## Build Order

1. **Setup**: Install `ai`, `@ai-sdk/anthropic`, `@ai-sdk/google`, `zod`.
2. **Settings**: Implement provider selection and key storage.
3. **Core Service**: Build `ai.ts` module.
4. **Implementation**:
    - Summarize & Improve (Simple text)
    - Auto-fill Frontmatter (Structured object)
    - Related Notes (Context handling)
    - Expand Idea (Insertion logic)
