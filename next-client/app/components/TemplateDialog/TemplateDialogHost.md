# TemplateDialogHost

Description: Renders the open template request from `atom_templateDialog`: a `TemplatePicker` of vault templates (`kind: "pick"`), a `TemplatePicker` of `TEMPLATE_STARTERS` titled "New template" (`kind: "starter"`), or a `TemplatePromptForm` (`kind: "prompts"`). Each request gets a fresh dialog (empty search and fields), even when two arrive back to back. Requests come from `useTemplateDialog()` (`pickTemplate`, `pickStarter`, `askPrompts`), used by `/template`, missing-link creation, "New note from template…" and "New template…".

## Local State & Storage
- State: reads `atom_templateDialog`, `atom_templates` and `atom_templatesFolder`; a ref maps each request to a React key. When a template picker opens, every template's text is read (`readTemplate`, failures become empty) for the picker's summaries and preview; starters pass their bodies directly. **Edit** in the template picker cancels the request and opens the template's file (fresh handle, `useOpenFile`).
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
const starter = await pickStarter(); // TemplateStarter | null
const values = await askPrompts(["Owner"], "Create"); // Record<string, string> | null
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) | | | Reads its request from the atom |
