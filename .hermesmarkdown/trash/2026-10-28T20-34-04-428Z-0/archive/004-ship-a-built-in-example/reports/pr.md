## Built-in Project folder template

- The Templates page has a Folder templates section after the packs with a Project folder card (Add to vault / Adding… / Added). It is offered, never auto-installed.
- Adding writes `_templates/{{prompt:Project name}}/` (README with `scaffold: true`, Tasks, Decisions, Meetings/Kickoff). Existing files are never replaced; bodies stay raw.
- Using it asks for the Project name and creates a folder with that name.
- `addBuiltinPack` now accepts nested file names; `BuiltinPack` gained an optional `displayName`; content lives in `utils/templates/template-folders.ts`.
