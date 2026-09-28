# welcome-wizard

Steps of [`WelcomeWizard`](../WelcomeWizard.md). Each step reads and writes its own settings atoms; the wizard only tracks which step is showing.

| File | Step(s) |
|---|---|
| `WizardStep.tsx` | Shared layout (`WizardStep`: icon, title, description, control, Continue) and the bordered `WizardPanel`. |
| `NameStep.tsx` | 0 — your name (`atom_userName`, optional, trimmed), used by the home feed's "Welcome, <name>!". Enter continues. |
| `VaultStep.tsx` | 1 — create a vault, open an existing folder, use a browser vault, or connect GitHub (shows `CreateVaultSubSteps` during creation). Without disk folder access only the browser vault and GitHub options show. |
| `PreferenceSteps.tsx` | 2–8 — theme, font, text size, line numbers, Vim mode, flow mode, autosave. |
| `AiKeyStep.tsx` | 9 — optional AI provider and key, with a connection test. |
| `ReadyStep.tsx` | 10 — command palette hint and "Open Editor". |
