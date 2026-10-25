# Engineer report: frontmatter header

## Built
- Chip parser (strict line parser, raw fallback, value span): `app/editor/utils/frontmatter-header-chips.ts`
- Header field/widget/reveal/focus, `setFrontmatterValue`, `requestFrontmatterChipAtCaret`: `app/editor/codemirror/frontmatter-header.ts`; styles in `frontmatter-header-theme.ts`
- `bodyStart`, `withBodyCaret`: `codemirror/frontmatter-block.ts`; wired in `extensions.ts` (+ bench) and `hooks/use-codemirror-editor.ts` (initial caret)
- Fold parks at body start: `codemirror/heading-fold.ts` `foldSection`
- Frontmatter tag pills removed: `codemirror/tag-pills.ts`, `theme.ts` (shrunk by 17 lines)
- Status menu/date picker: `FRONTMATTER_STATUSES` (`components/constants.ts`), `components/FrontmatterStatusMenu.tsx`, `hooks/use-frontmatter-header.ts`, `components/markdown-editor/FrontmatterHeaderMenus.tsx`, wiring + Ctrl/Cmd+Shift+Enter in `MarkdownEditor.tsx` (381 lines)

## Tests/docs
- New tests: `utils/frontmatter-header-chips.test.ts`, `codemirror/frontmatter-header.test.ts`, `components/FrontmatterStatusMenu.test.tsx`, `components/markdown-editor/FrontmatterHeaderMenus.test.tsx`
- Updated: `frontmatter-block.test.ts`, `heading-fold.test.ts`, `tag-pills.test.ts`, `MarkdownEditor.test.tsx`
- Docs: editor README, components + markdown-editor READMEs, `FrontmatterStatusMenu.md`, `FrontmatterHeaderMenus.md`, `MarkdownEditor.md`, `DatePickerCallout.md`, DESIGN.md, in-app editor-workspace and keyboard-shortcuts.

## Decisions
- The chip event bubbles (`bubbles: true`), as the callout menu's does, so the container listener receives it.
- Tag chips' `value` is the tag name; `more-tags` carries all tags.
- A bare `a #b` follows YAML (`#b` is a comment).
- `MarkdownEditor.test.tsx` "shows frontmatter as typed" now asserts the header, then raw once the caret is inside.
- Widget `eq` also compares `value` and `line`, so click handlers never act on stale data.
- No module mock for `FrontmatterHeaderMenus` in `MarkdownEditor.test.tsx`: that file mocks no sibling components.

## Not done / open
- Nothing deferred. The PRD's open questions (empty-status placeholder, 3-tag cap, picker for `created`/`updated`) are built as the PRD describes.

## To verify
- `corepack yarn tsc --noEmit`
- `corepack yarn vitest run app/editor/utils/frontmatter-header-chips.test.ts app/editor/codemirror/frontmatter-header.test.ts app/editor/codemirror/frontmatter-block.test.ts app/editor/codemirror/heading-fold.test.ts app/editor/codemirror/tag-pills.test.ts app/editor/components/FrontmatterStatusMenu.test.tsx app/editor/components/markdown-editor/FrontmatterHeaderMenus.test.tsx app/editor/components/MarkdownEditor.test.tsx`
- Manually: open a note with frontmatter (header shows, caret in body); ArrowUp reveals the YAML; status and date chips; fold and unfold.

## Run 2
- Fixed FrontmatterHeaderMenus.test.tsx:87: expected caret taken from the post-edit doc. No code changes.
