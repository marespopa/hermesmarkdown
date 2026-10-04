# TemplatesFolderSetting

Description: Settings → Files → **Templates Folder**, saved per vault. Every `.md` file directly in this folder is a template. Empty uses the first existing folder of `templates`, `_templates`, `Templates`; the placeholder shows the folder in use. The value is normalized on blur (`normalizeFolderPath`); a path with a dot-prefixed segment (`.hermes/tpl`) is rejected with an inline hint, because dot folders aren't indexed. Clearing the field removes the vault's entry. Disabled without an open vault.

## Local State & Storage
- State: the typed text while editing and the validation hint; reads `atom_vaultKey`, `atom_templatesFolder`.
- Persistence: `atom_templateFolderSettings` → `localStorage["hermes_template_folders"]` (`vaultKey → folder`).

## Dependencies
- Core: `SettingItem`, `BareInput`, `normalizeFolderPath`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<TemplatesFolderSetting />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) | | | Reads and writes its atoms directly |
