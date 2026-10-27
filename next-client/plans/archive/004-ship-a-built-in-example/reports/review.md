## Review 1

**Verdict:** Approve with nits

**Checks:** Deferred to CI.

**Brief coverage**
- Card in a "Folder templates" section after the packs, reusing BuiltinPackCard: done (`app/editor/templates/page.tsx`, `components/BuiltinPackCard.tsx`).
- Add to vault, Adding…, Added states: done (shared card; `page.test.tsx` covers Added).
- No overwrite: done. `use-template-packs.ts` skips existing files and creates nested folders.
- Contents: done. README has `scaffold: true` and `# {{prompt:Project name}}` with Goal/Scope/Milestones. Tasks has unchecked tasks. Decisions uses `{{date}}`. Meetings/Kickoff has Agenda/Decisions/Action items. All bodies are raw. Sample data has no person names.
- Created folder named from the Project name prompt: done. The template folder is `{{prompt:Project name}}`, and `template-folders.test.ts` runs `planScaffold` and checks `topName === "Mobile app"`.
- Content in `app/utils/templates/template-folders.ts` (76 lines): done.
- Tests: card state, write without overwrite, plan and presence are covered.
- Docs: done. Updated the templates README, the utils README, BuiltinPackCard.md and the user docs (`app/documentation/content/templates.tsx`).
- Scope: no scope creep.

**Findings**
- Minor: the on-disk folder is literally `{{prompt:Project name}}`, which contains `:`. The local backend on Windows rejects `:` in folder names, so Add to vault would show the "Couldn't add" toast there. Linux, macOS and OPFS are fine. The brief requires this naming, so this is only a possible follow-up.
- Minor: `BuiltinPackCard.tsx` builds the region name with an inline ternary. The page test uses the odd name "Project folder folder template". It works, but it is awkward.

**Tests & docs gaps:** none that block approval.
