# TemplateExamples

Description: The built-in examples on the Templates page, under **Examples**: the two note examples (`STARTER_TEMPLATES`: Meeting notes, Project brief) then the two folder examples (`BUILTIN_FOLDER_TEMPLATES`: Project folder, Research folder). A row each: an icon, the name, "Note · " with its description or "Folder · " with the notes it makes, and **Start from this** (filled, so it reads as a button), which calls `onStart` with a `TemplateWizardPreset` (`{ kind, from: "example:<id>" }`) so the page opens the template wizard on it. The template made is the user's own copy. Also rendered, disabled, by the Templates route skeleton.

## Local State & Storage
- State: None. The list is static data built once.
- Persistence: None.

## Dependencies
- Core: `Button`, `TemplateIcon`, `STARTER_TEMPLATES` (`utils/templates/template-packs.ts`), `BUILTIN_FOLDER_TEMPLATES` (`utils/templates/template-folders.ts`), `TemplateWizardPreset` (`atoms/template-atoms.ts`).
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import TemplateExamples from "@/app/editor/templates/components/TemplateExamples";

<TemplateExamples onStart={(preset) => void newTemplate(preset)} disabled={!vaultHandle} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| onStart | `(preset: TemplateWizardPreset) => void` |  | Open the template wizard on this example |
| disabled | `boolean` | `false` | Without a vault there is nowhere to make a template; the page also sets it while the wizard is open |
| pending | `string` |  | The `from` of the example the wizard was opened on: that button spins |
