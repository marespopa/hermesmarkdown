import { atom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import type { EditorView } from "@codemirror/view";
import { atomWithChoiceStorage } from "./choice-storage";
import { tabSessionStorage } from "./session-storage";
import { DEFAULT_DARK_THEME, DEFAULT_LIGHT_THEME, type DarkTheme, type LightTheme } from "@/app/theme-palettes";

// Theme & appearance
export type Theme = "light" | "dark" | "system";

export function clearLegacyPaneModePreference() {
  if (typeof window === "undefined") return;
  try {
    // Pane modes from older versions: "defaultPaneMode", then the app-wide
    // Edit / Preview "viewMode". The editor has one mode now.
    window.localStorage.removeItem("defaultPaneMode");
    window.localStorage.removeItem("viewMode");
  } catch {
    // Ignore storage access failures; the app should still boot in the source editor.
  }
}

clearLegacyPaneModePreference();

export const atom_theme = atomWithStorage<Theme>("theme", "system");
// The palette each mode paints with (app/theme-palettes.ts): light mode uses
// atom_lightTheme, dark mode atom_darkTheme, so "system" switches between them.
export const atom_lightTheme = atomWithStorage<LightTheme>("lightTheme", DEFAULT_LIGHT_THEME);
export const atom_darkTheme = atomWithStorage<DarkTheme>("darkTheme", DEFAULT_DARK_THEME);
export const atom_wordWrap = atomWithStorage<boolean>("wordWrap", true);
export const atom_lineNumbers = atomWithStorage<boolean>("lineNumbers", false);
// Marks empty lines with ¶ and shows spaces and tabs (codemirror/invisibles.ts).
export const atom_showInvisibles = atomWithStorage<boolean>("showInvisibles", false);
export const atom_vimMode = atomWithStorage<boolean>("vimMode", false);
// The faint word count pill in the editor corner (WordCountPill). Off by default.
export const atom_showWordCount = atomWithStorage<boolean>("showWordCount", false);
// Lets the editor's text column fill the sheet instead of stopping at the
// reading width (--editor-measure, editor-typography.scss). On by default.
export const atom_fullWidth = atomWithStorage<boolean>("fullWidth", true);
// Focus (Settings → Editor): "hide" fades the pane header, sidebar and
// mobile file bar while you type, and moving the mouse brings them back
// (hooks/use-fade-chrome-while-typing.ts); "dim" does that too, and also
// fades every paragraph but the caret's and keeps the caret line centred
// (codemirror/flow-mode.ts); "sentence" is "dim" narrowed to the caret's
// sentence. "hide" by default.
export const FOCUS_MODES = ["off", "hide", "dim", "sentence"] as const;
export type FocusMode = (typeof FOCUS_MODES)[number];
export const atom_focusMode = atomWithChoiceStorage<FocusMode>("focusMode", FOCUS_MODES, "hide");
// Toggle Sentence Focus (Ctrl/Cmd+Alt+F): sentence focus on, or back to the
// level used before it ("hide" when there was none).
const atom_focusBeforeSentence = atom<FocusMode>("hide");
export const atom_toggleSentenceFocus = atom(null, (get, set) => {
  const current = get(atom_focusMode);
  if (current === "sentence") {
    set(atom_focusMode, get(atom_focusBeforeSentence));
    return;
  }
  set(atom_focusBeforeSentence, current);
  set(atom_focusMode, "sentence");
});
// The window's sidebar (desktop): open notes and the vault's file tree, on the
// leading edge. Hidden by default; toggled from the toolbar or Ctrl/Cmd+Alt+S.
export const atom_sidebarOpen = atomWithStorage<boolean>("sidebarOpen", false);
export const SIDEBAR_MIN_WIDTH = 200;
export const SIDEBAR_MAX_WIDTH = 420;
export const atom_sidebarWidth = atomWithStorage<number>("sidebarWidth", 256);
// Sidebar sections the user folded (by title: "Open Notes", "Files"), remembered.
export const atom_sidebarCollapsed = atomWithStorage<Record<string, boolean>>("sidebarCollapsed", {}, undefined, { getOnInit: true });
// Each stack falls back to the Apple system face with the same role.
export const MONO_FONT_STACK =
  'var(--font-geist-mono), "SF Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
export const UI_FONT_STACK =
  "var(--font-plus-jakarta), system-ui, -apple-system, ui-sans-serif, sans-serif";
// The duospaced writing face (fonts.ts) falls back to the monospace stack.
export const DUOSPACE_FONT_STACK = `var(--font-duospace), ${MONO_FONT_STACK}`;
// The proportional writing face (fonts.ts) falls back to the sans stack.
export const QUATTRO_FONT_STACK = `var(--font-quattro), ${UI_FONT_STACK}`;
export const atom_editorFontFamily = atomWithStorage<string>(
  "editorFontFamily",
  MONO_FONT_STACK,
);
// Saved choices from older versions move to their closest current equivalent:
// IBM Plex Mono to Geist Mono; for writing, Inter, Plus Jakarta Sans and
// Source Serif (none offered there) to Quattro, the proportional writing
// face; for reading they go to the interface sans; older stack
// strings to the current ones (so the
// picker still shows them as selected), and the 14–22px sizes up one pixel
// onto the Dynamic Type steps. Every target is a current value, so this is
// safe to run on each load.
const LEGACY_TEXT_SIZES: Record<string, string> = {
  "14px": "15px",
  "16px": "17px",
  "18px": "19px",
  "20px": "21px",
  "22px": "23px",
};

// First match wins, so stacks that fall back to another face's variable
// (Duospace to Geist Mono, Quattro to Plus Jakarta Sans) are checked before
// it. A saved sans goes to `sans`: Quattro for writing, the interface sans
// for reading.
const fontStacksByVariable = (sans: string): [string, string][] => [
  ["--font-duospace", DUOSPACE_FONT_STACK],
  ["--font-quattro", QUATTRO_FONT_STACK],
  ["--font-ibm-mono", MONO_FONT_STACK],
  ["--font-geist-mono", MONO_FONT_STACK],
  ["--font-plus-jakarta", sans],
  ["--font-source-serif", sans],
  ["--font-inter", sans],
];
const SANS_TARGET_BY_KEY: Record<string, string> = {
  editorFontFamily: QUATTRO_FONT_STACK,
  renderedFontFamily: UI_FONT_STACK,
};

export function migrateLegacyTypographyPreferences() {
  if (typeof window === "undefined") return;
  try {
    for (const [key, sans] of Object.entries(SANS_TARGET_BY_KEY)) {
      const saved = window.localStorage.getItem(key);
      if (!saved) continue;
      const stack = fontStacksByVariable(sans).find(([variable]) => saved.includes(variable))?.[1];
      if (stack && JSON.parse(saved) !== stack) {
        window.localStorage.setItem(key, JSON.stringify(stack));
      }
    }
    const size = window.localStorage.getItem("renderedFontSize");
    const next = size ? LEGACY_TEXT_SIZES[JSON.parse(size)] : undefined;
    if (next) window.localStorage.setItem("renderedFontSize", JSON.stringify(next));
  } catch {
    // Unreadable storage keeps the defaults.
  }
}

migrateLegacyTypographyPreferences();

// 1.65: open enough for a ~70-character column without the lines drifting apart.
export const atom_lineHeight = atomWithStorage<string>(
  "editorLineHeight",
  "1.65",
);
// Primary reading font and size. Source-editor typography has its own persisted
// font-family preference above.
export const RENDERED_FONT_STACK = UI_FONT_STACK;
export const atom_renderedFontFamily = atomWithStorage<string>(
  "renderedFontFamily",
  RENDERED_FONT_STACK,
);
export const atom_renderedFontSize = atomWithStorage<string>(
  "renderedFontSize",
  "17px",
);
export const atom_isEditorFocused = atom<boolean>(false);

// Whether the editor page shows the home feed in place of the workspace.
// Ephemeral: opening a note closes it.
export const atom_homeFeedOpen = atom<boolean>(false);
// Set by the landing page's "Resume": the next vault-open behavior keeps the
// restored tabs in front instead of opening the home feed, then clears it.
// In memory: it only has to survive the client-side navigation to /editor.
export const atom_resumeRequested = atom<boolean>(false);
// Bumped when Home is pressed while the feed is already open; HomeFeed
// scrolls back to the top on each change.
export const atom_homeFeedTopRequest = atom(0);
// The Home button and command: opens the feed, or, when it's already open,
// asks it to scroll back to the top.
export const atom_goHome = atom(null, (get, set) => {
  if (get(atom_homeFeedOpen)) set(atom_homeFeedTopRequest, (count) => count + 1);
  else set(atom_homeFeedOpen, true);
});
// Set by "Show Files" (desktop); WorkspaceSidebar focuses its Files tree and
// clears it. In memory: it only has to survive a navigation to /editor.
export const atom_filesFocusRequested = atom<boolean>(false);
// "Show Files" on desktop: shows the sidebar with its Files section unfolded,
// leaves the home feed (which has no sidebar) and asks for the tree's focus.
export const atom_showFiles = atom(null, (get, set) => {
  set(atom_sidebarOpen, true);
  if (get(atom_sidebarCollapsed).Files) set(atom_sidebarCollapsed, (previous) => ({ ...previous, Files: false }));
  set(atom_homeFeedOpen, false);
  set(atom_filesFocusRequested, true);
});
// The New Notes folder ("" = vault root; created on demand): where drafts are
// saved on their first save, and where notes made from a template or a link
// without a folder go.
export const atom_newNoteFolder = atomWithStorage<string>("newNoteFolder", "");
// Vault key the vault-open behavior last ran for, so returning to the editor
// from another route doesn't replace the file just opened there. Kept in
// sessionStorage: a refresh of the same tab reopens where you were (the note,
// or the feed via `?view=home`); a new tab or window runs it again.
export const atom_vaultOpenBehaviorAppliedFor = atomWithStorage<string | null>(
  "vaultOpenBehaviorAppliedFor",
  null,
  createJSONStorage<string | null>(tabSessionStorage),
  { getOnInit: true },
);

export const AUTOSAVE_MODES = ["afterDelay", "manual"] as const;
export type AutosaveMode = (typeof AUTOSAVE_MODES)[number];

// A stored mode this version no longer offers reads as "afterDelay".
export const atom_autosaveMode = atomWithChoiceStorage<AutosaveMode>("autosaveMode", AUTOSAVE_MODES, "afterDelay");

// Whether to record local/remote snapshots when a conflict is detected.
// Enabled by default to protect user edits; users can opt out in Settings.
export const atom_snapshotOnConflict = atomWithStorage<boolean>(
  "snapshotOnConflict",
  true,
);
// How long "afterDelay" autosave waits after the last keystroke (ms).
export const AUTOSAVE_DELAY = 2000;
// Set after the first visit (useFirstRun). The key predates the removal of
// the welcome tour, so people who finished the tour don't count as new.
export const atom_hasCompletedOnboarding = atomWithStorage<boolean>(
  "hasCompletedOnboarding",
  false,
);
export const atom_userName = atomWithStorage<string>("userName", "");
// "Not Now" on the FolderPrompt: it shrinks to a "Not saved to a folder"
// mark for the rest of the visit. In memory, so the next visit asks again.
export const atom_folderPromptDismissed = atom<boolean>(false);

// How notes open: the last collapse or expand clicked on any note's
// Properties row (no setting of its own). Same storage key as the old
// "Collapse Frontmatter" setting, so that choice carries over.
export const atom_frontmatterCollapsedByDefault = atomWithStorage<boolean>(
  "frontmatterCollapsedByDefault",
  false,
);
// Frontmatter collapsed / expanded per open file, so split panes showing the
// same note agree. In memory only; a missing entry follows the default above.
export const atom_frontmatterCollapsedByFile = atom<Record<string, boolean>>({});

// Fresh workspaces open directly in the source editor and never switch into a preview pane.
export const atom_frontmatterHasPrompted = atomWithStorage<boolean>(
  "frontmatterHasPrompted",
  false,
);
// Shows dotfiles/dotfolders (e.g. .hermes/) and underscore-prefixed skill/meta
// files in the file tree and search. Off by default, so the file tree
// stays focused on the user's own notes; the settings page and command
// palette offer a quick opt-in for when someone needs to see those files.
// node_modules and vendor stay excluded regardless, since they're never
// vault content.
export const atom_showHiddenFiles = atomWithStorage<boolean>(
  "hermes_show_hidden_files",
  false,
);
// File tree folder expansion, keyed by vault (see atom_vaultKey). Stores the
// user's manual overrides only; folders on the active file's path open
// automatically on top of this.
export interface FileTreeExpansion {
  expanded: string[];
  collapsed: string[];
}
export const atom_fileTreeExpansion = atomWithStorage<Record<string, FileTreeExpansion>>(
  "hermes_file_tree_expansion",
  {},
);
// Notes pinned to the top of the Home feed, keyed by vault (see
// atom_vaultKey), newest pin first. Read and toggled through
// home-pin-atoms.ts.
export const atom_homePins = atomWithStorage<Record<string, string[]>>("hermes_home_pins", {});
// The home feed's open-tasks list: folded until you open it.
export const atom_homeTasksCollapsed = atomWithStorage<boolean>("hermes_home_tasks_collapsed", true);

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
// Browser vault picker: create, reopen, or delete vaults kept in browser storage.
export const atom_browserVaultDialogOpen = atom<boolean>(false);
export const atom_keyboardShortcutsOpen = atom<boolean>(false);
export const atom_selectedFileTags = atom<string[]>([]);
export const atom_showCommandPaletteFab = atomWithStorage<boolean>(
  "showCommandPaletteFab",
  true,
);

// Tasks panel grouping mode ("status" or "file") for the All list,
// remembered across sessions
export const atom_tasksGroupBy = atomWithStorage<"status" | "file">(
  "tasksGroupBy",
  "status",
);

// The Tasks page's smart list (see app/editor/tasks/task-views.ts),
// remembered across sessions
export type TaskView = "now" | "today" | "upcoming" | "all" | "board";
export const atom_taskView = atomWithStorage<TaskView>("tasksView", "board");


// Set when navigating to a line in a note (a task from the Tasks view, a
// palette note-text result); consumed once by the editor pane whose filePath
// matches, to move the caret there, then cleared. `line` is 1-based;
// `column` (0-based, optional) places the caret within the line. Never
// persisted — purely a one-shot navigation signal.
export const atom_pendingScrollTarget = atom<{ path: string; line: number; column?: number } | null>(null);

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

// The AI Features switch. Off until turned on; never stored (null) reads as
// on when a key was saved before the switch existed, so those setups keep working.
const atom_aiEnabledStored = atomWithStorage<boolean | null>("hermes_ai_enabled", null);
export const atom_aiEnabled = atom(
  (get) => get(atom_aiEnabledStored) ?? (get(atom_claudeKey).trim().length > 0 || get(atom_geminiKey).trim().length > 0),
  (_get, set, enabled: boolean) => set(atom_aiEnabledStored, enabled),
);

export const atom_isAiConfigured = atom((get) => {
  if (!get(atom_aiEnabled)) return false;
  const provider = get(atom_aiProvider);
  const key = provider === "gemini" ? get(atom_geminiKey) : get(atom_claudeKey);
  return key.trim().length > 0;
});

export const atom_isFileLoading = atom<boolean>(false);

// Bumped to request the AI Builder dialog from outside the editor (e.g. the
// status bar), since the actual handler lives inside useAIEditorActions,
// scoped to the editor's textarea/value.
export const atom_aiBuilderRequest = atom<number>(0);

// The CM6 EditorView belonging to whichever pane is currently active: AI
// actions and palette editor commands target it.
export const atom_activeEditorView = atom<EditorView | null>(null);

export type PalettePinnedItem =
  | { kind: "file"; id: string }
  | { kind: "command"; id: string };

// Palette history stays on-device through the app's configured atom storage.
export const atom_recentCommandIds = atomWithStorage<string[]>("recentCommandIds", []);
export const atom_recentFilePaths = atomWithStorage<string[]>("recentFilePaths", []);
export const atom_commandUseCounts = atomWithStorage<Record<string, number>>("commandUseCounts", {});
export const atom_palettePinnedItems = atomWithStorage<PalettePinnedItem[]>("palettePinnedItems", []);
