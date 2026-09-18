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
    renameFile: vi.fn(),
    deleteFile: vi.fn(),
    duplicateFile: vi.fn(),
    moveItem: vi.fn(),
    dialog: {
      confirm: vi.fn(),
      prompt: vi.fn(),
      select: vi.fn(),
    },
    themeCycle: "light",
    setTheme: vi.fn(),
    showHiddenFiles: false,
    setShowHiddenFiles: vi.fn(),
    railPanel: null,
    setRailPanel: vi.fn(),
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
    tabsBarVisibleByDefault: true,
    setTabsBarVisibleByDefault: vi.fn(),
    setTasksGroupBy: vi.fn(),
    setTaskSearchQuery: vi.fn(),
    setTaskTagFilter: vi.fn(),
    setTaskDueFilter: vi.fn(),
    setIsWizardOpen: vi.fn(),
    setKeyboardShortcutsOpen: vi.fn(),
    requestTabsBarToggle: vi.fn(),
    requestWorkspaceBuilder: vi.fn(),
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
  it("preserves every command ID and its registration order", () => {
    const commands = buildEditorCommands(createContext());
    const templateIds = TEMPLATES
      .filter((template) => !template.aiOnly)
      .map((template) => `insert-${template.label.toLowerCase().replace(/\s+/g, "-")}`);

    expect(commands.map((command) => command.id)).toEqual([
      "save-file",
      "new-file",
      "export-file",
      "import-file",
      "toggle-sidebar",
      "open-files-panel",
      "open-search-panel",
      "open-tags-panel",
      "open-views-panel",
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
      "toggle-tabs-bar-default",
      "start-welcome-tour",
      "go-home",
      "open-documentation",
      "close-vault",
      "copy-markdown",
      "rename-current-file",
      "delete-current-file",
      "refresh-vault",
      "create-new-vault",
      "open-vault",
      "new-folder",
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
      "indent-subtree",
      "outdent-subtree",
      "toggle-checkbox",
      "cycle-task-status",
      ...templateIds,
      "toggle-active-tabs-bar",
      "create-smart-view",
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
    command("open-files-panel")?.action();
    command("open-tasks-panel")?.action();
    command("toggle-theme")?.action();
    command("ai-improve")?.action();

    expect(context.onSave).toHaveBeenCalledOnce();
    expect(context.onOpenMobileFiles).toHaveBeenCalledOnce();
    expect(context.onOpenTasks).toHaveBeenCalledOnce();
    expect(context.setTheme).toHaveBeenCalledWith("light");
    expect(context.onRunAIAction).toHaveBeenCalledWith("improve");
  });
});
