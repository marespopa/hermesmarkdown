import { describe, expect, it, vi } from "vitest";
import type { Command } from "@/app/components/CommandPalette/CommandPaletteContext";
import { TEMPLATES } from "../constants";
import { buildEditorCommands } from "./build-editor-commands";
import type { EditorCommandContext } from "./use-editor-command-context";

function createContext(overrides: Partial<EditorCommandContext> = {}): EditorCommandContext {
  const activeLeaf = {
    id: "pane-one",
    activeFilePath: "Note.md",
    openFilePaths: ["Note.md", "Other.md"],
    isPinned: false,
  };

  return {
    onNewFile: vi.fn(),
    onExport: vi.fn(),
    onSave: vi.fn(),
    isMobileChrome: true,
    onOpenTasks: vi.fn(),
    onOpenTemplates: vi.fn(),
    onRefreshVault: vi.fn(),
    onImport: vi.fn(),
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
    pinnedNotePaths: [],
    toggleNotePin: vi.fn(),
    renameFile: vi.fn(),
    deleteFile: vi.fn(),
    duplicateFile: vi.fn(),
    moveItem: vi.fn(),
    createFolder: vi.fn(),
    createTemplate: vi.fn(),
    newFromFolderTemplate: vi.fn(),
    dialog: {
      confirm: vi.fn(),
      prompt: vi.fn(),
      select: vi.fn(),
    },
    showHiddenFiles: false,
    setShowHiddenFiles: vi.fn(),
    setAiBuilderRequest: vi.fn(),
    requestCompanionAction: vi.fn(),
    isAiEnabled: true,
    isAiConfigured: true,
    activeIsBoard: false,
    workspaceLayout: { rootContainer: activeLeaf },
    activePaneId: activeLeaf.id,
    setActiveFilePath: vi.fn(),
    closeTab: vi.fn(),
    setNewVaultFlowOpen: vi.fn(),
    setTasksGroupBy: vi.fn(),
    setTaskSearchQuery: vi.fn(),
    setTaskTagFilter: vi.fn(),
    setTaskView: vi.fn(),
    privacyLevel: "show_title",
    setPrivacyLevel: vi.fn(),
    revealAllPrivate: false,
    setRevealAllPrivate: vi.fn(),
    setRevealedPrivatePaths: vi.fn(),
    activeFileHandle: { name: "Note.md" },
    activeEditorView: {},
    activeLeaf,
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
    const pin = buildEditorCommands(unpinned).find((command) => command.id === "toggle-note-pin")!;
    expect(pin.label).toBe("Pin File");
    pin.action();
    expect(unpinned.toggleNotePin).toHaveBeenCalledWith("Note.md");

    const pinned = buildEditorCommands(createContext({ pinnedNotePaths: ["Note.md"] }));
    expect(pinned.find((command) => command.id === "toggle-note-pin")?.label).toBe("Unpin File");
  });

  it("offers New board only with a vault, and runs createBoard", () => {
    const withVault = createContext({ createBoard: vi.fn() } as Partial<EditorCommandContext>);
    const command = buildEditorCommands(withVault).find((c) => c.id === "new-board")!;
    expect(command.label).toBe("New board");
    command.action();
    expect(withVault.createBoard).toHaveBeenCalled();

    const noVault = buildEditorCommands(createContext({ vaultHandle: null } as unknown as Partial<EditorCommandContext>));
    expect(noVault.some((c) => c.id === "new-board")).toBe(false);
  });

  it("offers the board toggle only for a board, flipping its label", () => {
    expect(buildEditorCommands(createContext()).some((c) => c.id === "toggle-board-markdown")).toBe(false);

    const asBoard = createContext({
      activeIsBoard: true,
      boardMarkdownPaths: new Set<string>(),
      toggleBoardMarkdown: vi.fn(),
    } as unknown as Partial<EditorCommandContext>);
    const toggle = buildEditorCommands(asBoard).find((c) => c.id === "toggle-board-markdown")!;
    expect(toggle.label).toBe("Edit Board as Markdown");
    toggle.action();
    expect(asBoard.toggleBoardMarkdown).toHaveBeenCalledWith("Note.md");

    const asMarkdown = createContext({
      activeIsBoard: true,
      boardMarkdownPaths: new Set(["Note.md"]),
    } as unknown as Partial<EditorCommandContext>);
    expect(buildEditorCommands(asMarkdown).find((c) => c.id === "toggle-board-markdown")?.label).toBe("Open as Board");
  });

  it("preserves every command ID and its registration order", () => {
    const commands = buildEditorCommands(createContext());
    const templateIds = TEMPLATES
      .filter((template) => !template.aiOnly && !template.vaultOnly && !template.templateOnly && !template.saveTemplateOnly)
      .map((template) => `insert-${template.label.toLowerCase().replace(/\s+/g, "-")}`);

    expect(commands.map((command) => command.id)).toEqual([
      "save-file",
      "new-file",
      "new-board",
      "insert-template",
      "save-as-template",
      "new-template",
      "new-from-folder-template",
      "export-file",
      "import-file",
      "open-tasks-panel",
      "open-templates",
      "duplicate-current-file",
      "move-current-file",
      "close-other-tabs",
      "toggle-hidden-files",
      "token-cost",
      "privacy-mode-show-title",
      "privacy-mode-hidden",
      "reveal-private-session",
      "toggle-note-pin",
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
      "ai-menu",
      "ai-new-chat",
      "ai-compact-chat",
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
      "format-code",
      "find-in-note",
      "go-to-line",
      "fold-current-section",
      "unfold-all-sections",
      "next-git-change",
      "previous-git-change",
      "indent-subtree",
      "outdent-subtree",
      "toggle-checkbox",
      "cycle-task-status",
      "task-status-prog",
      "task-status-hold",
      "task-status-cancelled",
      "task-status-todo",
      ...templateIds,
      "next-tab",
      "previous-tab",
      "tasks-group-status",
      "tasks-group-file",
      "tasks-clear-filters",
      "tasks-view-board",
      "tasks-view-now",
      "tasks-view-today",
      "tasks-view-upcoming",
      "tasks-view-all",
    ]);
  });

  it("leaves app-wide commands to AppCommands and SettingsCommands", () => {
    const ids = buildEditorCommands(createContext()).map((command) => command.id);
    for (const id of [
      "open-explorer", "open-settings", "open-documentation", "show-keyboard-shortcuts",
      "toggle-theme", "toggle-word-wrap", "toggle-line-numbers", "go-home",
    ]) {
      expect(ids).not.toContain(id);
    }
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("names note commands with notes, and Export as Markdown runs the export", () => {
    const context = createContext();
    const commands = buildEditorCommands(context);
    const label = (id: string) => commands.find((command) => command.id === id)?.label;

    expect(label("new-file")).toBe("New File");
    expect(label("import-file")).toBe("Open File from Disk…");
    expect(label("rename-current-file")).toBe("Rename File");
    expect(label("delete-current-file")).toBe("Delete File");
    expect(label("export-file")).toBe("Export as Markdown");
    commands.find((command) => command.id === "export-file")?.action();
    expect(context.onExport).toHaveBeenCalledOnce();
    expect(context.onSave).not.toHaveBeenCalled();
  });

  it("lists no AI actions while AI features are off", () => {
    const commands = buildEditorCommands(createContext({ isAiEnabled: false, isAiConfigured: false }));
    expect(commands.some((command) => command.id.startsWith("ai-"))).toBe(false);
  });

  it("offers Ask AI, New AI chat and Summarize AI chat for the companion", () => {
    const context = createContext();
    const commands = buildEditorCommands(context);
    const ask = commands.find((command) => command.id === "ai-menu");
    expect(ask?.label).toBe("Ask AI");
    expect(ask?.subcommands).toBeUndefined();
    expect(commands.filter((command) => command.category === "AI").map((command) => command.id)).toEqual(["ai-menu", "ai-new-chat", "ai-compact-chat"]);
    ask?.action();
    expect(context.setAiBuilderRequest).toHaveBeenCalledOnce();
    commands.find((command) => command.id === "ai-new-chat")?.action();
    expect(context.requestCompanionAction).toHaveBeenCalledWith("new");
    commands.find((command) => command.id === "ai-compact-chat")?.action();
    expect(context.requestCompanionAction).toHaveBeenCalledWith("compact");
  });

  it("preserves availability reasons and action callbacks", () => {
    const context = createContext({
      activeEditorView: null,
      isAiConfigured: false,
    });
    const commands = buildEditorCommands(context);
    // The AI actions sit inside the AI menu's modes.
    const flatten = (list: Command[]): Command[] => list.flatMap((item) => [item, ...flatten(item.subcommands ?? [])]);
    const command = (id: string) => flatten(commands).find((candidate) => candidate.id === id);

    expect(command("format-bold")?.disabledReason).toBe("Open and focus a note first");
    expect(command("ai-menu")?.disabledReason).toBe("Add an API key in Settings → AI Features");

    command("save-file")?.action();
    command("open-tasks-panel")?.action();
    command("new-folder")?.action();
    command("rename-current-file")?.action();
    command("delete-current-file")?.action();

    expect(context.onSave).toHaveBeenCalledOnce();
    expect(commands.some((candidate) => candidate.id === "open-explorer" || candidate.id === "show-files")).toBe(false);
    expect(context.onOpenTasks).toHaveBeenCalledOnce();
    expect(context.createFolder).toHaveBeenCalledOnce();
    expect(context.renameFile).toHaveBeenCalledWith(context.activeFileHandle, undefined, context.activeFilePath);
    expect(context.deleteFile).toHaveBeenCalledWith(context.activeFileHandle, context.activeFilePath);
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

  it("lists New from folder template… only with a vault and starts it without arguments", () => {
    const newFromFolderTemplate = vi.fn();
    const withVault = buildEditorCommands(createContext({ newFromFolderTemplate }));
    const command = withVault.find((candidate) => candidate.id === "new-from-folder-template");
    expect(command).toMatchObject({ label: "New from folder template…", category: "Vault" });
    command?.action();
    expect(newFromFolderTemplate).toHaveBeenCalledWith();

    const withoutVault = buildEditorCommands(createContext({ vaultHandle: null }));
    expect(withoutVault.some((candidate) => candidate.id === "new-from-folder-template")).toBe(false);
  });

  it("switches the privacy level and disables the current one", () => {
    const context = createContext({ privacyLevel: "hidden" });
    const commands = buildEditorCommands(context);
    const command = (id: string) => commands.find((candidate) => candidate.id === id);

    expect(command("privacy-mode-hidden")?.disabledReason).toBe("Current mode");
    expect(command("privacy-mode-show-title")?.disabledReason).toBeUndefined();
    expect(command("privacy-mode-blurred")).toBeUndefined();
    expect(command("privacy-mode-show-title")?.label).toBe("Privacy mode: Mask in lists");
    expect(command("privacy-mode-hidden")?.label).toBe("Privacy mode: Hide from lists");

    command("privacy-mode-show-title")?.action();
    expect(context.setPrivacyLevel).toHaveBeenCalledWith("show_title");
  });

  it("toggles the session reveal and clears per-note reveals when turned off", () => {
    const off = createContext({ revealAllPrivate: false });
    const showAll = buildEditorCommands(off).find((command) => command.id === "reveal-private-session");
    expect(showAll?.label).toBe("Show all private notes this session");
    showAll?.action();
    expect(off.setRevealAllPrivate).toHaveBeenCalledWith(true);
    expect(off.setRevealedPrivatePaths).not.toHaveBeenCalled();

    const on = createContext({ revealAllPrivate: true });
    const hideAgain = buildEditorCommands(on).find((command) => command.id === "reveal-private-session");
    expect(hideAgain?.label).toBe("Hide private notes again");
    hideAgain?.action();
    expect(on.setRevealAllPrivate).toHaveBeenCalledWith(false);
    expect(on.setRevealedPrivatePaths).toHaveBeenCalledWith(new Set());
  });
});
