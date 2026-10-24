# Make template fields discoverable while authoring a template

## Context
The template engine is solid (`app/utils/templates/template-tokens.ts`: `{{date}}`, `{{title}}`, `{{prompt:Label}}`, `{{cursor}}`…), but nothing in the editor tells you which fields exist or how to add them. The only references are the docs page and the starter text. Writing a template means guessing token names, and typing them by hand is actually broken: `shortcode-expand.ts` rewrites `{date}` / `{time}` as you type, so `{{date}}` turns into `{2026-10-05}` on the first `}`.

Goal: inside a template note (a direct `.md` child of the templates folder), you can find, insert and check every field without leaving the editor. The user chose the in-editor helper plus a thin strip on the sheet.

## Changes

### 0. Branch setup (first)
- `git fetch origin` and check out `trunk`, then `git pull --ff-only`. origin/trunk moved to `0ed520ca`; the current branch `release/6.2.0-version` has one commit not on trunk, so confirm that commit is already in trunk before leaving it.
- `git checkout -b release/6.2.1` from the updated trunk. This follows the patch-bump pattern of the existing `release/6.1.x` branches.
- Bump `next-client/package.json` 6.2.0 → 6.2.1 with the repo's `scripts/bump-version.mjs` (`npm run version` in next-client; read the script first for its arguments), and commit "Bump version to 6.2.1".
- When the release PR to trunk is opened later, add the `release` label.

### 1. Fix shortcode clobbering `{{date}}` / `{{time}}`
`app/editor/codemirror/shortcode-expand.ts` → in the SHORTCODES loop, skip a `{…}` code when the character before it is `{`. This applies in every note, since `{{date}}` is never meant as a shortcode. Add a case to `shortcode-expand.test.ts`.

### 2. One field catalogue, shared everywhere
`app/utils/templates/template-lint.ts`: export `TOKEN_DESCRIPTIONS`, which is already keyed by `TEMPLATE_TOKENS`. Add a pure helper (new `template-fields.ts` next to it, or in the same file) named `templateFieldOptions(doc, now)` that returns ordered entries `{ insert, label, detail, example }`:
- the prompt labels already in the doc (reuse `extractPromptLabels`) → `{{prompt:Owner}}`, detail "same answer as the other Owner fields"
- `prompt:…` → inserts `{{prompt:}}` with the caret before `}}`, detail "asks for a value when used"
- each `TEMPLATE_TOKENS` entry, with its description and a live example from `expandTemplate` (for example, date → 2026-10-05)

Add unit tests.

### 3. `{{` autocomplete in template notes
New `app/editor/codemirror/template-field-completion.ts`, a CM completion source. It triggers when the text before the caret matches `/\{\{\s*([\w:]*)$/`, filters options by prefix (case-insensitive), and replaces from `{{` through any `}}` already after the caret, so braces never double. It is gated by a ref `{ current: boolean }` (`isTemplateNoteRef`), because extensions are built once.
- Wire it into `autocompletion({ override: [...] })` in `app/editor/codemirror/extensions.ts` next to `createSlashMenuSource`. Pass the ref through `BuildExtensionsOptions`.
- In `MarkdownEditor.tsx`, compute `isTemplateNote = isTemplatePath(filePath, useAtomValue(atom_templatesFolder).folder)` (`template-registry.ts`, `template-atoms.ts`) and keep the ref current, the same way `slashMenuCallbacksRef` is kept current in `use-codemirror-templates.ts`.

### 4. `/field` slash entry
Add a `TEMPLATE_FIELD_SENTINEL` entry ("Template field", aliases field/token/placeholder) in `app/editor/components/constants.ts`, offered only in template notes. Gate it the same way `VAULT_TEMPLATE_ENTRIES` is gated in `slash-menu.ts` (via a callback/flag on `SlashMenuCallbacks`). In `applyTemplate` it replaces the trigger with `{{` and calls `startCompletion(view)`, which opens the list from step 3. No second list UI.

### 5. Template strip on the sheet
New `app/editor/components/TemplateStrip.tsx`, rendered in `MarkdownEditor.tsx` above `#md-editor` when `isTemplateNote && !previewMode`. It is one quiet line using the `text-ui-caption text-fg-muted` tokens and the design tokens in globals.scss:
- left: `Template · N fields`, where N = prompt labels (`extractPromptLabels`)
- right: an **Add field** button that focuses the view, inserts `{{` at the caret and runs `startCompletion`. This shares one helper with step 4 (e.g. `openTemplateFieldMenu(view)` exported from the completion module).
- below: live `lintTemplate(value)` warnings (memoized on the doc text), the same ones `TemplateSaveCard.tsx` shows. Hidden when there are none.

### 6. Starter and docs
- `app/utils/templates/template-starter.ts`: add the frontmatter comment `# Type {{ or /field to add a field.` Comments are already stripped on use by `splitTemplate`. Update `template-starter.test.ts`.
- `app/documentation/content/templates.tsx`: a short paragraph on `{{` / `/field` / the strip; add "field" to keywords.
- `app/utils/templates/README.md`: note the new helper and export.

## Files
- edit: `codemirror/shortcode-expand.ts`, `codemirror/extensions.ts`, `codemirror/slash-menu.ts`, `components/constants.ts`, `components/MarkdownEditor.tsx`, `hooks/use-codemirror-templates.ts` (under `app/editor/`); `app/utils/templates/template-lint.ts`, `template-starter.ts`, README; docs `templates.tsx`
- new: `app/utils/templates/template-fields.ts` (+test), `app/editor/codemirror/template-field-completion.ts` (+test), `app/editor/components/TemplateStrip.tsx`

## Verification
Only when the user asks to build or test (see memory): run `tsc --noEmit`, plus vitest for `template-fields`, `template-field-completion`, `shortcode-expand`, `slash-menu` and `template-starter`. Then the user checks manually (no Playwright):
- "New template…" → the strip shows; `{{` lists fields with examples; picking `date` gives `{{date}}`; `/field` opens the same list; typing `{{dat}}` shows the unknown-token warning.
- In a normal note, `{{` shows no list and there is no strip, but `{{date}}` still survives typing.
