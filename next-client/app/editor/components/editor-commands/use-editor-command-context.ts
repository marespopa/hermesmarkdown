"use client";

import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { atom_homePinnedPaths, atom_toggleHomePin } from "@/app/atoms/home-pin-atoms";
import { useRouter } from "next/navigation";
import {
  atom_activeFilePath,
  atom_activePaneId,
  atom_vaultDescriptor,
  atom_closePane,
  atom_closeTab,
  atom_isWizardOpen,
  atom_splitPane,
  atom_workspaceLayout,
  findLeaf,
} from "@/app/atoms/atoms";
import { atom_content, atom_activeFileHandle } from "@/app/atoms/file-atoms";
import {
  atom_privacyLevel,
  atom_revealAllSensitive,
  atom_revealedSensitivePaths,
} from "@/app/atoms/privacy-atoms";
import {
  atom_taskSearchQuery,
  atom_taskTagFilter,
} from "@/app/atoms/task-atoms";
import {
  atom_activeEditorView,
  atom_aiBuilderRequest,
  atom_browserVaultDialogOpen,
  atom_sidebarOpen,
  atom_isAiConfigured,
  atom_newVaultFlowOpen,
  atom_showHiddenFiles,
  atom_tasksGroupBy,
  atom_taskView,
} from "@/app/atoms/ui-atoms";
import { useDialog } from "@/app/hooks/use-dialog";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { supportsDirectoryInput } from "@/app/services/vault-archive";
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
  onOpenTasks: () => void;
  onOpenTemplates: () => void;
  onRefreshVault?: () => void;
  onImport: () => void;
  onRunAIAction: (id: string) => void;
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
    createFolder,
    createNewFile,
    createNoteFromTemplate,
    createTemplate,
    isVaultSupported,
    isBrowserVaultSupported,
    exportVaultZip,
    exportVaultToFolder,
    importIntoVault,
    renameBrowserVault,
    deleteBrowserVault,
  } = useFileSystem();
  const vaultDescriptor = useAtomValue(atom_vaultDescriptor);
  const setBrowserVaultDialogOpen = useSetAtom(atom_browserVaultDialogOpen);
  const supportsFolderImport = supportsDirectoryInput();
  const dialog = useDialog();
  const [showHiddenFiles, setShowHiddenFiles] = useAtom(atom_showHiddenFiles);
  const [, setAiBuilderRequest] = useAtom(atom_aiBuilderRequest);
  const isAiConfigured = useAtomValue(atom_isAiConfigured);
  const content = useAtomValue(atom_content);
  const workspaceLayout = useAtomValue(atom_workspaceLayout);
  const [activePaneId, setActivePaneId] = useAtom(atom_activePaneId);
  const [, setActiveFilePath] = useAtom(atom_activeFilePath);
  const [, closeTab] = useAtom(atom_closeTab);
  const [, setNewVaultFlowOpen] = useAtom(atom_newVaultFlowOpen);
  const [, splitPane] = useAtom(atom_splitPane);
  const [, closePane] = useAtom(atom_closePane);
  const [sidebarOpen, setSidebarOpen] = useAtom(atom_sidebarOpen);
  const [, setTasksGroupBy] = useAtom(atom_tasksGroupBy);
  const [, setTaskSearchQuery] = useAtom(atom_taskSearchQuery);
  const [, setTaskTagFilter] = useAtom(atom_taskTagFilter);
  const [, setTaskView] = useAtom(atom_taskView);
  const [, setIsWizardOpen] = useAtom(atom_isWizardOpen);
  const [privacyLevel, setPrivacyLevel] = useAtom(atom_privacyLevel);
  const [revealAllSensitive, setRevealAllSensitive] = useAtom(atom_revealAllSensitive);
  const setRevealedSensitivePaths = useSetAtom(atom_revealedSensitivePaths);
  const activeFileHandle = useAtomValue(atom_activeFileHandle);
  const homePinnedPaths = useAtomValue(atom_homePinnedPaths);
  const toggleHomePin = useSetAtom(atom_toggleHomePin);
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
    homePinnedPaths,
    toggleHomePin,
    renameFile,
    deleteFile,
    duplicateFile,
    moveItem,
    createFolder,
    createNewFile,
    createNoteFromTemplate,
    createTemplate,
    isVaultSupported,
    isBrowserVaultSupported,
    exportVaultZip,
    exportVaultToFolder,
    importIntoVault,
    renameBrowserVault,
    deleteBrowserVault,
    vaultDescriptor,
    setBrowserVaultDialogOpen,
    supportsFolderImport,
    dialog,
    showHiddenFiles,
    setShowHiddenFiles,
    setAiBuilderRequest,
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
    sidebarOpen,
    setSidebarOpen,
    setTasksGroupBy,
    setTaskSearchQuery,
    setTaskTagFilter,
    setTaskView,
    setIsWizardOpen,
    privacyLevel,
    setPrivacyLevel,
    revealAllSensitive,
    setRevealAllSensitive,
    setRevealedSensitivePaths,
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
