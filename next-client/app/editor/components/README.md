# Editor Components

Index of the editor UI. Each component has a sibling `<Name>.md` (a token-lean doc: state, storage, network, usage, props).

- State lives in Jotai atoms (`app/atoms/*`). Persisted preferences use `atomWithStorage` (`localStorage`), and vault handles live in IndexedDB (`app/services/idb.ts`).
- Notes are plain files accessed through the File System Access API (`useFileSystem`). Only the opt-in AI (`/api/ai`) and GitHub vault (`/api/github/*`) features reach the network.
- Commands register with the palette through `useRegisterCommand` (see `editor-commands/README.md`).

| Component | Role |
|---|---|
| [AIChatDialog](AIChatDialog.md) | Multi-turn AI chat about the current document and selection, with vault file references and apply modes (insert or replace all). |
| [ai-chat/](ai-chat/README.md) | `AIChatDialog` building blocks: helpers, model and @mention hooks, message item, mention menu, context chips. |
| [AIReviewDialog](AIReviewDialog.md) | Word-level diff review of an AI suggestion against the original text, with an editable suggestion and replace or insert-below actions. |
| [AISelectionToolbar](AISelectionToolbar.md) | Floating "Ask AI" button on a selection; opens AI Chat with it. |
| [AIThinkingOverlay](AIThinkingOverlay.md) | Portaled busy indicator with rotating status messages, shown while an AI request is in flight. |
| [ConflictDialog](ConflictDialog.md) | Resolves an on-disk change to the open file by reloading from disk, keeping the current text, or merging manually (conflict markers, with per-side resolution). |
| [DraftFolderDialog](DraftFolderDialog.md) | Asks which vault folder an untitled draft's first save goes to (filterable, can create a new folder). |
| [DraftImportDialog](DraftImportDialog.md) | Confirms before an imported file replaces a non-empty draft. |
| [CreateVaultSubSteps](CreateVaultSubSteps.md) | Presentational steps for vault creation: a name input with validation, a parent-folder picker, and an "installing" spinner. |
| [DatePickerCallout](DatePickerCallout.md) | Calendar dialog for picking or replacing a date in the editor, with keyboard navigation and quick relative actions. |
| [EditorCommands](EditorCommands.md) | Registers the editor command-palette entries (renders nothing). |
| [BrowserVaultDialog](BrowserVaultDialog.md) | Create, reopen, or delete vaults stored in browser storage (Safari, Firefox, mobile). |
| [GitHubVaultDialog](GitHubVaultDialog.md) | Sign in to GitHub, pick or create a repository, and open it as a vault. |
| [HomeFeed](HomeFeed.md) | The vault's home screen: recent notes newest first with day labels and previews, a search/create pill and a new-note button; keyboard navigable. |
| [home-feed/](home-feed/README.md) | `HomeFeed` building blocks: feed model, header, row, skeleton, indexing status, bottom bar. |
| [ImageDialog](ImageDialog.md) | Lightbox for note images; resolves vault-relative paths locally. |
| [LinkPill](LinkPill.md) | Floating pill over a Markdown or wiki link in the editor, offering open and edit (label and URL). |
| [MarkdownEditor](MarkdownEditor.md) | CodeMirror 6 Markdown editor with inline pills, callouts, slash templates, and folding. |
| [markdown-editor/](markdown-editor/README.md) | `MarkdownEditor` render pieces: floating pills, link dialog, fold chevrons. |
| [MermaidDialog](MermaidDialog.md) | Full-size viewer for a Mermaid diagram with zoom and drag-to-pan, rendered locally with `mermaid` (`securityLevel: "strict"`). |
| [MobileFileIndicator](MobileFileIndicator.md) | Compact mobile header chip showing the active file name and its save state, with save, command palette, and AI chat shortcuts. |
| [MobileFileOverlay](MobileFileOverlay.md) | Full-screen mobile file browser combining tag and text search, smart folders, and the vault file list, with an empty state when no vault is open. |
| [MobileSelectionToolbar](MobileSelectionToolbar.md) | Mobile-only floating Bold/Italic/Link toolbar above a text selection. |
| [NewVaultDialog](NewVaultDialog.md) | Dialog that creates a new local vault folder, using `CreateVaultSubSteps` to name it and pick a parent folder. |
| [PaneLeaf](PaneLeaf.md) | One workspace pane: tab strip, pane actions, and the active file's editor. |
| [PaneEmptyState](PaneEmptyState.md) | Empty-pane actions: new file (blank draft), open note or file, vault actions. |
| [PaneModeSwitch](PaneModeSwitch.md) | App-wide Edit / Preview switch. |
| [PaneWindowActions](PaneWindowActions.md) | Window-wide header actions (view options, command palette, AI chat, settings, help), shown once in the top-right pane. |
| [FrontmatterToggle](FrontmatterToggle.md) | ⓘ button that shows / hides the active file's frontmatter. |
| [PaneTab](PaneTab.md) | Draggable file tab with a leading close button, unsaved-changes dot, and shortcut hint; exports `SaveStateIcon`. |
| [RenderedBlockSourceDialog](RenderedBlockSourceDialog.md) | Source editor with live preview for an inline-rendered Mermaid diagram or math block; Save writes the body back as one undo step. |
| [RepurposeNoteWizard](RepurposeNoteWizard.md) | Three-step wizard (select, drafting, review) that turns the current note into a blog post, social post, or newsletter draft saved as a new vault file. |
| [SectionHeader](SectionHeader.md) | Collapsible section header with a title, a chevron toggle, and an optional trailing action. |
| [SmartFolders](SmartFolders.md) | Lists custom workspaces (saved metadata queries) and the files each one matches, with create, edit, and delete through `WorkspaceBuilder`. |
| [TabContextMenu](TabContextMenu.md) | Right-click menu positioned at the cursor and clamped to the viewport, used for tab and file actions. |
| [TabStripScroller](TabStripScroller.md) | Horizontally scrolling tab strip that shows left/right scroll arrows at its end when the tabs overflow. |
| [TaskDialog](TaskDialog.md) | Form for building a task line (title, status, priority, due date, tags). |
| [UnifiedSearchInput](UnifiedSearchInput.md) | Search field that turns `#tag` entries into removable tag chips alongside free text, with tag autocomplete. |
| [VaultAccessGate](VaultAccessGate.md) | Wraps every /editor route: restores the saved vault on load and keeps the route hidden until it is readable, with the Restore Access prompt when needed. |
| [VaultPendingOverlay](VaultPendingOverlay.md) | Prompt shown after reload when the stored vault handle needs the user to grant permission again. |
| [VaultEmptyState](VaultEmptyState.md) | Empty state of the file views shown when no vault is open. |
| [VaultFileTree](VaultFileTree.md) | Virtualized file list or folder tree for the vault, with search highlighting, inline rename, a row action menu, and drag-and-drop moves. |
| [vault-tree/](vault-tree/README.md) | `VaultFileTree` building blocks: tree model, `FileRow`, `FolderRow`, `TreeNodes`. |
| [VoicePreviewPanel](VoicePreviewPanel.md) | Draggable panel showing dictated text (final and interim) with editing, voice-command help, and commit or discard. |
| [WelcomeWizard](WelcomeWizard.md) | Eight-step onboarding that covers opening, creating, or connecting a vault, then theme, fonts, editor options, autosave, optional AI key, and shortcuts. |
| [welcome-wizard/](welcome-wizard/README.md) | `WelcomeWizard` steps and shared step layout. |
| [WikiLinkDialog](WikiLinkDialog.md) | Picks or creates a `[[WikiLink]]` target, with substring-matched suggestions from vault file metadata. |
| [WorkflowPill](WorkflowPill.md) | Floating pill on a workflow tag (for example `#todo`) with prev/next arrows to cycle its state. |
| [WorkspaceBuilder](WorkspaceBuilder.md) | Dialog for creating or editing a custom workspace (a saved, rule-based file query over vault metadata). |
| [WorkspaceSplitter](WorkspaceSplitter.md) | Recursively renders the workspace layout tree as resizable panel groups, with a `PaneLeaf` at each leaf. |

## Outside this directory

| Component | Role |
|---|---|
| [FontPicker](../settings/components/FontPicker.md) | Font card grid with a live preview. |
| [SettingControls](../settings/components/SettingControls.md) | `SettingGroup`, `SettingItem`, `SegmentedControl`, and `SelectControl` primitives. |
| [SettingsCommands](../settings/components/SettingsCommands.md) | Registers the settings commands in the palette. |
| [TasksList](../tasks/components/TasksList.md) | Vault-wide task list with filters, grouping, and write-back. |
