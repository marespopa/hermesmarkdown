import { describe, expect, it, vi } from "vitest";
import { TEMPLATES } from "../constants";
import { buildEditorCommands } from "./build-editor-commands";
import type { EditorCommandContext } from "./use-editor-command-context";

function createContext(overrides: Partial<EditorCommandContext> = {}): EditorCommandContext {
  const activeLeaf = {
    id: "pane-one",
    type: "editor" as const,
    activeFilePath: "Note.md",
    openFilePaths: ["Note.md", "Other.md"],
    isPinned: false,
  };
  const secondLeaf = {
    id: "pane-two",
    type: "editor" as const,
    activeFilePath: "Second.md",
    openFilePaths: ["Second.md"],
    isPinned: false,
  };

  return {
    onNewFile: vi.fn(),
    onExport: vi.fn(),
    onSave: vi.fn(),
    isMobileChrome: true,
    onOpenMobileFiles: vi.fn(),
    onOpenTasks: vi.fn(),
    onHome: vi.fn(),
    onOpenDocumentation: vi.fn(),
    onRefreshVault: vi.fn(),
    onImport: vi.fn(),
    onNewAIFile: vi.fn(),
    onRunAIAction: vi.fn(),
    isVoiceSupported: true,
    isVoiceListening: false,
    onToggleVoice: vi.fn(),
    onCommitVoice: vi.fn(),
    onDiscardVoice: vi.fn(),
    hasVoicePreview: true,
    router: { push: vi.fn() },
    openVault: vi.fn(),
    vaultHandle: {
      name: "Vault",
      values: vi.fn(),
      getDirectoryHandle: vi.fn(),
    },
    scanVault: vi.fn(),
    indexVaultTags: vi.fn(),
    closeVault: vi.fn(),
    homePinnedPaths: [],
    toggleHomePin: vi.fn(),
    renameFile: vi.fn(),
    deleteFile: vi.fn(),
    duplicateFile: vi.fn(),
    moveItem: vi.fn(),
    createFolder: vi.fn(),
    createTemplate: vi.fn(),
    dialog: {
      confirm: vi.fn(),
      prompt: vi.fn(),
      select: vi.fn(),
    },
    themeCycle: "light",
    setTheme: vi.fn(),
    showHiddenFiles: false,
    setShowHiddenFiles: vi.fn(),
    setAiBuilderRequest: vi.fn(),
    setRepurposeWizardOpen: vi.fn(),
    isAiConfigured: true,
    content: "Note content",
    workspaceLayout: {
      rootContainer: {
        id: "root",
        direction: "horizontal",
        sizes: [50, 50],
        children: [activeLeaf, secondLeaf],
      },
    },
    activePaneId: activeLeaf.id,
    setActivePaneId: vi.fn(),
    setActiveFilePath: vi.fn(),
    closeTab: vi.fn(),
    setNewVaultFlowOpen: vi.fn(),
    splitPane: vi.fn(),
    closePane: vi.fn(),
    wordWrap: true,
    setWordWrap: vi.fn(),
    lineNumbers: true,
    setLineNumbers: vi.fn(),
    flowMode: false,
    setFlowMode: vi.fn(),
    toolbarHidden: false,
    setToolbarHidden: vi.fn(),
    sidebarOpen: false,
    setSidebarOpen: vi.fn(),
    setTasksGroupBy: vi.fn(),
    setTaskSearchQuery: vi.fn(),
    setTaskTagFilter: vi.fn(),
    setTaskDueFilter: vi.fn(),
    setIsWizardOpen: vi.fn(),
    setKeyboardShortcutsOpen: vi.fn(),
    privacyLevel: "show_title",
    setPrivacyLevel: vi.fn(),
    revealAllSensitive: false,
    setRevealAllSensitive: vi.fn(),
    setRevealedSensitivePaths: vi.fn(),
    activeFileHandle: { name: "Note.md" },
    activeEditorView: {},
    activeLeaf,
    isOnlyPane: false,
    activeFilePath: "Note.md",
    handleCopy: vi.fn(),
    closeTabWithAutosave: vi.fn(),
    runEditorCommand: vi.fn(),
    ...overrides,
  } as unknown as EditorCommandContext;
}

describe("buildEditorCommands", () => {
  it("pins the open note to Home, or unpins it when it's pinned", () => {
    const unpinned = createContext();
    const pin = buildEditorCommands(unpinned).find((command) => command.id === "toggle-home-pin")!;
    expect(pin.label).toBe("Pin to Home");
    pin.action();
    expect(unpinned.toggleHomePin).toHaveBeenCalledWith("Note.md");

    const pinned = buildEditorCommands(createContext({ homePinnedPaths: ["Note.md"] }));
    expect(pinned.find((command) => command.id === "toggle-home-pin")?.label).toBe("Unpin from Home");
  });

  it("preserves every command ID and its registration order", () => {
    const commands = buildEditorCommands(createContext());
    const templateIds = TEMPLATES
      .filter((template) => !template.aiOnly && !template.vaultOnly && !template.templateOnly && !template.saveTemplateOnly)
      .map((template) => `insert-${template.label.toLowerCase().replace(/\s+/g, "-")}`);

    expect(commands.map((command) => command.id)).toEqual([
      "save-file",
      "new-file",
      "new-file-in-folder",
      "new-note-from-template",
      "insert-template",
      "save-as-template",
      "new-template",
      "export-file",
      "import-file",
      "open-explorer",
      "open-tasks-panel",
      "split-pane-right",
      "duplicate-current-file",
      "move-current-file",
      "close-pane",
      "close-other-tabs",
      "toggle-theme",
      "toggle-hidden-files",
      "show-keyboard-shortcuts",
      "open-settings",
      "toggle-word-wrap",
      "toggle-line-numbers",
      "toggle-flow-mode",
      "toggle-toolbar",
      "toggle-sidebar",
      "start-welcome-tour",
      "privacy-mode-show-title",
      "privacy-mode-blurred",
      "privacy-mode-hidden",
      "reveal-sensitive-session",
      "go-home",
      "toggle-home-pin",
      "open-documentation",
      "close-vault",
      "copy-markdown",
      "rename-current-file",
      "delete-current-file",
      "refresh-vault",
      "create-new-vault",
      "open-vault",
      "new-folder",
      "export-vault-zip",
      "import-into-vault",
      "ai-builder",
      "new-ai-file",
      "repurpose-note",
      "focus-editor",
      "undo-edit",
      "redo-edit",
      "close-current-tab",
      "close-all-tabs",
      "format-bold",
      "format-italic",
      "format-strikethrough",
      "format-inline-code",
      "format-heading-1",
      "format-heading-2",
      "format-heading-3",
      "format-heading-4",
      "format-heading-5",
      "format-heading-6",
      "format-link",
      "format-code-block",
      "find-in-note",
      "indent-subtree",
      "outdent-subtree",
      "toggle-checkbox",
      "cycle-task-status",
      ...templateIds,
      "split-pane-down",
      "next-tab",
      "previous-tab",
      "next-pane",
      "previous-pane",
      "tasks-group-status",
      "tasks-group-file",
      "tasks-clear-filters",
      "tasks-filter-overdue",
      "tasks-filter-today",
      "tasks-filter-upcoming",
      "tasks-filter-none",
      "tasks-filter-all",
      "ai-improve",
      "ai-expand",
      "ai-fix-grammar",
      "ai-shorten",
      "ai-tone-formal",
      "ai-tone-casual",
      "ai-tone-direct",
      "ai-tone-polished",
      "ai-summarize",
      "ai-extract-tasks",
      "ai-outline",
      "ai-title",
      "ai-continue",
      "ai-explain",
      "toggle-voice-input",
      "commit-voice-preview",
      "discard-voice-preview",
    ]);
  });

  it("preserves availability reasons and action callbacks", () => {
    const context = createContext({
      activeEditorView: null,
      isAiConfigured: false,
      isVoiceSupported: false,
      hasVoicePreview: false,
    });
    const commands = buildEditorCommands(context);
    const command = (id: string) => commands.find((candidate) => candidate.id === id);

    expect(command("format-bold")?.disabledReason).toBe("Open and focus a note first");
    expect(command("ai-improve")?.disabledReason).toBe("Configure an AI provider in Settings");
    expect(command("toggle-voice-input")?.disabledReason).toBe(
      "Voice input is not supported by this browser",
    );
    expect(command("commit-voice-preview")?.disabledReason).toBe("No voice preview to insert");

    command("save-file")?.action();
    command("open-explorer")?.action();
    command("open-tasks-panel")?.action();
    command("toggle-theme")?.action();
    command("ai-improve")?.action();
    command("new-folder")?.action();
    command("rename-current-file")?.action();
    command("delete-current-file")?.action();

    expect(context.onSave).toHaveBeenCalledOnce();
    expect(context.router.push).toHaveBeenCalledWith("/editor/files");
    expect(context.onOpenTasks).toHaveBeenCalledOnce();
    expect(context.setTheme).toHaveBeenCalledWith("light");
    expect(context.onRunAIAction).toHaveBeenCalledWith("improve");
    expect(context.createFolder).toHaveBeenCalledOnce();
    expect(context.renameFile).toHaveBeenCalledWith(context.activeFileHandle, undefined, context.activeFilePath);
    expect(context.deleteFile).toHaveBeenCalledWith(context.activeFileHandle, context.activeFilePath);
  });

  it("lists New note from template… only with a vault and runs the flow", () => {
    const createNoteFromTemplate = vi.fn();
    const withVault = buildEditorCommands(createContext({ createNoteFromTemplate } as Partial<EditorCommandContext>));
    withVault.find((command) => command.id === "new-note-from-template")?.action();
    expect(createNoteFromTemplate).toHaveBeenCalledOnce();

    const withoutVault = buildEditorCommands(createContext({ vaultHandle: null }));
    expect(withoutVault.some((command) => command.id === "new-note-from-template")).toBe(false);
  });

  it("renames the open browser vault from the palette", async () => {
    const renameBrowserVault = vi.fn();
    const descriptor = { version: 1, kind: "browser", id: "abc", displayName: "Notes", createdAt: 1 };
    const context = createContext({ vaultDescriptor: descriptor, renameBrowserVault } as Partial<EditorCommandContext>);
    (context.dialog.prompt as ReturnType<typeof vi.fn>).mockResolvedValue("Journal");
    await buildEditorCommands(context).find((command) => command.id === "rename-browser-vault")?.action();
    expect(context.dialog.prompt).toHaveBeenCalledWith("Vault name", "Notes", "Rename vault");
    expect(renameBrowserVault).toHaveBeenCalledWith(descriptor, "Journal");

    const local = buildEditorCommands(createContext({ vaultDescriptor: { kind: "local" } } as Partial<EditorCommandContext>));
    expect(local.some((command) => command.id === "rename-browser-vault")).toBe(false);
  });

  it("lists New template… only with a vault and runs the flow", () => {
    const createTemplate = vi.fn();
    const withVault = buildEditorCommands(createContext({ createTemplate }));
    const command = withVault.find((candidate) => candidate.id === "new-template");
    expect(command).toMatchObject({ label: "New template…", category: "Vault" });
    for (const query of ["create template", "add template", "new template"]) {
      expect(command?.keywords).toContain(query);
    }
    command?.action();
    expect(createTemplate).toHaveBeenCalledOnce();

    const withoutVault = buildEditorCommands(createContext({ vaultHandle: null }));
    expect(withoutVault.some((candidate) => candidate.id === "new-template")).toBe(false);
  });

  it("switches the privacy level and disables the current one", () => {
    const context = createContext({ privacyLevel: "blurred" });
    const commands = buildEditorCommands(context);
    const command = (id: string) => commands.find((candidate) => candidate.id === id);

    expect(command("privacy-mode-blurred")?.disabledReason).toBe("Current mode");
    expect(command("privacy-mode-show-title")?.disabledReason).toBeUndefined();
    expect(command("privacy-mode-hidden")?.disabledReason).toBeUndefined();

    command("privacy-mode-hidden")?.action();
    expect(context.setPrivacyLevel).toHaveBeenCalledWith("hidden");
  });

  it("toggles the session reveal and clears per-note reveals when turned off", () => {
    const off = createContext({ revealAllSensitive: false });
    const showAll = buildEditorCommands(off).find((command) => command.id === "reveal-sensitive-session");
    expect(showAll?.label).toBe("Show all sensitive notes this session");
    showAll?.action();
    expect(off.setRevealAllSensitive).toHaveBeenCalledWith(true);
    expect(off.setRevealedSensitivePaths).not.toHaveBeenCalled();

    const on = createContext({ revealAllSensitive: true });
    const hideAgain = buildEditorCommands(on).find((command) => command.id === "reveal-sensitive-session");
    expect(hideAgain?.label).toBe("Hide sensitive notes again");
    hideAgain?.action();
    expect(on.setRevealAllSensitive).toHaveBeenCalledWith(false);
    expect(on.setRevealedSensitivePaths).toHaveBeenCalledWith(new Set());
  });
});
