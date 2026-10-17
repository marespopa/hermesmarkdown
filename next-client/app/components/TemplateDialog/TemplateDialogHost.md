# TemplateDialogHost

Description: Renders the open template request from `atom_templateDialog`: a `TemplatePicker` of vault templates (`kind: "pick"`, with its `preselect` passed on) or a `TemplatePromptForm` (`kind: "prompts"`). Each request gets a fresh dialog (empty search and fields), even when two arrive back to back. Requests come from `useTemplateDialog()` (`pickTemplate`, `askPrompts`), used by `/template`, missing-link creation and the WikiLink dialog's From template.

## Local State & Storage
- State: reads `atom_templateDialog`, `atom_templates` and `atom_templatesFolder`; a ref maps each request to a React key. When a template picker opens, every template's text is read (`readTemplate`, failures become empty) for the picker's summaries and preview, each shown as it arrives. A picked vault template resolves with its already-read text as `body`, so `readTemplate` doesn't read the file a second time (behind the other reads) before inserting it. **Edit** in the template picker cancels the request and opens the template's file (fresh handle, `useOpenFile`).
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
const entry = await pickTemplate({ includeBlank: true, title: "New note", preselect: suggested }); // TemplateEntry | "blank" | null
const values = await askPrompts(["Owner"], "Create"); // Record<string, string> | null
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) | | | Reads its request from the atom |
