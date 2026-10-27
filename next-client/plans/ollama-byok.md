---
title: Ollama as a BYOK AI Provider Architecture & Implementation Plan
tags: [architecture, plan, ollama]
status: done
---

# Ollama as a BYOK AI Provider Architecture & Implementation Plan

## Context
AI features currently support `claude` and `gemini` via server routes (`/api/ai`, `/api/ai/companion`) that receive the user's key in the request body. Ollama can run in the cloud (Ollama Cloud, `https://ollama.com`, Bearer API key) or locally (`http://localhost:11434`, no key). Both expose an OpenAI-compatible `/v1` endpoint and a native model list at `/api/tags`.

The provider requires a **base URL** (default `https://ollama.com`) and an **optional key**. All path references below are under `next-client/`.

---

## Goals & Scope

### Goals
- Select **Ollama** in `Settings → AI`, input a base URL and optional key, and pick a model from the dynamically fetched tags list.
- Support companion chat (streaming, tool calls) and one-shot AI actions via Ollama.
- Full support for Ollama Cloud (Phase 1).
- Prepared architecture for browser-direct local instances (Phase 2).

### Non-Goals
- Other OpenAI-compatible providers (OpenAI, OpenRouter). (The provider factory is designed generically to accommodate them later).
- Web search integration for Ollama (remains Anthropic/Claude-only).

---

## Current State & Findings

- `app/api/ai/providers.ts`: `createAIModel(provider, apiKey, modelKey)` uses a hardcoded conditional for `claude` / `gemini`.
- `AIProvider` type is duplicated across `app/services/ai.ts` and `app/atoms/ai-atoms.ts`.
- Storage keys: `hermes_claude_key`, `hermes_gemini_key` in `ai-atoms.ts`. No base URL storage exists.
- `getAIConfig` (`app/services/ai.ts`) throws on missing key; uses ternary checks for default models repeated in `testAIConnection`.
- `atom_aiEnabled` and `atom_isAiConfigured` assume an API key is mandatory.
- `/api/ai` and `/api/ai/companion` enforce `apiKey` presence. The `models` action is Claude-centric.
- `provider !== 'gemini'` assumptions in `companion/route.ts` and `use-companion-chat.ts` wrongly treat any non-Gemini provider as Claude (enabling prompt caching and web search).
- Settings UI (`AiSettings.tsx`) assumes fixed provider options and required API keys.

---

## Detailed Design & Implementation Steps

### 1. Types & State Management
- [x] Consolidate `AIProvider` type definition: export `export type AIProvider = 'claude' | 'gemini' | 'ollama'` in `app/atoms/ai-atoms.ts` and import in `app/services/ai.ts`.
- [x] Add `hermes_ollama_key` (persisted via `atomWithStorage`, optional) to `ai-atoms.ts`.
- [x] Add `hermes_ollama_base_url` (persisted via `atomWithStorage`, default `'https://ollama.com'`) to `ai-atoms.ts`.
- [x] Add `atom_availableOllamaModels` (non-persisted array) to `app/atoms/ui-atoms.ts`.
- [x] Update `atom_aiEnabled` and `atom_isAiConfigured` so Ollama is marked valid as long as a valid `baseUrl` is set (even if `apiKey` is empty).

### 2. Provider Configuration & Defaults
- [x] Update `getAIConfig`: For Ollama, return `{ provider, apiKey, baseUrl, model }` without throwing if `apiKey` is empty.
- [x] Replace binary ternary model selections with a per-provider configuration table.
- [x] Handle empty model fallback: If no model is set for Ollama, fall back to the first available model from `atom_availableOllamaModels`, or an empty string prompting the user to select/pull a model.

### 3. Server Provider Factory (`providers.ts`)
- [x] Add `@ai-sdk/openai-compatible` dependency to `package.json`.
- [x] Refactor `createAIModel` to accept an options object `{ provider, apiKey, baseUrl, model }`.
- [x] Add Ollama construction logic:

```typescript
  createOpenAICompatible({
    name: 'ollama',
    baseURL: `${baseUrl.replace(/\/+$/, '')}/v1`,
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {}
  })
```

### 4. Route Updates & Behavior Normalization

- [x] Accept `baseUrl` in request payloads for `/api/ai` and `/api/ai/companion`.
- [x] Update key enforcement: Require `apiKey` ONLY when `provider !== 'ollama'`.
- [x] Update `models` action in `route.ts`: For Ollama, issue a `GET ${baseUrl}/api/tags` request (passing Bearer auth if provided) and map response tags to `{ id: name, label: name }`.
- [x] Update companion route & hooks:
  - [x] Fold system prompts for Ollama (matching Gemini behavior).
  - [x] Explicitly disable prompt caching and web search for Ollama.
  - [ ] Update provider guards: Change `provider !== 'gemini'` checks to `provider === 'claude'` in `companion/route.ts` and `use-companion-chat.ts`. (`use-companion-chat.ts` had no provider check; only the route needed it)

### 5. SSRF Security Guard (`app/api/ai/base-url.ts`)

- [x] Create `app/api/ai/base-url.ts` to validate user-defined base URLs.
- [x] Enforce `https:` protocol requirement for non-loopback hosts.
- [x] Resolve hostnames to IPs via DNS and reject loopback (`127.0.0.0/8`, `::1`), private networks (RFC 1918), link-local (`169.254.0.0/16`), and internal TLDs (`.local`, `.internal`).
- [x] Add environment variable override check (`process.env.ALLOW_PRIVATE_AI_BASE_URL === 'true'`) to permit private setups when configured.

### 6. Phase Separation & Local Instances

- [x] **Phase 1 (Cloud & Proxied Hosted)**: Route requests through application API routes with SSRF validation using default URL `https://ollama.com`.
- [x] **Phase 2 (Browser-Direct Local Execution)**:
  - [x] Bypass server API routes for local loopback/private IP configurations. — model list and connection test in `app/services/ai.ts`; one-shot actions and companion chat in `app/services/ollama-direct.ts` (the companion's `fetch` is wrapped so local requests are answered in the browser).
  - [x] Execute directly from the browser using `createOpenAICompatible` and custom client-side `useChat` transport.
  - [x] Display notice regarding `OLLAMA_ORIGINS` setup requirements for local CORS handling.

### 7. Settings UI & Error UX

- [x] Update `AiSettings.tsx`:
  - [x] Add `ollama` to `PROVIDERS` list and selector component.
  - [x] Render input fields: Base URL (text input), API Key (optional password input), Model Selector (dropdown).
  - [x] Add "Reset URL" secondary action button alongside "Remove Key".
  - [x] Handle empty states: Show clear guidance ("No models found—pull a model first") if `/api/tags` returns an empty array.
- [x] Update `beautifyAIError` in `ai.ts`:
  - [x] Map `404 Not Found` → "Model not found. Verify the model name or pull it first."
  - [x] Map Blocked IP / SSRF → "Base URL restricted for security reasons."
  - [x] Map Connection failures → "Unable to reach Ollama endpoint. Check the base URL and CORS configuration."

## File Changes Summary

- [x] `app/atoms/ai-atoms.ts` (State definitions & atoms)
- [x] `app/atoms/ui-atoms.ts` (Ollama models atom)
- [x] `app/services/ai.ts` (Config resolver, model fallbacks, error beautifier)
- [x] `app/api/ai/providers.ts` (Factory update with `@ai-sdk/openai-compatible`)
- [x] `app/api/ai/base-url.ts` *(New file for SSRF validation)*
- [x] `app/api/ai/route.ts` (Route guards & tag fetching)
- [x] `app/api/ai/companion/route.ts` (Companion route guards & system folding)
- [x] `app/editor/settings/sections/AiSettings.tsx` (Settings UI section and handlers)
- [x] `app/editor/components/ai-chat/use-chat-models.ts` & `chat-helpers.ts` (Model list resolution)
- [x] `app/editor/components/companion/use-companion-chat.ts` (Provider flag updates)
- [x] `package.json` (Addition of `@ai-sdk/openai-compatible`)

## Verification Strategy

### Automated Tests

- [x] `base-url.test.ts`: Validate public HTTPS approval, loopback rejection, private IP rejection, and `ALLOW_PRIVATE_AI_BASE_URL` override.
- [x] `route.test.ts`: Test Ollama model list mapping without an API key.
- [x] `companion/route.test.ts`: Verify system prompt folding and search guard behavior for Ollama.
- [x] `AiSettings.test.tsx`: Test form inputs, optional key handling, and URL resets.

### Manual Verification

- [x] Execute `typecheck` across the workspace.
- [x] Test Ollama Cloud connection with key in Settings → AI.
- [x] Verify dynamic model list fetching and selection.
- [x] Test streaming companion chat and tool calls with an active Ollama model.
- [x] Validate error display on invalid key, restricted SSRF URL, or missing model.