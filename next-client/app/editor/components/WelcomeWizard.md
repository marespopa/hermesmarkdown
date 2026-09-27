# WelcomeWizard

Description: Eight-step onboarding that covers opening, creating, or connecting a vault, then theme, fonts, editor options, autosave, optional AI key, and shortcuts.

## Local State & Storage
- State: `atom_isWizardOpen`, `atom_welcomeWizardStep`, `atom_hasCompletedOnboarding`, `atom_theme`, `atom_editorFontFamily`, `atom_renderedFontSize`, `atom_lineNumbers`, `atom_vimMode`, `atom_autosaveMode`, `atom_aiProvider`, `atom_claudeKey`, `atom_geminiKey`, `atom_vaultHandle`, `atom_githubVaultDialogOpen`, `useCreateVault`.
- Persistence: All preferences go to `localStorage` (for example `hasCompletedOnboarding`, `welcomeWizardStep`, `theme`, `hermes_claude_key`). The vault handle goes to IndexedDB.

## Dependencies
- Core: `DialogModal`, `Button`, and the step components in [`welcome-wizard/`](welcome-wizard/README.md), which own their settings atoms (the wizard itself only reads `atom_isWizardOpen`, `atom_welcomeWizardStep`, `atom_hasCompletedOnboarding`, `atom_vaultHandle`).
- Network: The optional AI step's "Test connection" button calls `testAIConnection` → `/api/ai`, using the user's key. Everything else is local. No telemetry.

## Quick Usage
```tsx
import WelcomeWizard from "./components/WelcomeWizard";

<WelcomeWizard /> // shown while atom_isWizardOpen is true
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) |  |  | Takes no props |
