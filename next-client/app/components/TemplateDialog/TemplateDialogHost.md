# TemplateDialogHost

Description: Renders the open template request from `atom_templateDialog`: a `TemplatePicker` (`kind: "pick"`) or a `TemplatePromptForm` (`kind: "prompts"`). Each request gets a fresh dialog (empty search and fields), even when two arrive back to back. Requests come from `useTemplateDialog()` (`pickTemplate`, `askPrompts`), used by `/template`, missing-link creation and "New note from template…".

## Local State & Storage
- State: reads `atom_templateDialog`, `atom_templates` and `atom_templatesFolder`; a ref maps each request to a React key.
- Persistence: None - the request atom is ephemeral.

## Dependencies
- Core: `TemplatePicker`, `TemplatePromptForm`, Jotai.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
// MainPage, next to <GlobalDialog />
<TemplateDialogHost />

// anywhere
const { pickTemplate, askPrompts } = useTemplateDialog();
const entry = await pickTemplate({ includeBlank: true, title: "New note" }); // TemplateEntry | "blank" | null
const values = await askPrompts(["Owner"], "Create"); // Record<string, string> | null
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) | | | Reads its request from the atom |
