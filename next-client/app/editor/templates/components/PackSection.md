# PackSection

Description: One of your template packs on the Templates page: the pack's name (or "Loose templates" for the templates directly in `templates/`) and its count, with **New** (a template in this pack), **Duplicate** (disabled when empty) and **Delete** (not for the loose templates, which aren't a folder of their own). Below, a row per template: its icon, name and path, and **Edit**. Templates are used from a note (`/template`), not from here. An empty pack says so. The section is a region named after the pack. Also exports `SMALL_BUTTON_CLASS`, the page's small text-button style.

## Local State & Storage
- State: None (the page owns the pack list and the actions).
- Persistence: None.

## Dependencies
- Core: `Button`, `TemplateIcon`, `TemplatePack` / `TemplateEntry` from `app/utils/templates/template-registry.ts`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import PackSection from "@/app/editor/templates/components/PackSection";

<PackSection pack={pack} onEdit={edit} onNewTemplate={newTemplate} onDuplicate={duplicatePack} onDelete={deletePack} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| pack | `TemplatePack` |  | The pack (`name` "" for loose templates), its folder and templates |
| onEdit | `(template) => void` |  | Open the template file |
| onNewTemplate | `(pack) => void` |  | New template in this pack |
| onDuplicate | `(pack) => void` |  | Copy the pack into a new one |
| onDelete | `(pack) => void` |  | Move the pack to the Trash |
