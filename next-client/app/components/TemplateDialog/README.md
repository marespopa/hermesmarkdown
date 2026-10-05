# TemplateDialog

The dialogs vault templates need, driven by `atom_templateDialog` (`app/atoms/template-atoms.ts`) through the promise hook `useTemplateDialog()` (`app/hooks/use-template-dialog.ts`).

| Component | Role |
|---|---|
| [TemplateDialogHost](TemplateDialogHost.md) | Mounted once in `MainPage`; renders the open request as a template picker, the starter picker ("New template…") or a prompts form. |
| [TemplatePicker](TemplatePicker.md) | Searchable, keyboard-navigable list of templates or starters, with an optional "Blank note" row. |
| [TemplatePromptForm](TemplatePromptForm.md) | "Template fields": one input per `{{prompt:Label}}`. |
