# WordCountPill

Description: The note's word count, a faint chrome pill floating in the bottom-left corner of the active pane ("1,204 words"). It fades out as soon as text goes in and fades back after a 1.5s pause (`WORD_COUNT_PAUSE`) or on any mouse move, so nothing changes in view while you write. Hidden on an empty note. Only mounted when **Word Count** is on (`atom_showWordCount`, Settings → Editor, off by default). Words come from `countWords` (`app/editor/utils/count-words.ts`): frontmatter is left out, and so are tokens with no letter or digit (`#`, `-`, `>`, `|`, `---`).

## Local State & Storage
- State: `typing` (text went in within the pause) and `shown`, the last count, kept while the pill is hidden so its fade-out shows the old number.
- Persistence: None.

## Logic
- Listens for `beforeinput` on the editor's DOM (every way text goes in, never shortcuts) and for `mousemove` on the document.
- The count is only computed while the pill is visible, so typing in a long note doesn't count the note on every keystroke.
- Sits on the left so it never meets [VimStatusPill](VimStatusPill.md) on the right.

## Dependencies
- Core: `@codemirror/view` (`EditorView`, for its DOM).
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
{props.isActivePane !== false && <WordCountPill view={editorView} text={editorValue} />}
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| view | `EditorView \| null` | | The pane's editor, whose typing hides the pill |
| text | `string` | | The note's current text |
