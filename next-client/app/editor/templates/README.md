# editor/templates

The Templates page (`/editor/templates`). See "Templates page" in [../README.md](../README.md).

| File | Purpose |
|---|---|
| `page.tsx` | The page, about the templates you make: **New template** (primary: the template wizard, `newTemplate()`; a note or a folder template, blank, from an example or, for a folder, from a vault folder; a note template can go in a pack, an existing one or a new one named there: there is no New pack button); your templates by pack (Edit, New, Duplicate, Delete; a pack's own New opens the wizard on that pack, `newTemplate({ kind: "note", pack })`), then your folder templates (folders in `_templates/` whose README.md has `scaffold: true`, not packs); an empty state pointing at New template; then **Examples** (two notes, two folders), each opening the wizard on it (`newTemplate(preset)`). The editor shows what the wizard made; a cancelled wizard stays on the page. Every action runs once at a time per item (`use-pending-actions.ts`): the item's buttons are disabled and the clicked one spins (after ~150 ms) until it settles, so Duplicate, Delete and the rest can't run twice. The title bar's help icon (`ShellPage`'s `help`) links to `/documentation#templates-page`. Scans the vault once when opened directly with nothing indexed. |
| `use-pending-actions.ts` | `run(scope, action, work)` (ignores a click while that scope is busy, even before the re-render) and `pendingAction(scope)`. Scopes: `pack:<folder>`, `template:<path>`, `folder:<folder>`, `wizard` (New template and every example). |
| [ActionButton](components/ActionButton.md) | A page action button with a pending state (disabled, delayed spinner). |
| [PackSection](components/PackSection.md) | One of your packs and its templates. |
| [FolderTemplateList](components/FolderTemplateList.md) | Your folder templates, with Edit and Delete. |
| [TemplateExamples](components/TemplateExamples.md) | The built-in examples, each with Start from this. |
