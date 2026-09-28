# MarkdownEditor

Description: CodeMirror 6 Markdown editor for one pane. It adds inline pills and callouts (links, dates, tags), an inline editable table grid with spreadsheet formulas (including cross-note references), slash templates, a Mermaid dialog trigger, a code-language picker, image paste, CSV-paste-to-table conversion, and frontmatter/callout folding.

## Local State & Storage
- State: `atom_activeEditorView`, `atom_isEditorFocused`, `atom_fileMetadata` (to resolve cross-note formula refs), `atom_wordWrap`, `atom_lineNumbers`, `atom_vimMode`, `atom_frontmatterCollapsedByDefault`, `atom_vaultHandle`, `atom_currentDirectoryHandle`, `atom_pendingScrollTarget`, `atom_isAiConfigured`, `atom_aiBuilderRequest`. Pill and dialog state is local useState.
- Persistence: Editor preferences live in `localStorage` (`wordWrap`, `lineNumbers`, `vimMode`, `frontmatterCollapsedByDefault`). Pasted images are written into the local vault through the File System Access API (`savePastedImage`).
- Features come from composable hooks in `../hooks`: `use-editor-appearance`, `use-codemirror-{editor,features,templates,table,mermaid,image,code-language-picker,callout-fold,frontmatter-fold}`, and `use-cross-file-tables` (reads notes referenced by `=[[Note]]!B5` formulas and pushes them into the editor via `setFormulaFileTables` from `codemirror/table-formulas.ts`).

## Dependencies
- Core: `@codemirror/view`, `DatePickerCallout`, `WikiLinkDialog`, `TaskDialog`, the render pieces in [`markdown-editor/`](markdown-editor/README.md) (`EditorPills`, `LinkInsertDialog`, `FoldChevrons`), `useEditorPasteHandlers` ("Convert to table?" confirm on CSV paste, image saving), `useScrollToPendingTarget`, `useFileSystem`, `useKeyboardInset`.
- Zero-Cloud: No network or telemetry side effects. Opening a link pill calls `window.open` after a user click. AI actions only set `atom_aiBuilderRequest`; the request itself is made by the AI dialogs.

## Quick Usage
```tsx
import MarkdownEditor from "./MarkdownEditor";

<MarkdownEditor value={content} onChange={setContent} filePath={path} isActivePane />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| value | `string` |  | Document text |
| onChange | `(value: string) => void` |  | Change handler |
| filePath? | `string` | `"draft"` | Vault path (for image paste, scroll targets and formula refs) |
| placeholder? | `string` | `"Type / for templates"` | Empty-state text |
| onWikiLinkClick? | `(name: string) => void` |  | `[[link]]` navigation |
| isActivePane? / isSplit? | `boolean` |  | Pane context |
