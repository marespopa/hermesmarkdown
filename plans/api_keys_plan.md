# Implement User-Supplied API Keys

This document evaluates and plans the implementation of the user-supplied API key proposal in HermesMarkdown, supporting Gemini and Claude for local, direct-to-provider AI features.

## User Review Required

> [!WARNING]
> **Anthropic CORS Limitation**: While the plan proposes direct **browser → provider API** requests to ensure keys never leave the device, Anthropic's API currently enforces strict CORS policies. It does not return `Access-Control-Allow-Origin: *` headers for standard browser origins. 
> 
> *Impact*: Direct fetches to `api.anthropic.com` from a web browser will fail due to CORS errors. 
> *Solution Options*: 
> 1. Use **Gemini** as the primary engine (Google's API fully supports native browser CORS).
> 2. For Claude, provide an optional lightweight open-source proxy (e.g., a Cloudflare Worker) that users can deploy themselves, or we host a proxy that *only* forwards requests without logging.
> 3. Only support Claude in desktop/electron wrapper environments where CORS does not apply.
> 
> **Are you okay with starting with Gemini as the fully supported browser-native option, and adding a proxy requirement or desktop-only restriction for Claude?**

## Open Questions

- **Session-only Mode**: For the "session-only" key storage, should we provide a toggle in the UI next to the key input that dictates whether it saves to `localStorage` or just application memory?
- **Readability Score**: The plan mentions an "existing AI readability score hover panel" but I only see word/char count stats in the codebase. Does this hover panel already exist in another branch, or should it be built as part of Phase 3?

## Proposed Changes

### 1. State Management (Jotai)

We will leverage `jotai/utils` to securely store API keys in the browser's `localStorage` (or memory for session-only).

#### [MODIFY] [ui-atoms.ts](file:///data/data/com.termux/files/home/projects/hermesmarkdown/next-client/app/atoms/ui-atoms.ts)
- Add `atom_geminiKey` and `atom_claudeKey` using `atomWithStorage` (and session-only variants).
- Add `atom_activeAiProvider` ("gemini" | "claude").
- Add `atom_fallbackAiProvider` ("gemini" | "claude" | "none").
- Add `atom_aiSessionOnly` to control storage persistence.
- Add `atom_aiModelConfig` to store the active model selection.

### 2. Provider Abstraction Layer

We will build the `AIProvider` interface as specified in the plan, isolating the rest of the application from the specific provider logic.

#### [NEW] [services/ai/AIProvider.ts](file:///data/data/com.termux/files/home/projects/hermesmarkdown/next-client/app/services/ai/AIProvider.ts)
- Define `interface AIProvider { name: string; complete(prompt: string, context?: string): Promise<string>; isConfigured(): boolean; testKey(key: string): Promise<boolean>; }`

#### [NEW] [services/ai/GeminiProvider.ts](file:///data/data/com.termux/files/home/projects/hermesmarkdown/next-client/app/services/ai/GeminiProvider.ts)
- Implement `AIProvider` using the `@google/generative-ai` SDK (or direct REST) which natively supports CORS.

#### [NEW] [services/ai/ClaudeProvider.ts](file:///data/data/com.termux/files/home/projects/hermesmarkdown/next-client/app/services/ai/ClaudeProvider.ts)
- Implement `AIProvider` for Anthropic (with caveats for CORS as noted above).

#### [NEW] [services/ai/AIManager.ts](file:///data/data/com.termux/files/home/projects/hermesmarkdown/next-client/app/services/ai/AIManager.ts)
- A factory/manager that reads the active Jotai atoms and returns the configured `AIProvider`. It handles the fallback logic (e.g., trying the fallback provider if the primary one throws an error).

### 3. Settings UI

We will add a new "AI" section to the existing Settings modal.

#### [MODIFY] [app/editor/settings/page.tsx](file:///data/data/com.termux/files/home/projects/hermesmarkdown/next-client/app/editor/settings/page.tsx)
- Add an "AI" section to the sidebar navigation.
- Implement the Key Storage UI: Password-masked inputs for Claude and Gemini keys, a "Test" button that fires a minimal ping request, and a "Clear" button.
- Implement Model Selection dropdowns (e.g., `gemini-2.0-flash`, `claude-3-5-haiku`).
- Add the onboarding copy about privacy.

### 4. Phase 1 Features

#### [NEW] [app/editor/components/InlineAIEditor.tsx](file:///data/data/com.termux/files/home/projects/hermesmarkdown/next-client/app/editor/components/InlineAIEditor.tsx)
- A floating action menu triggered by text selection (right-click or hotkey).
- Offers quick actions: *Fix grammar*, *Make concise*, *Expand*, *Change tone*.
- Presents a diff view for the user to accept/reject before modifying the editor content.

## Verification Plan

### Automated Tests
- Create `AIManager.test.ts` to verify the fallback logic works when a provider fails.
- Create `SettingsAI.test.tsx` to verify key inputs correctly update Jotai atoms and trigger the `Test` function.
- Create tests for `InlineAIEditor` to ensure the diff viewer behaves correctly.

### Manual Verification
- Enter a valid Gemini key and test the inline edit feature.
- Verify that `localStorage` correctly obfuscates/masks the keys in the UI after saving.
- Confirm that when "session-only" is enabled, refreshing the page clears the key.
