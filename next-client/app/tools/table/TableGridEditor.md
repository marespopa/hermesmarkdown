# TableGridEditor

Description: A CodeMirror view holding only the editor's table grid (`table-tool-extensions.ts`: `editorTheme`, history, `lang-markdown` without code-language data, `tableDisplayExtension`, `tableKeyBindings`). Cell editing, rulers, menus, sort, align, move, paste-a-range and undo all work as in a note. The view is created once from `value`; after that it owns its document, reporting changes through `onChange`. A `replaceRequest` replaces the whole document as one undoable change. Rendered in a `.editor-sheet.editor-container` so the editor's typography and table styles apply.

## Local State & Storage
- State: the `EditorView` (ref). Persistence: none; the parent stores the document.

## Quick Usage
```tsx
<TableGridEditor value={doc} onChange={setDoc} replaceRequest={request} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| value | `string` | | Starting document |
| onChange | `(doc: string) => void` | | Every document change |
| replaceRequest | `{ doc: string; id: number } \| null` | | Replace the document; a new `id` re-applies |
