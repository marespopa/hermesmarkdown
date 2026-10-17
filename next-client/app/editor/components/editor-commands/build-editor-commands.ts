import type { Command } from "@/app/components/CommandPalette/CommandPaletteContext";
import { buildDocumentVaultCommandGroups } from "./document-vault-commands";
import { buildEditorAiCommandGroups } from "./editor-ai-commands";
import type { EditorCommandContext } from "./use-editor-command-context";
import { buildWorkspaceTaskViewCommandGroups } from "./workspace-task-view-commands";
import { buildGitHubVaultCommands } from "./github-vault-commands";
import { buildPrivacyCommands } from "./privacy-commands";
import { buildVaultStorageCommands } from "./vault-storage-commands";

export function buildEditorCommands(context: EditorCommandContext): Command[] {
  const documentVault = buildDocumentVaultCommandGroups(context);
  const editorAi = buildEditorAiCommandGroups(context);
  const workspaceTasksViews = buildWorkspaceTaskViewCommandGroups(context);
  const githubVault = buildGitHubVaultCommands(context);
  const vaultStorage = buildVaultStorageCommands(context);

  return [
    ...documentVault.lifecycle,
    ...workspaceTasksViews.panels,
    ...workspaceTasksViews.splitPaneRight,
    ...documentVault.fileOperations,
    ...workspaceTasksViews.paneClosure,
    ...workspaceTasksViews.preferencesAndNavigation,
    ...buildPrivacyCommands(context),
    ...documentVault.vaultActions,
    ...githubVault,
    ...vaultStorage,
    ...editorAi.aiMenu,
    ...editorAi.focusAndHistory,
    ...workspaceTasksViews.tabClosure,
    ...editorAi.editor,
    ...editorAi.templates,
    ...workspaceTasksViews.workspaceTasksAndViews,
  ];
}
