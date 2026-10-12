# WelcomeWizard

Description: Onboarding in two steps: 0, opening, creating, or connecting a vault (or **Skip** to write without one); 1, ready to write (the command palette shortcut and **Open Editor**). Name, look, layout, writing and AI keep their defaults and live in Settings. A step saved by an older, longer tour lands on the last step. First-run onboarding sets the text size to Medium (17px) unless a size is already stored; re-running the tour leaves it unchanged. Opening an existing vault keeps you in the editor, and the wizard moves on to the last step. Enter on the last step finishes. The Enter shortcut and the move to the last step on connecting a vault only run while the wizard shows, so a finished or hidden tour never reacts to Enter in the editor. Finishing or skipping with a vault open lands on the home feed (`atom_homeFeedOpen`), regardless of the "On vault open" setting.

## Local State & Storage
- State: `atom_userName`, `atom_isWizardOpen`, `atom_welcomeDeferred` (first-run display waits for the next visit when `/editor` opens with work from a tool page; opening the wizard on purpose still works), `atom_welcomeWizardStep`, `atom_hasCompletedOnboarding`, `atom_theme`, `atom_editorFontFamily`, `atom_renderedFontSize`, `atom_fullWidth`, `atom_lineNumbers`, `atom_vimMode`, `atom_flowMode`, `atom_autosaveMode`, `atom_sidebarOpen`, `atom_aiProvider`, `atom_claudeKey`, `atom_geminiKey`, `atom_vaultHandle`, `atom_githubVaultDialogOpen`, `useCreateVault`.
- Persistence: All preferences go to `localStorage` (for example `hasCompletedOnboarding`, `welcomeWizardStep`, `theme`, `hermes_claude_key`). The vault handle goes to IndexedDB.

## Dependencies
- Core: `DialogModal`, `Button`, and the step components in [`welcome-wizard/`](welcome-wizard/README.md), which own their settings atoms (the wizard itself only reads `atom_isWizardOpen`, `atom_welcomeWizardStep`, `atom_hasCompletedOnboarding`, `atom_vaultHandle`, and sets `atom_homeFeedOpen` on finish).
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
