# templates

Pure modules behind vault templates: plain `.md` files in a templates folder whose `{{tokens}}` expand when a template is used. No React, no file I/O (the hooks in `app/hooks/file-system/use-template-*.ts` read and write).

| File | Purpose |
|---|---|
| `template-tokens.ts` | `TEMPLATE_TOKENS`, `expandTemplate()` (one left-to-right pass: `{{date}}` `{{time}}` `{{weekday}}` `{{year}}` `{{month}}` `{{day}}` `{{monthName}}` `{{title}}` `{{slug}}` `{{clipboard}}` `{{cursor}}` `{{prompt:Label}}`; inserted text is never expanded again, unknown tokens stay literal, the first `{{cursor}}` becomes an offset and the rest are removed), `slugify()`, `usesToken()`, `extractPromptLabels()` (distinct, trimmed, first-appearance order), `offsetToLineColumn()` |
| `template-frontmatter.ts` | `splitTemplate()` takes the routing keys (`target_folder`, `file_name`) out of the frontmatter (dropping the block if nothing else is left) and returns their raw values; `templateBody()` is the text after the frontmatter block |
| `template-registry.ts` | `resolveTemplatesFolder()` (the per-vault setting, else the first existing of `templates`, `_templates`, `Templates`), `listTemplates()` / `isTemplatePath()` (direct `.md` children only), `matchTemplateForFolder()` (`rfcs/` ↔ `rfc.md` / `rfcs.md`), `parseMissingLink()` (a missing `[[folder/name|alias#heading]]` → vault-root folder + base name), `sanitizeNoteName()` |
| `template-lint.ts` | `lintTemplate()` (non-blocking warnings: unknown tokens, empty prompt label, several cursors, misspelled routing keys) and `TEMPLATE_SYNTAX_GUIDE` (the grammar as Markdown, built from `TEMPLATE_TOKENS`; the AI chat's template skill embeds it) |

Times are local and names English, so output doesn't depend on the browser locale.
