# MarkdownEditor

Description: CodeMirror 6 Markdown editor for one pane. It adds inline pills and callouts (links, dates, tags), an inline editable table grid with spreadsheet formulas (including cross-note references), slash templates, inline-rendered Mermaid diagrams and display math (double-click to edit the source), a code-language picker, image paste, CSV-paste-to-table conversion, callout folding, collapsible frontmatter (collapsed, it is one quiet summary row — "▸ Properties · title, tags, +2", the first three top-level keys — that expands the block on click or when the caret moves in; the chevron on expanded frontmatter collapses it again, in that note only; new and open editors follow the app-wide default `atom_frontmatterCollapsedByDefault`, set in Settings → Editor or the **Collapse properties in every note** command), a faint tint on the caret's line (`highlightActiveLine`, `--active-line-bg`; focused editor only, not in Preview or on frontmatter), an optional flow mode (`codemirror/flow-mode.ts`: dims all but the caret's paragraph and keeps the caret line centered), and an app-wide Preview mode (`codemirror/preview-mode.ts`: the same view made read-only with Markdown syntax hidden, in the reading font; the edit pills are not rendered there; expanded frontmatter shows as a read-only key / value grid with tag pills, `codemirror/frontmatter-preview.ts`, while collapsed frontmatter keeps its summary row; double-clicking the text switches back to Edit with the caret at the click). The editor is a paper panel: a rounded `--surface` card with a hairline border and soft shadow, inset on the chrome canvas (`editor.scss`), on desktop and mobile alike; its side edges line up with the first tab (1rem, 1.25rem from 640px, single pane or split). The panel carries a fine paper grain (`--paper-grain`, a tiled SVG noise defined per theme in `globals.scss`) that moves with its element (not fixed to the viewport, which shimmered and repainted every frame while the sidebar slid).

## Local State & Storage
- State: `atom_activeEditorView`, `atom_isEditorFocused`, `atom_fileMetadata` (to resolve cross-note formula refs), `atom_wordWrap`, `atom_lineNumbers`, `atom_vimMode`, `atom_flowMode`, `atom_viewMode` (Edit / Preview), `atom_renderedFontFamily` (preview reading font, via `useEditorAppearance`), `atom_frontmatterCollapsedByDefault`, `atom_vaultHandle`, `atom_currentDirectoryHandle`, `atom_pendingScrollTarget`, `atom_isAiConfigured`, `atom_aiBuilderRequest`. Pill and dialog state is local useState.
- Persistence: Editor preferences live in `localStorage` (`wordWrap`, `lineNumbers`, `vimMode`, `flowMode`, `viewMode`, `frontmatterCollapsedByDefault`). Pasted images are written into the local vault through the File System Access API (`savePastedImage`).
- Features come from composable hooks in `../hooks`: `use-editor-appearance`, `use-codemirror-{editor,features,templates,table,image,code-language-picker,callout-fold,frontmatter-fold}`, and `use-cross-file-tables` (reads notes referenced by `=[[Note]]!B5` formulas and pushes them into the editor via `setFormulaFileTables` from `codemirror/table-formulas.ts`).

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
