# Review: 005 New template command

## Review 1

**Verdict: Changes requested.** The implementation matches the PRD closely and the code is sound, but the change breaks one existing test. The project rule is "never push changes that break the test suite", and the fix is one line.

### Checks
| Check | Result | Caused by the change? |
|---|---|---|
| `corepack yarn tsc --noEmit` | Pass | — |
| `corepack yarn lint` | **Fail** (thousands of errors) | **No.** Every error is in generated bundles under a stray, git-ignored `next-client/next-client/.next/` folder (for example `next-client/next-client/.next/dev/static/chunks/0ku3_katex_dist_katex_mjs_0-yu0v9._.js`). Running `corepack yarn eslint` on all 15 changed and new files reports 0 problems. |
| `corepack yarn vitest run` | **Fail**: 1 failed / 1027 passed (141 files, `--maxWorkers=2`) | **Yes**, see B1. On the first run with default workers, 3 more files (`callout-fold.test.ts`, `vault-index.test.ts`, one more) hit `Timeout waiting for worker to respond`. That is an environment problem (slow PRoot worker startup), not this change. With 2 workers every file ran. |
| `corepack yarn build` | Pass | — |

Failure excerpt:
```
FAIL  app/editor/components/editor-commands/build-editor-commands.test.ts > buildEditorCommands > preserves every command ID and its registration order
AssertionError: expected [ 'save-file', 'new-file', …(99) ] to deeply equal [ 'save-file', 'new-file', …(98) ]
```
All the new and changed test files ran and passed: `template-registry.test.ts`, `template-frontmatter.test.ts`, `template-starter.test.ts`, `use-template-notes.test.ts` (`createTemplate` describe), `chat-skills.test.ts`, and the new "New template…" case in `build-editor-commands.test.ts`.

### PRD coverage
| Requirement / criterion | Status | Evidence |
|---|---|---|
| Palette "New template…", Vault, keywords, only with a vault | Done | `document-vault-commands.ts:67-75` (inside the `vaultHandle` branch) |
| Prompt `("Template name:", "", "New template")`; cancel or blank does nothing | Done | `use-template-create.ts:181-182` |
| Shared `sanitizeTemplateFileName` with leading-dot strip; `chat-skills.ts` imports it, no re-export | Done | `template-registry.ts:70-79`, `chat-skills.ts:4,87` |
| Folder = `atom_templatesFolder.folder`, created if missing | Done | `use-template-create.ts:184`, `ensureVaultFolder` via `writeNewNote` :81 |
| Existing template (registry, any case) opened unchanged with the "Opened existing template" toast; stale entry falls through | Done | `use-template-create.ts:187-201` |
| Existing file on disk but not indexed: opened unchanged, same toast (`onExisting`) | Done | `use-template-create.ts:67,77,202-205` |
| Otherwise write raw `TEMPLATE_STARTER`, rescan, index tags, open (force), `Created:` toast | Done | `use-template-create.ts:202` → :81-94 |
| `TEMPLATE_STARTER` exact text ending in `\n` | Done | `template-starter.ts:4-17` |
| `splitTemplate` drops column-0 `#` frontmatter lines, drops a comment-only block, keeps indented `#` | Done | `template-frontmatter.ts:18-38` (63 lines, under ~70) |
| Wiring through `use-file-crud` / `use-editor-command-context` | Done | `use-file-crud.ts:57,79`; `use-editor-command-context.ts:92,159` |
| Registry picks it up without a reload | Done | `scanVault` in `writeNewNote` :88; atoms are derived from `atom_fileMetadata` |
| Starter used for "Auth": `# Auth`, date, one Owner prompt, caret, no frontmatter | Done (unit level) | `template-starter.test.ts:8-32` |
| Plan-004 frontmatter tests and AI-chat block-name tests still pass | Done | both suites pass |
| Backends / mobile parity | Done by construction | only vault handles and the shared palette are used |
| No new chrome, raw `<button>`/`<input>` or network; files under 400 lines | Done | largest touched source is `use-editor-command-context.ts` at 222 lines |

No scope creep. The one extra line in the in-app docs ("If a template with that name already exists, it opens unchanged.") describes behavior the PRD specifies.

### Findings

**Blocker**

- **B1. `app/editor/components/editor-commands/build-editor-commands.test.ts:129-134`.** The registration-order test lists every command ID, and `new-template` is missing from it.
  - **Failure:** `corepack yarn vitest run` fails. Expected 99 IDs, got 100.
  - **Fix:** add `"new-template",` after `"new-note-from-template",` at :133. That is where the command is registered (`document-vault-commands.ts:67`).

**Minor (nit, optional)**

- **N1. `app/utils/templates/template-registry.ts:71-73`.** The leading-dot strip runs before the base name is trimmed. A base name that starts with whitespace and then a dot can therefore still become a dot-file.
  - **Failure:** the name `a/ .x` gives the base ` .x`. `^\.+` doesn't match it, the next `.trim()` turns it into `.x`, and the result is `.x.md`: a dot-file that isn't indexed, which is what M2 is meant to prevent. The input is contrived (the whole input is trimmed at :71, so ` .x` alone is safe).
  - **Fix:** trim the popped segment before `.replace(/^\.+/, "")`, or strip `^[\s.]+`. Optionally add an `a/ .x` → `x.md` test case.

**Question**

- **Q1. `plans/004-vault-templates/brief.md`.** The working tree changes this file's state from `approved` to `merged`. Only a human sets `merged`. If a human made this change, ignore this. If an agent made it, revert it.

### Tests & docs gaps
- Tests: every case the PRD lists is present. The only gap is the out-of-date ID list (B1).
- Docs: everything is done. The `app/utils/templates/README.md` rows (starter, sanitiser, comment stripping), `app/hooks/README.md`, `editor-commands/README.md`, `ai-chat/README.md` and the in-app `templates.tsx` (sentence, keywords, comment paragraph) are all updated. No component `.md` sibling is affected, because no component changed.

### Handoff (to hermes-engineer)
1. `app/editor/components/editor-commands/build-editor-commands.test.ts:133`: insert `"new-template",` after `"new-note-from-template",` in the "preserves every command ID and its registration order" list. Then run `corepack yarn vitest run app/editor/components/editor-commands/build-editor-commands.test.ts`.
2. (Optional nit) `app/utils/templates/template-registry.ts:71-73`: trim the base segment before stripping leading dots, so `a/ .x` gives `x.md`, not `.x.md`. Add that test case to `template-registry.test.ts`.

## Review 2

**Verdict: Approve.** Both Review 1 items are fixed. All tests pass, typecheck and build pass, and the changed files lint clean. I re-read the whole change and found no new issues.

### Checks
| Check | Result | Caused by the change? |
|---|---|---|
| `corepack yarn tsc --noEmit` | Pass | — |
| `corepack yarn lint` | **Fail** (25,390 errors, 227 warnings) | **No.** Every reported file is under the stray, git-ignored `next-client/next-client/.next/` build output (for example `next-client/next-client/.next/dev/static/chunks/turbopack-worker-[client-fs]__next_static_chunks_1_hyozq._.js: 'importScripts' is not defined`). With that folder filtered out, nothing is left. `corepack yarn eslint` on all 15 changed and new files reports 0 problems. Deleting `next-client/next-client/` (outside this change) would clear it. |
| `corepack yarn vitest run --maxWorkers=2` | Pass: 141 files, 1028 tests (Review 1: 1 failed, 1027 passed) | — |
| `corepack yarn build` | Pass | — |

The changed and new test files ran and passed: `template-registry.test.ts`, `template-frontmatter.test.ts`, `template-starter.test.ts`, `use-template-notes.test.ts`, `chat-skills.test.ts` and `build-editor-commands.test.ts` (8 files and 88 tests in the focused run).

### Review 1 follow-up
- **B1 fixed.** `build-editor-commands.test.ts:134` now has `"new-template"` right after `"new-note-from-template"`, which matches where it is registered (`document-vault-commands.ts:67`). The ID-order test passes.
- **N1 fixed.** `template-registry.ts:596-606` trims the base segment before the leading-dot strip and trims again after it. `a/ .x` now gives `x.md`, and `template-registry.test.ts:576` tests that.
- **Q1 still open (not blocking).** The working tree still changes `plans/004-vault-templates/brief.md` from `state: approved` to `merged`. Only a human sets `merged`. If a human made this change, ignore this. If an agent made it, revert it before committing.

### PRD coverage
Same as Review 1: every requirement and acceptance criterion is **done**, at the same locations. The `template-registry.ts` sanitiser is now at :593-606, and `use-template-create.ts` `createTemplate` is at :178-206. The only uncovered criterion is backend and mobile parity, which holds by construction (only vault handles and the shared palette are used) but isn't covered by tests. No scope creep.

### Findings
None at blocker, major or minor level.

A note on the sanitiser order, for information only (no change needed): the PRD order puts the leading-dot strip before the `.md` strip. So in the AI save card, the input `.md` now gives `md.md` where it used to give `template.md`. That follows the PRD as written and the result isn't a dot-file.

### Tests & docs gaps
None. Every PRD test case is present, and all the docs listed in the PRD are updated. `use-template-notes.test.ts` is 347 lines, so the fakes didn't need to be extracted. Line counts of touched source files: `use-template-create.ts` 209, `document-vault-commands.ts` 217, `use-editor-command-context.ts` 222, `template-frontmatter.ts` 63 (all under 400).

### Handoff
Nothing to fix. A human should confirm the plan 004 `brief.md` `merged` change (Q1) before committing.
