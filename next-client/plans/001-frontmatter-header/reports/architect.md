# Architect report — 001 frontmatter header

## Run 1

**PRD:** `next-client/plans/001-frontmatter-header/prd.md`

**Summary** (2 phases)
- Phase 1: a `StateField` in the new `codemirror/frontmatter-header.ts` replaces the frontmatter block (`0..closeTo`) with one row of chips, in the order type, tags, status, dates, other keys. It works the same way the folded frontmatter does. The raw YAML comes back while the focused editor's selection touches the block. Focus reaches the field through `EditorView.focusChangeEffect`.
- A pure, strict parser (`editor/utils/frontmatter-header-chips.ts`) builds the chips. It returns `null`, meaning show raw, for nested, malformed or template YAML, or when there would be no chips.
- Phase 2: the status chip opens a `TabContextMenu` with todo / in-progress / done, a divider, then draft / review / active / archived. Date chips open the existing `DatePickerCallout`. Both write only the value characters, as one isolated undo step. This uses the callout-type-menu pattern (DOM event → hook → menu), wrapped in `markdown-editor/FrontmatterHeaderMenus.tsx` so `MarkdownEditor.tsx` (376 lines) stays under 400.
- Side fixes the header needs:
  - the initial caret goes to the body start (it was at 0, inside the block);
  - folding parks the caret at the body start;
  - frontmatter tag pills and the tag-list widget are removed, because the revealed YAML must be exactly as typed;
  - Ctrl/Cmd+Shift+Enter on a `status:` line opens the menu.

**Already exists**
- Block detection (`frontmatterRangeOf`), folding with a summary placeholder, the spacer below the block, the `/frontmatter` insert-or-reveal command and YAML completion.
- The caret-line reveal model (`syntax-reveal.ts`).
- The date picker (with time kept on datetimes) and the Ctrl/Cmd+Shift+Enter date helper, which already works on dates inside the YAML.
- `TabContextMenu` and the callout type menu pattern; `WORKFLOW_TAGS`.
- Disk-wins reloads (`input.external`): the chips follow them for free.

**Decisions / open questions to look at**
- Both status lists are shown, grouped with a divider; complex YAML shows raw (per the brief's answers).
- The reveal is for the whole block, not per line. None shows while the editor is unfocused.
- Header tag chips aren't `TagPill`s (body size, muted, no sage colour). Tags are capped at 3 plus `+N`. `title` shows its value only; other keys show as `key value`.
- A block with no chips (the starter `/frontmatter` block) stays raw.
- A note whose document ends at the closing `---` opens with raw YAML (there's nowhere outside the block for the caret).
- Open: whether an empty `status:` should get a placeholder chip; 3 tags vs all tags; whether non-due date keys (`created`) should open the date picker.

**Handoff:** "Implement next-client/plans/001-frontmatter-header/prd.md, phase 1" (then phase 2).
