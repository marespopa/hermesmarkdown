# TemplateWizard

Description: The "New template" dialog (palette **New template…**, the Templates page's **New template**, or an example's **Start from this**, which opens it on `preset`). One screen, top to bottom:

- **Kind**: a segmented control, **Note** (starts one note; used with `/template` and New note from a link) or **Folder** (makes a whole folder of notes; used with New from folder template), with a one-line hint.
- **Name**: focused on open. Picking an example fills the name while it's empty or still the last example's name; a typed name is never replaced.
- **Start from**: a radio list. **Blank**, then the built-in examples of that kind ("Example · …"), then for a folder template **A folder in your vault…** (only with `canCopyFolder`; the folder is picked after Create).
- For a note template, **Pack**: No pack, one of `packs`, or **New pack…**, which shows a **New pack name** field (Create waits for a name). The chosen pack goes back as `pack`; a folder template has none (folder templates sit directly in `_templates/`).
- For a folder template, **Ask for the folder's name each time** (on by default): the new folder is named by the answer, or every new folder gets the template's name.
- **Create template** (primary, disabled until a name is in; Enter does the same) and **Cancel** (or Esc).

It only collects answers: `onSubmit` gets a `TemplateWizardResult` (`app/atoms/template-atoms.ts`), and `hooks/file-system/use-template-wizard.ts` writes the template.

## Local State & Storage
- State: kind, name, the name an example last filled in, the starting point, and the ask-for-the-name switch. They start from `preset` (its kind, its example and that example's name, its pack) when given. Also the pack choice and a new pack's name. Switching the kind resets the starting point to Blank.
- Persistence: None.

## Dependencies
- Core: `DialogModal` (mobile sheet), `Button` (`segment`, `menu-row`, `primary`, `secondary`), `Input`, `Select`, `Toggle`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<TemplateWizard
  isOpen
  noteExamples={[{ id: "builtin:meetings/Meeting notes", name: "Meeting notes" }]}
  folderExamples={[{ id: "project-folder", name: "Project folder" }]}
  canCopyFolder
  onSubmit={(result) => request.resolve(result)}
  onCancel={() => request.resolve(null)}
/>
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| isOpen | `boolean` | | Shows the dialog |
| preset | `TemplateWizardPreset` | | Opens on this kind and example (`{ kind, from: "example:<id>" }`), its name filled in |
| noteExamples | `TemplateWizardExample[]` | | Built-in note templates (`{ id, name, description? }`); chosen as `example:<id>` |
| folderExamples | `TemplateWizardExample[]` | | Built-in folder templates, the same way |
| canCopyFolder | `boolean` | | Offer "A folder in your vault…" |
| packs | `string[]` | `[]` | Your packs, offered for a note template (a preset pack is offered even when not listed) |
| onSubmit | `(result: TemplateWizardResult) => void` | | Kind, trimmed name, starting point and (folders) `askName` |
| onCancel | `() => void` | | Cancel or Esc |
