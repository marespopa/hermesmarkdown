---
title: "Frontmatter editing: richer summaries, smarter completion, safer parsing"
tags: [plan, frontmatter, codemirror]
status: in-progress
---

# Frontmatter editing: richer summaries, smarter completion, safer parsing

## Problem

Frontmatter support today is split across three files: `codemirror/frontmatter-block.ts` (the tinted panel, the fold summary and its spacer, and the "Frontmatter" command), `codemirror/frontmatter-completion.ts` (the in-block completion menu for keys, tags and repeated values), and `utils/frontmatter-utils.ts` (parsing and rewriting the YAML block with regex, used by both the editor and any field that live-edits frontmatter). It covers the common case well, but has gaps:

- **The folded summary is thin.** `frontmatterSummary` only ever shows `title` (or `name`) and `tags` (`frontmatter-block.ts`). A folded block with `status`, `due` or `priority` set hides that at a glance, even though the vault already renders those for tasks.
- **Completion only knows a few shapes.** `LIST_KEYS` is hardcoded to `tags` and `aliases` (`frontmatter-completion.ts`); any other list-valued key in the vault's vocabulary (`authors`, `related`, …) gets the scalar-value completion path instead of a list one. There's no completion for dates (`due`, `created`, `updated`): no "today" suggestion, no format hint.
- **`parseFmFields` is a line-regex parser, not a YAML parser** (`frontmatter-utils.ts`). It has no error reporting: a malformed block (unterminated quote, duplicate key, bad indentation) is silently misread field-by-field, with no signal to the user. Nested maps aren't supported at all — only top-level `key: value`, flow arrays, block scalars (`|`, `>`) and simple `- item` lists.
- **No validation feedback in the editor.** Nothing highlights a broken frontmatter line as the user types it; the first sign of trouble is a field silently failing to round-trip.

This plan only covers the CodeMirror editor side (the three files above) and the vocabulary they read from (`utils/frontmatter-vocabulary.ts`). It does not touch the task/table formula engine.

## Desired behavior

Ship in order; each step stands on its own and keeps existing frontmatter files and behavior working unchanged.

### 1. Richer folded summary
- Extend `FrontmatterSummary` (`frontmatter-block.ts`) beyond `title`/`tags` to include `status` and `due`/`date` when present, reusing the same `unquote` helper.
- Render them in the folded line next to the title/tags pills already drawn by `heading-fold.ts`, in a fixed order, each only shown when the field exists. No change to notes without those keys.
- **Not a card.** The folded frontmatter stays a single-line, inline-flex summary (`▼ --- [Title] [tags: #dev, #v2] [status: in-progress] [due: 2026-10-30]`), not a Card component. Reasons to keep it inline rather than building a card:
  - *Spatial efficiency*: folding exists to free vertical space above the note's content; a card's padding, border and background would reintroduce the clutter folding is meant to remove and push content down.
  - *Consistency*: folded headers in CodeMirror/Obsidian-style editors are single-line summaries, and the rest of the editor already represents metadata (tags, status, dates) as small pills, not cards — status/due pills should match that visual language.
  - *Separation of roles*: the fold line is a glanceable badge bar; the unfolded tinted panel/raw YAML block remains the only place for editing. A form/card UI for editing fields would belong to an unfolded-view redesign, which is out of scope (see below).
- Each new field (`status`, `due`/`date`) renders as its own lightweight pill, same visual treatment as the existing title/tags pills, in the fixed order Title → Tags → Status → Due/Date, inside the same single flex/inline-flex wrapper already used by `frontmatterSummary`/`heading-fold.ts`.

### 2. Completion: more list keys, date values
- Replace the hardcoded `LIST_KEYS` set with a check against the vocabulary: a key is a list key if the vault's existing values for it are arrays, or it's one of a small built-in set (`tags`, `aliases`) kept as a fallback for new notes.
- Add a date-completion path: when the key being completed (`due`, `date`, `created`, `updated`, or anything whose existing values parse as `YYYY-MM-DD`) has no typed value yet, offer `today`'s date as a `value` completion alongside the vocabulary's repeated values.
- Keep every existing completion case (keys, inline tags, list-item tags, repeated values) working exactly as now; this only widens what qualifies.

### 3. Inline validation for the frontmatter block
- Add a small StateField in `frontmatter-block.ts` that scans only the frontmatter range (reusing `frontmatterRangeOf`) for the cases `parseFmFields` currently can't represent: a duplicate top-level key, a line that starts the block body but isn't `key: value`, `- item`, or a continuation, and an unterminated quote on a `key: "...` line.
- Surface these as a light underline/gutter mark on the offending line (styled like existing diagnostics, not a hard error — the file still saves as typed). No autofix in this phase.

### 4. Parsing: nested maps and clearer failure
- Extend `parseFmFields`/`updateFmFields` to read one level of nested `key:\n  sub: value` maps into dotted field names (`author.name`), enough for the completion menu and summary to see them, without changing the YAML on disk.
- Keep the function's contract (`Record<string, string>`, regex-based, no external YAML dependency) — this is an incremental extension of the existing line walk, not a rewrite to a full YAML parser.

## Out of scope
- A full YAML parser/serializer or a dependency change for frontmatter.
- Editing frontmatter through a form/panel UI instead of the raw YAML block.
- Changes to how tags/aliases/status are consumed outside the editor (search, task list, vault index) beyond reading the same fields as today.
- Autofixing invalid YAML; step 3 only reports it.
