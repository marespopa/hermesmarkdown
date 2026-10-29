# SkillWizard

Description: Creates or edits a vault-authored `type: skill` note from AI settings. It edits only known metadata, preserves other parsed frontmatter keys, exposes fixed tool/check allowlists, and stores the body as plain text. Saving an edit uses the companion write-through path (disk wins, private-note guard, undo grouping); creation uses the normal companion create path and refreshes the vault index.

## State and props
- Props: `open`, optional vault-relative `skillPath`, and `onClose`.
- `use-skill-wizard.ts` owns loading, draft fields, validation, save status and errors.
- Tool and check choices are application allowlists. No user-authored argv, imports or executable script fields exist.

## Save behavior
- Invalid names, empty instruction bodies, invalid bindings and malformed YAML fail before a write.
- Edits re-read the disk-backed text before saving, refuse private notes and use `useNoteBuffer` through `useCompanionWrites`; if the note changes after loading, saving stops so newer disk content is not overwritten.
- New skills are written as Markdown notes through the existing file layer.
