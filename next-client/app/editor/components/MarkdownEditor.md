# MarkdownEditor

Description: CodeMirror 6 Markdown editor for one pane. It adds inline pills and callouts (links, dates, tags, tables), slash templates, image paste, and frontmatter/callout folding.

## Local State & Storage
- State: `atom_activeEditorView`, `atom_isEditorFocused`, `atom_wordWrap`, `atom_lineNumbers`, `atom_vimMode`, `atom_frontmatterCollapsedByDefault`, `atom_vaultHandle`, `atom_currentDirectoryHandle`, `atom_pendingScrollTarget`, `atom_isAiConfigured`, `atom_aiBuilderRequest`. Pill and dialog state is local useState.
- Persistence: Editor preferences live in `localStorage` (`wordWrap`, `lineNumbers`, `vimMode`, `frontmatterCollapsedByDefault`). Pasted images are written into the local vault through the File System Access API (`savePastedImage`).
- Features come from composable hooks in `../hooks`: `use-codemirror-{editor,features,templates,table,mermaid,image,code-language-picker,callout-fold,frontmatter-fold}`.

## Dependencies
- Core: `@codemirror/view`, `@codemirror/language-data`, `DialogModal`, `Typeahead`, `DatePickerCallout`, `WikiLinkDialog`, `TaskDialog`, `LinkPill`, `WorkflowPill`, `TableCallout`.
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
| filePath? | `string` |  | Vault path (for image paste and scroll targets) |
| placeholder? | `string` |  | Empty-state text |
| onWikiLinkClick? | `(name: string) => void` |  | `[[link]]` navigation |
| setMatchCount? | `(count: number) => void` |  | Search match reporting |
| onTextareaReady? | `(el: HTMLTextAreaElement \| null) => void` |  | Legacy element hook |
| isActivePane? / isSplit? | `boolean` |  | Pane context |
