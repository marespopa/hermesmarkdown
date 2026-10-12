# welcome-wizard

Steps of [`WelcomeWizard`](../WelcomeWizard.md). Each step reads and writes its own settings atoms; the wizard only tracks which step is showing.

| File | Step(s) |
|---|---|
| `WizardStep.tsx` | Shared layout (`WizardStep`: icon, title, description, control, Continue). |
| `VaultStep.tsx` | 0 — create a vault, open an existing folder, use a browser vault, or connect GitHub (shows `CreateVaultSubSteps` during creation). Without disk folder access only the browser vault and GitHub options show. |
| `ReadyStep.tsx` | 1 — command palette hint and "Open Editor". |
