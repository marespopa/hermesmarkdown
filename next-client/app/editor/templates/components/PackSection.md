# PackSection

Description: One of your template packs on the Templates page: the pack's name (or "Not in a pack", `NO_PACK_TITLE`, for the templates directly in `_templates/`) and its count, with **New** (the template wizard, opened on this pack), **Duplicate** (disabled when empty) and **Delete** (not for the templates in no pack, which aren't a folder of their own). Below, a row per template: its icon, name and path, **Edit** and **Delete** (moves just that file to the Trash). Templates are used from a note (`/template`), not from here. An empty pack says so. The section is a region named after the pack. While a pack action runs (`pending`), all three pack buttons are disabled and the clicked one spins; a template row does the same with `templatePending`, and a pack being deleted disables its rows too. Buttons are [ActionButton](ActionButton.md)s.

## Local State & Storage
- State: None (the page owns the pack list and the actions).
- Persistence: None.

## Dependencies
- Core: `Button`, `TemplateIcon`, `TemplatePack` / `TemplateEntry` from `app/utils/templates/template-registry.ts`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import PackSection from "@/app/editor/templates/components/PackSection";

<PackSection pack={pack} onEdit={edit} onNewTemplate={newTemplate} onDuplicate={duplicatePack} onDelete={deletePack} onDeleteTemplate={deleteTemplate} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| pack | `TemplatePack` |  | The pack (`name` "" for the templates in no pack), its folder and templates |
| onEdit | `(template) => void` |  | Open the template file |
| onNewTemplate | `(pack) => void` |  | New template in this pack |
| onDuplicate | `(pack) => void` |  | Copy the pack into a new one |
| onDelete | `(pack) => void` |  | Move the pack to the Trash |
| onDeleteTemplate | `(template) => void` |  | Move one template to the Trash |
| pending | `string` |  | The pack action under way: `"new"`, `"duplicate"` or `"delete"` |
| templatePending | `(template) => string \| undefined` | none | The action under way on a template: `"edit"` or `"delete"` |
