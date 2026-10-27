# FolderTemplateList

Description: Your folder templates on the Templates page (folders in `_templates/` whose README.md has `scaffold: true`, from `atom_folderTemplates`), after the packs. A region named "Folder templates" with the count, then a row per template: a folder icon, its name as people read it (`folderTemplateDisplayName`: `{{Research topic}}` shows as "Research topic", other fields filled in for today), a line saying it asks for the new folder's name (when its name has a prompt, `namePromptLabels`; else its folder path), **Edit** (opens its README) and **Delete** (moves the whole folder to the Trash, after asking). While a row's action runs (`pendingOf`), its buttons are disabled and the clicked one spins. The page renders it only when there is at least one.

## Local State & Storage
- State: None (the page owns the list and the actions).
- Persistence: None.

## Dependencies
- Core: `Button`, `FolderTemplate` (`app/utils/templates/template-registry.ts`), `folderTemplateDisplayName` / `namePromptLabels` (`app/utils/templates/folder-template.ts`).
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import FolderTemplateList from "@/app/editor/templates/components/FolderTemplateList";

<FolderTemplateList templates={folderTemplates} onEdit={(t) => open(t.readmePath)} onDelete={deleteFolderTemplate} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| templates | `FolderTemplate[]` |  | The vault's folder templates |
| onEdit | `(template) => void` |  | Open the template's README |
| onDelete | `(template) => void` |  | Move the template's folder to the Trash |
| pendingOf | `(template) => string \| undefined` | none | The action under way on a row: `"edit"` or `"delete"` |
