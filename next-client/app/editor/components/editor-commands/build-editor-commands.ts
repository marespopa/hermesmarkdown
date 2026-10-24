import type { Command } from "@/app/components/CommandPalette/CommandPaletteContext";
import { buildDocumentVaultCommandGroups } from "./document-vault-commands";
import { buildEditorAiCommandGroups } from "./editor-ai-commands";
import type { EditorCommandContext } from "./use-editor-command-context";
import { buildWorkspaceTaskViewCommandGroups } from "./workspace-task-view-commands";
import { buildPrivacyCommands } from "./privacy-commands";
import { buildVaultStorageCommands } from "./vault-storage-commands";

export function buildEditorCommands(context: EditorCommandContext): Command[] {
  const documentVault = buildDocumentVaultCommandGroups(context);
  const editorAi = buildEditorAiCommandGroups(context);
  const workspaceTasksViews = buildWorkspaceTaskViewCommandGroups(context);
  const vaultStorage = buildVaultStorageCommands(context);

  return [
    ...documentVault.lifecycle,
    ...workspaceTasksViews.panels,
    ...documentVault.fileOperations,
    ...workspaceTasksViews.tabsClosure,
    ...workspaceTasksViews.preferencesAndNavigation,
    ...buildPrivacyCommands(context),
    ...documentVault.vaultActions,
    ...vaultStorage,
    ...editorAi.aiMenu,
    ...editorAi.focusAndHistory,
    ...workspaceTasksViews.tabClosure,
    ...editorAi.editor,
    ...editorAi.templates,
    ...workspaceTasksViews.workspaceTasksAndViews,
  ];
}
