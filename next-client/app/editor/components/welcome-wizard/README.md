# welcome-wizard

Steps of [`WelcomeWizard`](../WelcomeWizard.md). Each step reads and writes its own settings atoms; the wizard only tracks which step is showing.

| File | Step(s) |
|---|---|
| `WizardStep.tsx` | Shared layout (`WizardStep`: icon, title, description, control, Continue) and the bordered `WizardPanel`. |
| `VaultStep.tsx` | 0 — create a vault, open an existing folder, or connect GitHub (shows `CreateVaultSubSteps` during creation). |
| `PreferenceSteps.tsx` | 1–6 — theme, font, text size, line numbers, Vim mode, autosave. |
| `AiKeyStep.tsx` | 7 — optional AI provider and key, with a connection test. |
| `ReadyStep.tsx` | 8 — command palette hint and "Open Editor". |
