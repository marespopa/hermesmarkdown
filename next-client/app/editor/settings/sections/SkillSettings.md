# SkillSettings

Description: Lists vault notes of type `skill` and launches the create/edit `SkillWizard`. The component is the primary entry point in AI settings and remains available when AI features are off.

## State and props
- No props; reads `atom_fileMetadata` and keeps the selected path / modal visibility locally.
- An empty index shows an empty state; paths are sorted and use the note name.
- Saves are performed by `useSkillWizard`, not the list.
