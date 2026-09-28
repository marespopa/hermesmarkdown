import type { Command } from "@/app/components/CommandPalette/CommandPaletteContext";
import { buildDocumentVaultCommandGroups } from "./document-vault-commands";
import { buildEditorAiVoiceCommandGroups } from "./editor-ai-voice-commands";
import type { EditorCommandContext } from "./use-editor-command-context";
import { buildWorkspaceTaskViewCommandGroups } from "./workspace-task-view-commands";
import { buildGitHubVaultCommands } from "./github-vault-commands";
import { buildVaultStorageCommands } from "./vault-storage-commands";

export function buildEditorCommands(context: EditorCommandContext): Command[] {
  const documentVault = buildDocumentVaultCommandGroups(context);
  const editorAiVoice = buildEditorAiVoiceCommandGroups(context);
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
    ...documentVault.vaultActions,
    ...githubVault,
    ...vaultStorage,
    ...editorAiVoice.aiEntryPoints,
    ...editorAiVoice.focusAndHistory,
    ...workspaceTasksViews.tabClosure,
    ...editorAiVoice.editor,
    ...editorAiVoice.templates,
    ...workspaceTasksViews.workspaceTasksAndViews,
    ...editorAiVoice.aiActions,
    ...editorAiVoice.voice,
  ];
}
