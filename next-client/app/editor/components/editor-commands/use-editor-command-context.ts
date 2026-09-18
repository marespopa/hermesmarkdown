"use client";

import { useAtom, useAtomValue } from "jotai";
import { useRouter } from "next/navigation";
import {
  atom_activeFilePath,
  atom_activePaneId,
  atom_closePane,
  atom_closeTab,
  atom_isWizardOpen,
  atom_splitPane,
  atom_wordWrap,
  atom_workspaceLayout,
  findLeaf,
} from "@/app/atoms/atoms";
import { atom_content, atom_activeFileHandle } from "@/app/atoms/file-atoms";
import {
  atom_taskDueFilter,
  atom_taskSearchQuery,
  atom_taskTagFilter,
} from "@/app/atoms/task-atoms";
import {
  atom_activeEditorView,
  atom_aiBuilderRequest,
  atom_isAiConfigured,
  atom_keyboardShortcutsOpen,
  atom_lineNumbers,
  atom_newVaultFlowOpen,
  atom_railPanel,
  atom_repurposeWizardOpen,
  atom_showHiddenFiles,
  atom_tabsBarToggleRequest,
  atom_tabsBarVisibleByDefault,
  atom_tasksGroupBy,
  atom_theme,
  atom_workspaceBuilderRequest,
} from "@/app/atoms/ui-atoms";
import { useDialog } from "@/app/hooks/use-dialog";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { usePaneFileActions } from "../../hooks/use-pane-file-actions";

export type EditorCommandsProps = {
  onNewFile: () => void;
  onExport: () => void;
  githubVault?: boolean;
  onGitHubCommit?: () => void;
  onGitHubPush?: () => void;
  onGitHubSync?: () => void;
  onGitHubPull?: () => void;
  onSave: () => void;
  isMobileChrome?: boolean;
  onOpenMobileFiles?: () => void;
  onOpenTasks: () => void;
  onHome: () => void;
  onOpenDocumentation: () => void;
  onRefreshVault?: () => void;
  onImport: () => void;
  onNewAIFile: () => void;
  onRunAIAction: (id: string) => void;
  isVoiceSupported?: boolean;
  isVoiceListening?: boolean;
  onToggleVoice?: () => void;
  onCommitVoice?: () => void;
  onDiscardVoice?: () => void;
  hasVoicePreview?: boolean;
};

export function useEditorCommandContext(props: EditorCommandsProps) {
  const router = useRouter();
  const {
    openVault,
    vaultHandle,
    scanVault,
    indexVaultTags,
    closeVault,
    renameFile,
    deleteFile,
    duplicateFile,
    moveItem,
  } = useFileSystem();
  const dialog = useDialog();
  const [rawTheme, setTheme] = useAtom(atom_theme);
  const themeCycle: "system" | "light" | "dark" =
    rawTheme === "system" ? "light" : rawTheme === "light" ? "dark" : "system";
  const [showHiddenFiles, setShowHiddenFiles] = useAtom(atom_showHiddenFiles);
  const [railPanel, setRailPanel] = useAtom(atom_railPanel);
  const [, setAiBuilderRequest] = useAtom(atom_aiBuilderRequest);
  const [, setRepurposeWizardOpen] = useAtom(atom_repurposeWizardOpen);
  const isAiConfigured = useAtomValue(atom_isAiConfigured);
  const content = useAtomValue(atom_content);
  const workspaceLayout = useAtomValue(atom_workspaceLayout);
  const [activePaneId, setActivePaneId] = useAtom(atom_activePaneId);
  const [, setActiveFilePath] = useAtom(atom_activeFilePath);
  const [, closeTab] = useAtom(atom_closeTab);
  const [, setNewVaultFlowOpen] = useAtom(atom_newVaultFlowOpen);
  const [, splitPane] = useAtom(atom_splitPane);
  const [, closePane] = useAtom(atom_closePane);
  const [wordWrap, setWordWrap] = useAtom(atom_wordWrap);
  const [lineNumbers, setLineNumbers] = useAtom(atom_lineNumbers);
  const [tabsBarVisibleByDefault, setTabsBarVisibleByDefault] = useAtom(atom_tabsBarVisibleByDefault);
  const [, setTasksGroupBy] = useAtom(atom_tasksGroupBy);
  const [, setTaskSearchQuery] = useAtom(atom_taskSearchQuery);
  const [, setTaskTagFilter] = useAtom(atom_taskTagFilter);
  const [, setTaskDueFilter] = useAtom(atom_taskDueFilter);
  const [, setIsWizardOpen] = useAtom(atom_isWizardOpen);
  const [, setKeyboardShortcutsOpen] = useAtom(atom_keyboardShortcutsOpen);
  const [, requestTabsBarToggle] = useAtom(atom_tabsBarToggleRequest);
  const [, requestWorkspaceBuilder] = useAtom(atom_workspaceBuilderRequest);
  const activeFileHandle = useAtomValue(atom_activeFileHandle);
  const activeEditorView = useAtomValue(atom_activeEditorView);
  const activeLeaf = activePaneId ? findLeaf(workspaceLayout.rootContainer, activePaneId) : null;
  const isOnlyPane = "type" in workspaceLayout.rootContainer;
  const { filePath: activeFilePath, handleCopy, closeTabWithAutosave } = usePaneFileActions(activeLeaf);
  const runEditorCommand = (command: (view: NonNullable<typeof activeEditorView>) => unknown) => {
    if (activeEditorView) command(activeEditorView);
  };

  return {
    ...props,
    router,
    openVault,
    vaultHandle,
    scanVault,
    indexVaultTags,
    closeVault,
    renameFile,
    deleteFile,
    duplicateFile,
    moveItem,
    dialog,
    themeCycle,
    setTheme,
    showHiddenFiles,
    setShowHiddenFiles,
    railPanel,
    setRailPanel,
    setAiBuilderRequest,
    setRepurposeWizardOpen,
    isAiConfigured,
    content,
    workspaceLayout,
    activePaneId,
    setActivePaneId,
    setActiveFilePath,
    closeTab,
    setNewVaultFlowOpen,
    splitPane,
    closePane,
    wordWrap,
    setWordWrap,
    lineNumbers,
    setLineNumbers,
    tabsBarVisibleByDefault,
    setTabsBarVisibleByDefault,
    setTasksGroupBy,
    setTaskSearchQuery,
    setTaskTagFilter,
    setTaskDueFilter,
    setIsWizardOpen,
    setKeyboardShortcutsOpen,
    requestTabsBarToggle,
    requestWorkspaceBuilder,
    activeFileHandle,
    activeEditorView,
    activeLeaf,
    isOnlyPane,
    activeFilePath,
    handleCopy,
    closeTabWithAutosave,
    runEditorCommand,
  };
}

export type EditorCommandContext = ReturnType<typeof useEditorCommandContext>;
