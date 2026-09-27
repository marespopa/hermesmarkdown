import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import type { EditorView } from "@codemirror/view";

// Theme & appearance
export type Theme = "light" | "dark" | "system";

export function clearLegacyPaneModePreference() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem("defaultPaneMode");
  } catch {
    // Ignore storage access failures; the app should still boot in the source editor.
  }
}

clearLegacyPaneModePreference();

export const atom_theme = atomWithStorage<Theme>("theme", "system");
export const atom_wordWrap = atomWithStorage<boolean>("wordWrap", true);
export const atom_lineNumbers = atomWithStorage<boolean>("lineNumbers", false);
export const atom_vimMode = atomWithStorage<boolean>("vimMode", false);
export const MONO_FONT_STACK = "var(--font-ibm-mono), ui-monospace, monospace";
export const EDITORIAL_FONT_STACK =
  "var(--font-plus-jakarta), ui-sans-serif, sans-serif";
export const atom_editorFontFamily = atomWithStorage<string>(
  "editorFontFamily",
  EDITORIAL_FONT_STACK,
);
export const atom_lineHeight = atomWithStorage<string>(
  "editorLineHeight",
  "1.8",
);
// Primary reading font and size. Source-editor typography has its own persisted
// font-family preference above.
export const RENDERED_FONT_STACK = "var(--font-inter), Inter, ui-sans-serif, sans-serif";
export const atom_renderedFontFamily = atomWithStorage<string>(
  "renderedFontFamily",
  RENDERED_FONT_STACK,
);
export const atom_renderedFontSize = atomWithStorage<string>(
  "renderedFontSize",
  "18px",
);
export const atom_isEditorFocused = atom<boolean>(false);

export type AutosaveMode = "afterDelay" | "onFocusChange" | "manual";

export const atom_autosaveMode = atomWithStorage<AutosaveMode>(
  "autosaveMode",
  "afterDelay",
);

// Whether to record local/remote snapshots when a conflict is detected.
// Enabled by default to protect user edits; users can opt out in Settings.
export const atom_snapshotOnConflict = atomWithStorage<boolean>(
  "snapshotOnConflict",
  true,
);
export const atom_autosaveDelay = atomWithStorage<number>(
  "autosaveDelay",
  2000,
);
export const atom_hasCompletedOnboarding = atomWithStorage<boolean>(
  "hasCompletedOnboarding",
  false,
);
export const atom_userName = atomWithStorage<string>("userName", "");
export const atom_isWizardOpen = atom<boolean>(false);
// Survives the full-page reload caused by the Google Drive OAuth round-trip, so the
// wizard resumes where the user left off instead of restarting at the welcome step.
export const atom_welcomeWizardStep = atomWithStorage<number>(
  "welcomeWizardStep",
  0,
);

export const atom_frontmatterCollapsedByDefault = atomWithStorage<boolean>(
  "frontmatterCollapsedByDefault",
  false,
);

// Fresh workspaces open directly in the source editor and never switch into a preview pane.
export const atom_frontmatterHasPrompted = atomWithStorage<boolean>(
  "frontmatterHasPrompted",
  false,
);
// Shows dotfiles/dotfolders (e.g. .hermes/) and underscore-prefixed skill/meta
// files in the sidebar tree and search. Off by default, so the file tree
// stays focused on the user's own notes; the sidebar toggle, settings page,
// and command palette all offer a quick opt-in for when someone needs to see
// skills, AGENTS.md, and other files the app writes on their behalf.
// node_modules and vendor stay excluded regardless, since they're never
// vault content.
export const atom_showHiddenFiles = atomWithStorage<boolean>(
  "hermes_show_hidden_files",
  false,
);
export const atom_repurposeWizardOpen = atom<boolean>(false);

// Vault creation flow — transient, never persisted
export type VaultCreationSubStep = "name-and-folder" | "installing";
export const atom_vaultCreationSubStep = atom<VaultCreationSubStep | null>(null);
export const atom_vaultCreationName = atom<string>("");
export const atom_vaultCreationParentHandle = atom<FileSystemDirectoryHandle | null>(null);
export const atom_vaultCreationError = atom<string | null>(null);
// Post-onboarding trigger: set true to open the NewVaultDialog
export const atom_newVaultFlowOpen = atom<boolean>(false);
// GitHub selection is intentionally transient: repository credentials stay server-side.
export const atom_githubVaultDialogOpen = atom<boolean>(false);
export const atom_keyboardShortcutsOpen = atom<boolean>(false);
export const atom_workspaceBuilderRequest = atom<number>(0);
export const atom_selectedWorkspaceId = atom<string | null>(null);
export const atom_selectedFileTags = atom<string[]>([]);
export const atom_showCommandPaletteFab = atomWithStorage<boolean>(
  "showCommandPaletteFab",
  true,
);

// Tasks panel grouping mode ("status" or "file"), remembered across sessions
export const atom_tasksGroupBy = atomWithStorage<"status" | "file">(
  "tasksGroupBy",
  "status",
);

// Transient — never persisted, so each editor session starts fresh.
export type RailPanel = "files" | "search" | "tags" | "views" | "recent";
export const atom_railPanel = atom<RailPanel | null>(null);

// Set when navigating to a task from the Tasks view; consumed once by the
// editor pane whose filePath matches, to move the caret to that line, then
// cleared. Never persisted — purely a one-shot navigation signal.
export const atom_pendingScrollTarget = atom<{ path: string; line: number } | null>(null);

export type DialogType = "alert" | "confirm" | "prompt" | "select" | "new-file";

export interface DialogSelectOption {
  label: string;
  value: string;
}

export interface DialogConfig {
  type: DialogType;
  title?: string;
  message: string;
  subtext?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  defaultValue?: string;
  multiline?: boolean;
  allowReferences?: boolean;
  options?: DialogSelectOption[];
  resolve: (value: any) => void;
}

export const atom_globalDialog = atom<DialogConfig | null>(null);

export type IndexerState = "idle" | "compiling" | { status: "compiling"; count: number };
export const atom_indexerState = atom<IndexerState>("idle");


export type AiModelKey = string;
export const atom_selectedAiModel = atomWithStorage<AiModelKey>(
  "selectedAiModel",
  "sonnet-5",
);

export interface GeminiModelInfo {
  id: string;
  name: string;
}
export const atom_availableGeminiModels = atom<GeminiModelInfo[]>([]);

export interface ClaudeModelInfo {
  id: string;
  name: string;
}
export const atom_availableClaudeModels = atom<ClaudeModelInfo[]>([]);

// Ambient AI action status, surfaced as the status bar's center pill.
// `seq` lets a delayed "auto-clear to idle" timeout (see app/services/ai-status.ts)
// confirm it's not clobbering a newer action that started during its delay.
export type AiActionStatus =
  | { seq: number; status: "idle" }
  | { seq: number; status: "thinking"; label: string }
  | { seq: number; status: "done"; label: string }
  | { seq: number; status: "error"; message: string };
export const atom_aiActionStatus = atom<AiActionStatus>({ seq: 0, status: "idle" });

// AI Features
export type AIProvider = "claude" | "gemini";
export const atom_aiProvider = atomWithStorage<AIProvider>(
  "hermes_ai_provider",
  "claude",
);
export const atom_claudeKey = atomWithStorage<string>("hermes_claude_key", "");
export const atom_geminiKey = atomWithStorage<string>("hermes_gemini_key", "");

export const atom_isAiConfigured = atom((get) => {
  const provider = get(atom_aiProvider);
  const key = provider === "gemini" ? get(atom_geminiKey) : get(atom_claudeKey);
  return key.trim().length > 0;
});

export const atom_isFileLoading = atom<boolean>(false);

// Bumped to request the AI Builder dialog from outside the editor (e.g. the
// status bar), since the actual handler lives inside useAIEditorActions,
// scoped to the editor's textarea/value.
export const atom_aiBuilderRequest = atom<number>(0);

// Mirrors the shared voice-input hook state so any button can reflect
// listening/support status without owning the recognition itself.
export const atom_isVoiceInputListening = atom<boolean>(false);
export const atom_isVoiceInputSupported = atom<boolean>(false);
// Mirrors whether the voice preview panel is on screen (listening, or an
// unconfirmed draft/interim transcript left over), so panes other than the
// active one can dim themselves — a committed dictation always lands in the
// active pane, and dimming the rest makes that unambiguous at a glance.
export const atom_isVoicePreviewVisible = atom<boolean>(false);
// The CM6 EditorView belonging to whichever pane is currently active. The
// global voice-input hook inserts a committed dictation here, so "Insert"
// always lands in the pane the user is looking at regardless of which pane
// was active when dictation started.
export const atom_activeEditorView = atom<EditorView | null>(null);

export type PalettePinnedItem =
  | { kind: "file"; id: string }
  | { kind: "command"; id: string };

// Palette history stays on-device through the app's configured atom storage.
export const atom_recentCommandIds = atomWithStorage<string[]>("recentCommandIds", []);
export const atom_recentFilePaths = atomWithStorage<string[]>("recentFilePaths", []);
export const atom_commandUseCounts = atomWithStorage<Record<string, number>>("commandUseCounts", {});
export const atom_palettePinnedItems = atomWithStorage<PalettePinnedItem[]>("palettePinnedItems", []);
