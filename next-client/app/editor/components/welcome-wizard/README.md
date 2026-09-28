# welcome-wizard

Steps of [`WelcomeWizard`](../WelcomeWizard.md). Each step reads and writes its own settings atoms; the wizard only tracks which step is showing.

| File | Step(s) |
|---|---|
| `WizardStep.tsx` | Shared layout (`WizardStep`: icon, title, description, control, Continue) and the bordered `WizardPanel`. |
| `VaultStep.tsx` | 0 — create a vault, open an existing folder, use a browser vault, or connect GitHub (shows `CreateVaultSubSteps` during creation). Without disk folder access only the browser vault and GitHub options show. |
| `PreferenceSteps.tsx` | 1–7 — theme, font, text size, line numbers, Vim mode, flow mode, autosave. |
| `AiKeyStep.tsx` | 8 — optional AI provider and key, with a connection test. |
| `ReadyStep.tsx` | 9 — command palette hint and "Open Editor". |
