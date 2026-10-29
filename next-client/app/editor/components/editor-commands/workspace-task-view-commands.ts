import type { Command } from "@/app/components/CommandPalette/CommandPaletteContext";
import { pageShortcutFor } from "@/app/components/CommandPalette/page-shortcuts";
import type { EditorCommandContext } from "./use-editor-command-context";

export function buildWorkspaceTaskViewCommandGroups(context: EditorCommandContext) {
  const {
    activeFilePath,
    activeLeaf,
    closeTab,
    closeTabWithAutosave,
    indexVaultTags,
    onOpenTasks,
    onOpenTemplates,
    scanVault,
    setActiveFilePath,
    setShowHiddenFiles,
    setTaskSearchQuery,
    setTasksGroupBy,
    setTaskTagFilter,
    setTaskView,
    showHiddenFiles,
    vaultHandle,
  } = context;

  // "Show Files" is registered once, by the palette itself (every route).
  const panels: Command[] = [
    {
      id: "open-tasks-panel",
      label: "Open Tasks",
      opens: "page",
      keywords: "tasks todos checklist",
      shortcut: pageShortcutFor("open-tasks-panel"),
      action: onOpenTasks,
    },
    {
      id: "open-templates",
      label: "Open Templates",
      opens: "page",
      keywords: "templates new template wizard examples meeting project manage",
      shortcut: pageShortcutFor("open-templates"),
      action: onOpenTemplates,
    },
  ];

  const tabsClosure: Command[] = [
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

  const activeTabIndex = activeLeaf?.activeFilePath
    ? activeLeaf.openFilePaths.indexOf(activeLeaf.activeFilePath)
    : -1;
  const workspaceTasksAndViews: Command[] = [
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
    tabsClosure,
    preferencesAndNavigation,
    tabClosure,
    workspaceTasksAndViews,
  };
}
