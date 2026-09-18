import type { Command } from "@/app/components/CommandPalette/CommandPaletteContext";
import { formatShortcut } from "@/app/utils/platform";
import type { PanelLeaf, WorkspaceContainer } from "@/app/types/workspace";
import type { EditorCommandContext } from "./use-editor-command-context";

function collectLeaves(node: WorkspaceContainer | PanelLeaf): PanelLeaf[] {
  return "type" in node ? [node] : node.children.flatMap(collectLeaves);
}

export function buildWorkspaceTaskViewCommandGroups(context: EditorCommandContext) {
  const {
    activeFilePath,
    activeLeaf,
    activePaneId,
    closePane,
    closeTab,
    closeTabWithAutosave,
    indexVaultTags,
    isOnlyPane,
    lineNumbers,
    onOpenTasks,
    requestTabsBarToggle,
    requestWorkspaceBuilder,
    router,
    scanVault,
    setActiveFilePath,
    setActivePaneId,
    setIsWizardOpen,
    setKeyboardShortcutsOpen,
    setLineNumbers,
    setRailPanel,
    setShowHiddenFiles,
    setTabsBarVisibleByDefault,
    setTaskDueFilter,
    setTaskSearchQuery,
    setTasksGroupBy,
    setTaskTagFilter,
    setTheme,
    setWordWrap,
    showHiddenFiles,
    splitPane,
    tabsBarVisibleByDefault,
    themeCycle,
    vaultHandle,
    wordWrap,
    workspaceLayout,
  } = context;

  const panels: Command[] = [
    {
      id: "open-explorer",
      label: "Open Explorer",
      shortcut: formatShortcut("E", { shift: true }),
      keywords: "files browse explorer",
      action: () => router.push("/editor/files"),
    },
    {
      id: "open-tasks-panel",
      label: "Open Tasks",
      keywords: "tasks todos sidebar",
      action: onOpenTasks,
    },
  ];

  const splitPaneRight: Command[] = activeLeaf
    ? [{
        id: "split-pane-right",
        label: "Open in pane",
        keywords: "open split pane layout workspace",
        action: () => splitPane({ id: activeLeaf.id, direction: "horizontal", filePath: activeFilePath }),
      }]
    : [];

  const paneClosure: Command[] = [
    ...(activeLeaf && !isOnlyPane
      ? [{
          id: "close-pane",
          label: "Close Pane",
          keywords: "close pane layout workspace",
          action: () => closePane(activeLeaf.id),
        }]
      : []),
    ...(activeLeaf && activeLeaf.openFilePaths.length > 1
      ? [{
          id: "close-other-tabs",
          label: "Close other tabs",
          keywords: "close tabs files",
          action: () => {
            for (const path of activeLeaf.openFilePaths) {
              if (path !== activeFilePath) void closeTabWithAutosave(path);
            }
          },
        }]
      : []),
  ];

  const preferencesAndNavigation: Command[] = [
    {
      id: "toggle-theme",
      label: `Switch to ${themeCycle} theme`,
      keywords: "system dark light theme appearance",
      action: () => setTheme(themeCycle),
    },
    {
      id: "toggle-hidden-files",
      label: showHiddenFiles ? "Hide hidden files" : "Show hidden files",
      keywords: "hidden dotfiles skills files sidebar reveal",
      action: () => {
        const next = !showHiddenFiles;
        setShowHiddenFiles(next);
        if (!vaultHandle) return;
        scanVault(vaultHandle as any, next);
        indexVaultTags?.(vaultHandle as any, next);
      },
    },
    {
      id: "show-keyboard-shortcuts",
      label: "Show keyboard shortcuts",
      keywords: "shortcuts hotkeys keybindings help",
      action: () => setKeyboardShortcutsOpen(true),
    },
    {
      id: "open-settings",
      label: "Open Settings",
      keywords: "preferences config",
      action: () => router.push("/editor/settings"),
    },
    {
      id: "toggle-word-wrap",
      label: wordWrap ? "Disable word wrap" : "Enable word wrap",
      keywords: "wrap line editor",
      action: () => setWordWrap(!wordWrap),
    },
    {
      id: "toggle-line-numbers",
      label: lineNumbers ? "Hide line numbers" : "Show line numbers",
      keywords: "line numbers gutter editor",
      action: () => setLineNumbers(!lineNumbers),
    },
    {
      id: "toggle-tabs-bar-default",
      label: tabsBarVisibleByDefault ? "Hide tabs bar by default" : "Show tabs bar by default",
      keywords: "tabs bar pane visible default settings",
      action: () => setTabsBarVisibleByDefault(!tabsBarVisibleByDefault),
    },
    {
      id: "start-welcome-tour",
      label: "Start welcome tour",
      keywords: "onboarding guide help tour walkthrough",
      action: () => {
        setIsWizardOpen(true);
        router.push("/editor");
      },
    },
  ];

  const tabClosure: Command[] = [
    ...(activeLeaf?.activeFilePath
      ? [{
          id: "close-current-tab",
          label: "Close current tab",
          keywords: "close file",
          action: () => closeTab({ paneId: activeLeaf.id, filePath: activeLeaf.activeFilePath! }),
        }]
      : []),
    ...(activeLeaf && activeLeaf.openFilePaths.length > 0
      ? [{
          id: "close-all-tabs",
          label: "Close all tabs",
          keywords: "close all files",
          action: () => {
            activeLeaf.openFilePaths.forEach((filePath) =>
              closeTab({ paneId: activeLeaf.id, filePath }),
            );
          },
        }]
      : []),
  ];

  const leaves = collectLeaves(workspaceLayout.rootContainer);
  const activeLeafIndex = leaves.findIndex((leaf) => leaf.id === activePaneId);
  const activeTabIndex = activeLeaf?.activeFilePath
    ? activeLeaf.openFilePaths.indexOf(activeLeaf.activeFilePath)
    : -1;
  const workspaceTasksAndViews: Command[] = [
    {
      id: "toggle-active-tabs-bar",
      label: "Toggle active pane tabs",
      category: "Workspace",
      keywords: "show hide bar files",
      disabledReason: activeLeaf ? undefined : "No active pane",
      action: () => requestTabsBarToggle((value) => value + 1),
    },
    {
      id: "create-smart-view",
      label: "Create smart view",
      category: "Views",
      keywords: "workspace saved query filter",
      disabledReason: vaultHandle ? undefined : "Open a vault first",
      action: () => {
        setRailPanel("views");
        requestWorkspaceBuilder((value) => value + 1);
      },
    },
    {
      id: "split-pane-down",
      label: "Split pane down",
      category: "Workspace",
      keywords: "vertical below layout",
      disabledReason: activeLeaf ? undefined : "No active pane",
      action: () => activeLeaf && splitPane({ id: activeLeaf.id, direction: "vertical", filePath: activeFilePath }),
    },
    {
      id: "next-tab",
      label: "Activate next tab",
      category: "Workspace",
      keywords: "switch file",
      disabledReason: activeLeaf && activeLeaf.openFilePaths.length > 1 ? undefined : "No other open tab",
      action: () => {
        if (!activeLeaf || activeTabIndex < 0) return;
        setActiveFilePath(activeLeaf.openFilePaths[(activeTabIndex + 1) % activeLeaf.openFilePaths.length]);
      },
    },
    {
      id: "previous-tab",
      label: "Activate previous tab",
      category: "Workspace",
      keywords: "switch file",
      disabledReason: activeLeaf && activeLeaf.openFilePaths.length > 1 ? undefined : "No other open tab",
      action: () => {
        if (!activeLeaf || activeTabIndex < 0) return;
        setActiveFilePath(activeLeaf.openFilePaths[(activeTabIndex - 1 + activeLeaf.openFilePaths.length) % activeLeaf.openFilePaths.length]);
      },
    },
    {
      id: "next-pane",
      label: "Focus next pane",
      category: "Workspace",
      keywords: "switch layout",
      disabledReason: leaves.length > 1 ? undefined : "No other pane",
      action: () => setActivePaneId(leaves[(activeLeafIndex + 1) % leaves.length]?.id ?? null),
    },
    {
      id: "previous-pane",
      label: "Focus previous pane",
      category: "Workspace",
      keywords: "switch layout",
      disabledReason: leaves.length > 1 ? undefined : "No other pane",
      action: () => setActivePaneId(leaves[(activeLeafIndex - 1 + leaves.length) % leaves.length]?.id ?? null),
    },
    {
      id: "tasks-group-status",
      label: "Tasks: Group by status",
      category: "Tasks",
      keywords: "todo organize",
      action: () => {
        setTasksGroupBy("status");
        onOpenTasks();
      },
    },
    {
      id: "tasks-group-file",
      label: "Tasks: Group by file",
      category: "Tasks",
      keywords: "todo organize note",
      action: () => {
        setTasksGroupBy("file");
        onOpenTasks();
      },
    },
    {
      id: "tasks-clear-filters",
      label: "Tasks: Clear filters",
      category: "Tasks",
      keywords: "reset search tag due",
      action: () => {
        setTaskSearchQuery("");
        setTaskTagFilter([]);
        setTaskDueFilter("all");
        onOpenTasks();
      },
    },
    ...([
      ["overdue", "overdue"],
      ["today", "due today"],
      ["upcoming", "upcoming"],
      ["none", "without a due date"],
      ["all", "all dates"],
    ] as const).map(([filter, label]) => ({
      id: `tasks-filter-${filter}`,
      label: `Tasks: Show ${label}`,
      category: "Tasks" as const,
      keywords: "todo filter due date",
      action: () => {
        setTaskDueFilter(filter);
        onOpenTasks();
      },
    })),
  ];

  return {
    panels,
    splitPaneRight,
    paneClosure,
    preferencesAndNavigation,
    tabClosure,
    workspaceTasksAndViews,
  };
}
