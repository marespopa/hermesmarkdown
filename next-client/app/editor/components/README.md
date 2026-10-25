# Editor Components

Index of the editor UI. Each component has a sibling `<Name>.md` (a token-lean doc: state, storage, network, usage, props).

- State lives in Jotai atoms (`app/atoms/*`). Persisted preferences use `atomWithStorage` (`localStorage`), and vault handles live in IndexedDB (`app/services/idb.ts`).
- Notes are plain files accessed through the File System Access API (`useFileSystem`). Only the opt-in AI (`/api/ai`) reaches the network.
- Commands register with the palette through `useRegisterCommand` (see `editor-commands/README.md`).

| Component | Role |
|---|---|
| [AIChatDialog](AIChatDialog.md) | Multi-turn AI chat about the current document and selection, with vault file references and apply modes (insert or replace all). |
| [ai-chat/](ai-chat/README.md) | `AIChatDialog` building blocks: helpers, model and @mention hooks, message item, mention menu, context chips. |
| [AIReviewDialog](AIReviewDialog.md) | Word-level diff review of an AI suggestion against the original text, with an editable suggestion and replace or insert-below actions. |
| [AIThinkingOverlay](AIThinkingOverlay.md) | Portaled busy indicator with rotating status messages, shown while an AI request is in flight. |
| [CalloutTypeMenu](CalloutTypeMenu.md) | Dropdown of callout types, opened right after inserting a callout from the slash menu; picking one rewrites `[!type]`. |
| [ConflictDialog](ConflictDialog.md) | Resolves an on-disk change to the open file by reloading from disk, keeping the current text, or merging manually (conflict markers, with per-side resolution). |
| [DraftImportDialog](DraftImportDialog.md) | Confirms before an imported file replaces a non-empty draft. |
| [CreateVaultSubSteps](CreateVaultSubSteps.md) | Presentational steps for vault creation: a name input with validation, a parent-folder picker, and an "installing" spinner. |
| [DatePickerCallout](DatePickerCallout.md) | Calendar dialog for picking or replacing a date in the editor, with keyboard navigation and quick relative actions. |
| [EditorCommands](EditorCommands.md) | Registers the editor command-palette entries (renders nothing). |
| [BlockTypeMenu](BlockTypeMenu.md) | The selection toolbar's "Turn into" dropdown: shows the line's block type and turns selected lines into text, a heading, a list, a to-do or a quote. |
| [BrowserVaultDialog](BrowserVaultDialog.md) | Create, reopen, or delete vaults stored in browser storage (Safari, Firefox, mobile). |
| [RecentVaultsDialog](RecentVaultsDialog.md) | Open, reorder, pin or remove recent vaults; only pinned ones are listed in the Vault menu, and they never age out. |
| [GitChangesToggleButton](GitChangesToggleButton.md) | The editor corner's pill that shows or hides the Git Changes diff, left of the outline toggle. |
| [OutlineToggleButton](OutlineToggleButton.md) | The editor corner's pill that shows or hides the note's outline, left of Copy Contents. |
| [ImageDialog](ImageDialog.md) | Lightbox for note images; resolves vault-relative paths locally. |
| [LinkPill](LinkPill.md) | Floating pill over a Markdown or wiki link in the editor, offering open and edit (label and URL). |
| [MarkdownEditor](MarkdownEditor.md) | CodeMirror 6 Markdown editor with inline pills, callouts, slash templates, and folding. |
| [markdown-editor/](markdown-editor/README.md) | `MarkdownEditor` render pieces: floating pills, link dialog, fold chevrons. |
| [MermaidDialog](MermaidDialog.md) | Full-size viewer for a Mermaid diagram, rendered locally with `mermaid` (`securityLevel: "strict"`), in a `MermaidViewer`. |
| [MermaidViewer](MermaidViewer.md) | A rendered diagram with zoom, fit, drag-to-pan and SVG download; used by `MermaidDialog` and the Mermaid tool page (`app/tools/mermaid/`). |
| [MobileFileIndicator](MobileFileIndicator.md) | Compact mobile header chip showing the active file name and its save state, with save, command palette, and AI chat shortcuts. |
| [NewVaultDialog](NewVaultDialog.md) | Dialog that creates a new local vault folder, using `CreateVaultSubSteps` to name it and pick a parent folder. |
| [board/](board/README.md) | Boards: Markdown notes holding an Excalidraw scene, shown as a canvas (`BoardViewLoader` → lazy `BoardView`, `BoardError`). |
| [PaneLeaf](PaneLeaf.md) | One workspace pane: its quiet title header, the drop layer, and the active file's editor or read-only preview (behind `PrivateNoteGate`). |
| [PrivateNoteGate](PrivateNoteGate.md) | Wraps a pane's editor: shows `PrivateNoteVeil` instead of mounting it until a private note is revealed (per note or for the session). |
| [PrivateNoteVeil](PrivateNoteVeil.md) | The veil over a private note: lock, title, **Show note** and **Show all private notes this session**. |
| [PaneEmptyState](PaneEmptyState.md) | Empty-pane actions: new file (blank draft), open note or file, vault actions. |
| [PaneToolbarButton](PaneToolbarButton.md) | Icon-only toolbar button with a tooltip. |
| [PinIconPopover](PinIconPopover.md) | A pinned row's emoji picker (the sidebar's Pinned section): search the local emoji index, paste one, Remove Icon; closes once the icon is written. |
| [FolderPopover](FolderPopover.md) | A breadcrumb folder's notes and subfolders, under the pane title: step in and up, search everything below it (virtualized past 200 rows), open a note, New File / New Folder (header buttons) named in place, Show in Files; at the vault's root, a Vault ▸ submenu with the vault switcher and Close Vault. `folder-listing.ts` lists and searches a folder. |
| [PaneTitle](PaneTitle.md) | The pane's header, in place of a toolbar: the note's folder breadcrumb (each folder opens a `FolderPopover`), its name and a save dot, at the top left; a click on the name (or a right-click) opens the note's menu, whose Rename renames it in place. `save-state.tsx` holds the save-state dot, icon and labels it shares with the mobile file bar. |
| [PdfExport](PdfExport.md) | Mounts **Export as PDF** (palette and More menu): the focused note rendered with its `pdf_*` page setup, shown in the export dialog, and printed through the browser's dialog, on the device; also **Export as HTML**, a standalone `.html` download. |
| [PdfExportDialog](PdfExportDialog.md) | The export dialog: the note's page setup beside a preview of its pages; Save as PDF… opens the print dialog. |
| [TokenCostDialog](TokenCostDialog.md) | What sending the focused note to each AI model costs (o200k count, input prices); opened from the palette. |
| [RenderedBlockSourceDialog](RenderedBlockSourceDialog.md) | Source editor with live preview for an inline-rendered Mermaid diagram or math block; Save writes the body back as one undo step. |
| [SectionHeader](SectionHeader.md) | Collapsible section header with a title, a chevron toggle, and an optional trailing action. |
| [SelectionToolbar](SelectionToolbar.md) | Floating toolbar on a text selection, desktop and mobile: Turn into menu, Bold, Italic, Link, and Ask AI when AI is configured. |
| [TabContextMenu](TabContextMenu.md) | The app's pop-up menu (tab, toolbar More, sidebar ⋯, Tasks page): at a point or right-aligned under a button, clamped to the viewport, arrow-key navigation. `menu-classes.ts` holds the shared menu look, also used by the file tree's `TreeContextMenu`. |
| [EmptyNoteTemplates](EmptyNoteTemplates.md) | Quick-start template pills under the first line of an empty note. |
| [TemplateStrip](TemplateStrip.md) | Line at the top of a template note: field count, Add field, lint warnings. |
| [TaskDialog](TaskDialog.md) | Form for building a task line (title, status, priority, due date, tags). |
| [UnifiedSearchInput](UnifiedSearchInput.md) | Search field that turns `#tag` entries into removable tag chips alongside free text, with tag autocomplete. |
| [EditorSkeleton](EditorSkeleton.md) | Shown while the saved vault loads: the editor's outline (sidebar, tab pills, the note's text column); on an /editor sub-page, that page's outline (RouteSkeletons). |
| [RouteSkeletons](RouteSkeletons.md) | Loading outlines of the /editor sub-pages (Templates, Tasks, All Files, Trash, Settings), chosen by path for EditorSkeleton. |
| [VaultAccessGate](VaultAccessGate.md) | Wraps every /editor route: restores the saved vault on load and keeps the route hidden until it is readable, with the Restore Access prompt when needed. |
| [VaultPendingOverlay](VaultPendingOverlay.md) | Prompt shown after reload when the stored vault handle needs the user to grant permission again. |
| [VaultActionButtons](VaultActionButtons.md) | Open / Create Vault buttons, shown where no vault is open. |
| [VaultFileTree](VaultFileTree.md) | Virtualized file list or folder tree for the vault, with search highlighting, inline rename, a row action menu, and drag-and-drop moves. |
| [vault-tree/](vault-tree/README.md) | `VaultFileTree` building blocks: tree model, `FileRow`, `FolderRow`, `TreeNodes`. |
| [FolderPrompt](FolderPrompt.md) | The only first-run question, asked late: once a draft has text and no vault is open, a quiet bottom bar offers Choose Folder… (or Keep Files in This Browser) and Not Now. |
| [WikiLinkDialog](WikiLinkDialog.md) | Picks or creates a `[[WikiLink]]` target, with substring-matched suggestions from vault file metadata. |
| [EditorShell](EditorShell.md) | The frame of every /editor route: hosts the sidebar (a plain panel that takes room), sets `--content-left`, owns the sidebar shortcuts and the vault dialogs, shows the open vault's pins (`useVaultPins`) and mounts `PinCommands`. |
| [RecoveryBanner](RecoveryBanner.md) | The line above the editor while notes can't be saved (vault access lost, vault folder missing, storage full or nearly full) or the note is very large; offers Export note as .md and a fix. |
| [ActiveFileIndexer](ActiveFileIndexer.md) | Re-indexes the active note a second after its text changes; mounted once by EditorShell so typing re-renders only it. |
| [CopyContentButton](CopyContentButton.md) | Copies the active note as Markdown; sits just left of the SearchPill in the editor's top-right corner, in its look. |
| [SearchPill](SearchPill.md) | The command palette's search field at rest, in the toolbar and every page's title bar: the app's main way in. |
| [ShellPage](ShellPage.md) | The frame of every /editor page (Tasks, Templates, Trash, All Files, Settings): a title bar and the page, beside the open sidebar. |
| [WorkspaceSidebar](WorkspaceSidebar.md) | The window's sidebar (desktop), the same on every /editor route and only the library: the vault switcher, New note, Pinned and Files; hideable and resizable. |
| [sidebar/](sidebar/README.md) | `WorkspaceSidebar`'s parts and its navigation hook. |

## Outside this directory

| Component | Role |
|---|---|
| [FontPicker](../settings/components/FontPicker.md) | Font card grid with a live preview. |
| [SettingControls](../settings/components/SettingControls.md) | `SettingGroup`, `SettingItem`, `SegmentedControl`, and `SelectControl` primitives. |
| [SettingsCommands](../settings/components/SettingsCommands.md) | Registers the settings commands in the palette. |
| [TasksList](../tasks/components/TasksList.md) | Vault-wide task list with filters, grouping, and write-back. |
