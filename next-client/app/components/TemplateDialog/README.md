# TemplateDialog

The dialogs vault templates need, driven by `atom_templateDialog` (`app/atoms/template-atoms.ts`) through the promise hook `useTemplateDialog()` (`app/hooks/use-template-dialog.ts`).

| Component | Role |
|---|---|
| [TemplateDialogHost](TemplateDialogHost.md) | Mounted once in `MainPage`; renders the open request as a template picker, the starter picker ("New template…") or a prompts form. |
| [TemplatePicker](TemplatePicker.md) | Searchable, keyboard-navigable list of templates or starters (icons, summaries, ⌘1…9, preview pane), with an optional "Blank note" row. |
| [TemplatePreview](TemplatePreview.md) | Read-only preview of the note a template makes. |
| [TemplateIcon](TemplateIcon.md) | Monochrome icon picked from a template's name. |
| [TemplatePromptForm](TemplatePromptForm.md) | "Fill in the template": one input per `{{prompt:Label}}`. |
