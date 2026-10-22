"use client";

import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { atom_pinnedNotePaths, atom_toggleNotePin } from "@/app/atoms/note-pin-atoms";
import { useRouter } from "next/navigation";
import {
  atom_activeFilePath,
  atom_activePaneId,
  atom_vaultDescriptor,
  atom_closeTab,
  atom_workspaceLayout,
  findLeaf,
} from "@/app/atoms/atoms";
import { atom_content, atom_activeFileHandle } from "@/app/atoms/file-atoms";
import {
  atom_privacyLevel,
  atom_revealAllPrivate,
  atom_revealedPrivatePaths,
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
  atom_aiEnabled,
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
import { useCreateBoard } from "../../hooks/use-create-board";
import { atom_boardMarkdownPaths, atom_toggleBoardMarkdown } from "@/app/atoms/board-atoms";

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
    createFile,
    createFolder,
    createTemplate,
    isVaultSupported,
    isBrowserVaultSupported,
    exportVaultZip,
    exportVaultToFolder,
    importIntoVault,
    renameBrowserVault,
    deleteBrowserVault,
  } = useFileSystem();
  const createBoard = useCreateBoard(createFile);
  const boardMarkdownPaths = useAtomValue(atom_boardMarkdownPaths);
  const toggleBoardMarkdown = useSetAtom(atom_toggleBoardMarkdown);
  const vaultDescriptor = useAtomValue(atom_vaultDescriptor);
  const setBrowserVaultDialogOpen = useSetAtom(atom_browserVaultDialogOpen);
  const supportsFolderImport = supportsDirectoryInput();
  const dialog = useDialog();
  const [showHiddenFiles, setShowHiddenFiles] = useAtom(atom_showHiddenFiles);
  const [, setAiBuilderRequest] = useAtom(atom_aiBuilderRequest);
  const isAiEnabled = useAtomValue(atom_aiEnabled);
  const isAiConfigured = useAtomValue(atom_isAiConfigured);
  const content = useAtomValue(atom_content);
  const workspaceLayout = useAtomValue(atom_workspaceLayout);
  const activePaneId = useAtomValue(atom_activePaneId);
  const [, setActiveFilePath] = useAtom(atom_activeFilePath);
  const [, closeTab] = useAtom(atom_closeTab);
  const [, setNewVaultFlowOpen] = useAtom(atom_newVaultFlowOpen);
  const [sidebarOpen, setSidebarOpen] = useAtom(atom_sidebarOpen);
  const [, setTasksGroupBy] = useAtom(atom_tasksGroupBy);
  const [, setTaskSearchQuery] = useAtom(atom_taskSearchQuery);
  const [, setTaskTagFilter] = useAtom(atom_taskTagFilter);
  const [, setTaskView] = useAtom(atom_taskView);
  const [privacyLevel, setPrivacyLevel] = useAtom(atom_privacyLevel);
  const [revealAllPrivate, setRevealAllPrivate] = useAtom(atom_revealAllPrivate);
  const setRevealedPrivatePaths = useSetAtom(atom_revealedPrivatePaths);
  const activeFileHandle = useAtomValue(atom_activeFileHandle);
  const pinnedNotePaths = useAtomValue(atom_pinnedNotePaths);
  const toggleNotePin = useSetAtom(atom_toggleNotePin);
  const activeEditorView = useAtomValue(atom_activeEditorView);
  const activeLeaf = activePaneId ? findLeaf(workspaceLayout.rootContainer, activePaneId) : null;
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
    createBoard,
    boardMarkdownPaths,
    toggleBoardMarkdown,
    pinnedNotePaths,
    toggleNotePin,
    renameFile,
    deleteFile,
    duplicateFile,
    moveItem,
    createFolder,
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
    isAiEnabled,
    isAiConfigured,
    content,
    workspaceLayout,
    activePaneId,
    setActiveFilePath,
    closeTab,
    setNewVaultFlowOpen,
    sidebarOpen,
    setSidebarOpen,
    setTasksGroupBy,
    setTaskSearchQuery,
    setTaskTagFilter,
    setTaskView,
    privacyLevel,
    setPrivacyLevel,
    revealAllPrivate,
    setRevealAllPrivate,
    setRevealedPrivatePaths,
    activeFileHandle,
    activeEditorView,
    activeLeaf,
    activeFilePath,
    handleCopy,
    closeTabWithAutosave,
    runEditorCommand,
  };
}

export type EditorCommandContext = ReturnType<typeof useEditorCommandContext>;
