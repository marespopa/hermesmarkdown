import type { Command } from "@/app/components/CommandPalette/CommandPaletteContext";
import { formatShortcut } from "@/app/utils/platform";
import type { PanelLeaf, WorkspaceContainer } from "@/app/types/workspace";
import { openTokenCostDialog } from "../../utils/open-helper-dialogs";
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
    onOpenTasks,
    onOpenTemplates,
    scanVault,
    setActiveFilePath,
    setActivePaneId,
    setSidebarOpen,
    setTabBarVisible,
    setShowHiddenFiles,
    setTaskSearchQuery,
    setTasksGroupBy,
    setTaskTagFilter,
    setTaskView,
    showHiddenFiles,
    splitPane,
    sidebarOpen,
    tabBarVisible,
    vaultHandle,
    workspaceLayout,
  } = context;

  // "Show Files" is registered once, by the palette itself (every route).
  const panels: Command[] = [
    {
      id: "open-tasks-panel",
      label: "Open Tasks",
      keywords: "tasks todos checklist",
      action: onOpenTasks,
    },
    {
      id: "open-templates",
      label: "Open Templates",
      keywords: "templates template packs journal daily weekly meeting manage",
      action: onOpenTemplates,
    },
  ];

  const splitPaneRight: Command[] = activeLeaf
    ? [{
        id: "split-pane-right",
        label: "Split Pane Right",
        keywords: "open in pane split right side by side horizontal layout workspace",
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
          label: "Close Other Tabs",
          keywords: "close tabs files",
          action: () => {
            for (const path of activeLeaf.openFilePaths) {
              if (path !== activeFilePath) void closeTabWithAutosave(path);
            }
          },
        }]
      : []),
  ];

  // Theme, Settings, keyboard shortcuts, word wrap, line numbers and Focus
  // are app-wide: AppCommands and SettingsCommands register them.
  const preferencesAndNavigation: Command[] = [
    {
      id: "toggle-hidden-files",
      label: "Toggle Hidden Files",
      keywords: "hidden dotfiles skills files tree reveal show hide",
      action: () => {
        const next = !showHiddenFiles;
        setShowHiddenFiles(next);
        if (!vaultHandle) return;
        scanVault(vaultHandle as any, next);
        indexVaultTags?.(vaultHandle as any, next);
      },
    },
    {
      id: "token-cost",
      label: "Show Token Cost",
      keywords: "tokens count price cost ai gpt claude gemini llm calculator note",
      action: openTokenCostDialog,
    },
    {
      id: "toggle-sidebar",
      label: "Toggle Sidebar",
      keywords: "sidebar open notes files tree navigation panel show hide",
      shortcut: formatShortcut("\\"),
      action: () => setSidebarOpen(!sidebarOpen),
    },
    {
      id: "toggle-tab-bar",
      label: "Toggle Tab Bar",
      keywords: "tab bar tabs toolbar header show hide collapse",
      shortcut: formatShortcut("\\", { shift: true }),
      action: () => setTabBarVisible(!tabBarVisible),
    },
  ];

  const tabClosure: Command[] = [
    ...(activeLeaf?.activeFilePath
      ? [{
          id: "close-current-tab",
          label: "Close Current Tab",
          keywords: "close note file",
          action: () => closeTab({ paneId: activeLeaf.id, filePath: activeLeaf.activeFilePath! }),
        }]
      : []),
    ...(activeLeaf && activeLeaf.openFilePaths.length > 0
      ? [{
          id: "close-all-tabs",
          label: "Close All Tabs",
          keywords: "close all notes files",
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
      id: "split-pane-down",
      label: "Split Pane Down",
      category: "Workspace",
      keywords: "vertical below layout",
      disabledReason: activeLeaf ? undefined : "No active pane",
      action: () => activeLeaf && splitPane({ id: activeLeaf.id, direction: "vertical", filePath: activeFilePath }),
    },
    {
      id: "next-tab",
      label: "Activate Next Tab",
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
      label: "Activate Previous Tab",
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
      label: "Focus Next Pane",
      category: "Workspace",
      keywords: "switch layout",
      disabledReason: leaves.length > 1 ? undefined : "No other pane",
      action: () => setActivePaneId(leaves[(activeLeafIndex + 1) % leaves.length]?.id ?? null),
    },
    {
      id: "previous-pane",
      label: "Focus Previous Pane",
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
        setTaskView("all");
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
        setTaskView("all");
        onOpenTasks();
      },
    },
    {
      id: "tasks-clear-filters",
      label: "Tasks: Clear filters",
      category: "Tasks",
      keywords: "reset search tag",
      action: () => {
        setTaskSearchQuery("");
        setTaskTagFilter([]);
        onOpenTasks();
      },
    },
    ...([
      ["board", "Board", "kanban columns status"],
      ["now", "Now", "in progress up next focus"],
      ["today", "Today", "due today overdue"],
      ["upcoming", "Upcoming", "due later scheduled"],
      ["all", "All", "every task status note"],
    ] as const).map(([view, label, keywords]) => ({
      id: `tasks-view-${view}`,
      label: `Tasks: Show ${label}`,
      category: "Tasks" as const,
      keywords: `todo list ${keywords}`,
      action: () => {
        setTaskView(view);
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
