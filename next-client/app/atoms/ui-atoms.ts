import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import type { EditorView } from "@codemirror/view";
import { atomWithChoiceStorage } from "./choice-storage";
import { DEFAULT_DARK_THEME, DEFAULT_LIGHT_THEME, type DarkTheme, type LightTheme } from "@/app/theme-palettes";

// AI provider, keys and the AI Features switch live in ai-atoms; re-exported here.
export * from "./ai-atoms";

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
// The note's outline in the pane's bottom-right corner (EditorOutline;
// Ctrl/Cmd+Shift+M, Settings → Editor → View). Off by default.
export const atom_showOutline = atomWithStorage<boolean>("showOutline", false);
// Lets the editor's text column fill the sheet instead of stopping at the
// reading width (--editor-measure, editor-typography.scss). On by default.
export const atom_fullWidth = atomWithStorage<boolean>("fullWidth", true);
// Focus (Settings → Editor): "dim" fades every paragraph but the caret's
// and keeps the caret line centred (codemirror/flow-mode.ts); "sentence" is
// "dim" narrowed to the caret's sentence. Off by default. Focus never hides
// the interface: the sidebar and the toolbar go away only when you close
// them. A "hide" saved by an older version reads as "off".
export const FOCUS_MODES = ["off", "dim", "sentence"] as const;
export type FocusMode = (typeof FOCUS_MODES)[number];
export const atom_focusMode = atomWithChoiceStorage<FocusMode>("focusMode", FOCUS_MODES, "off");
// Toggle Sentence Focus (Ctrl/Cmd+Alt+F): sentence focus on, or back to the
// level used before it ("off" when there was none).
const atom_focusBeforeSentence = atom<FocusMode>("off");
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
// leading edge. Hidden by default; toggled from its corner button, Ctrl/Cmd+\\ or Ctrl/Cmd+Alt+S.
export const atom_sidebarOpen = atomWithStorage<boolean>("sidebarOpen", false);
// The minimum leaves the header's vault switcher room for a short vault name
// beside its two buttons (a longer one truncates).
export const SIDEBAR_MIN_WIDTH = 240;
export const SIDEBAR_MAX_WIDTH = 420;
const clampSidebarWidth = (width: number) => Math.round(Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, width)));
const atom_sidebarWidthStored = atomWithStorage<number>("sidebarWidth", 256);
// Read and written within the bounds, so a width saved under an older,
// smaller minimum opens at the current one.
export const atom_sidebarWidth = atom(
  (get) => clampSidebarWidth(get(atom_sidebarWidthStored)),
  (_get, set, width: number) => set(atom_sidebarWidthStored, clampSidebarWidth(width)),
);
// Settings → Editor → Close Sidebar While Writing: typing in a note puts the
// sidebar away, so the page has the window to itself. Off by default: the
// sidebar otherwise closes only when you close it.
export const atom_closeSidebarWhileWriting = atomWithStorage<boolean>("closeSidebarWhileWriting", false);
// Sidebar sections the user folded (by title: "Pinned", "Files"), remembered.
export const atom_sidebarCollapsed = atomWithStorage<Record<string, boolean>>("sidebarCollapsed", {}, undefined, { getOnInit: true });
// Each stack falls back to the Apple system face with the same role.
export const MONO_FONT_STACK =
  'var(--font-geist-mono), "SF Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
export const UI_FONT_STACK =
  "var(--font-plus-jakarta), system-ui, -apple-system, ui-sans-serif, sans-serif";
// The duospaced writing face (fonts.ts) falls back to the monospace stack.
export const DUOSPACE_FONT_STACK = `var(--font-duospace), ${MONO_FONT_STACK}`;
// The code faces (Settings → Typography → Code font): Geist Mono (the
// default), JetBrains Mono, Fira Code, or the system's own monospace. Each
// falls back to the monospace stack.
export const JETBRAINS_MONO_FONT_STACK = `var(--font-jetbrains-mono), ${MONO_FONT_STACK}`;
export const FIRA_CODE_FONT_STACK = `var(--font-fira-code), ${MONO_FONT_STACK}`;
export const SYSTEM_MONO_FONT_STACK = '"SF Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
export const CODE_FONT_STACKS = [
  MONO_FONT_STACK,
  JETBRAINS_MONO_FONT_STACK,
  FIRA_CODE_FONT_STACK,
  SYSTEM_MONO_FONT_STACK,
] as const;
// Code blocks and inline code, as `--font-code` on <html> (ThemeProvider;
// THEME_INIT_SCRIPT before the first paint).
export const atom_codeFontFamily = atomWithChoiceStorage<string>("codeFontFamily", CODE_FONT_STACKS, MONO_FONT_STACK);
// The proportional writing face (fonts.ts) falls back to the sans stack.
export const QUATTRO_FONT_STACK = `var(--font-quattro), ${UI_FONT_STACK}`;
// The writing face: Quattro, proportional, by default, so a note reads as a
// page rather than code. Geist Mono and Duospace are a pick away.
export const atom_editorFontFamily = atomWithStorage<string>(
  "editorFontFamily",
  QUATTRO_FONT_STACK,
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

// Set by "Show Files" (desktop); WorkspaceSidebar focuses its Files tree and
// clears it. In memory: it only has to survive a navigation to /editor.
export const atom_filesFocusRequested = atom<boolean>(false);
// With a focus request, the folder (or note) the Files tree should select and
// scroll to instead of its own cursor row ("Show in Files"); cleared with it.
export const atom_filesRevealPath = atom<string | null>(null);
// Set by the sidebar's New note button on any /editor route; the editor page
// starts the new note (its draft flow) and clears it. In memory: it only has
// to survive a navigation to /editor.
export const atom_newNoteRequested = atom<boolean>(false);
// Set by the pane title's save indicator; the editor page saves the note in
// front (its Save command) and clears it.
export const atom_saveRequested = atom<boolean>(false);
// "Show Files" on desktop: shows the sidebar with its Files section unfolded
// and asks for the tree's focus.
export const atom_showFiles = atom(null, (get, set) => {
  set(atom_sidebarOpen, true);
  if (get(atom_sidebarCollapsed).Files) set(atom_sidebarCollapsed, (previous) => ({ ...previous, Files: false }));
  set(atom_filesFocusRequested, true);
});
// The New Files folder ("" = vault root; created on demand): where drafts are
// saved on their first save, and where notes made from a template or a link
// without a folder go.
export const atom_newNoteFolder = atomWithStorage<string>("newNoteFolder", "");

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
// Settings → General → Terminal: the user and host the "Open Terminal"
// palette command opens as ssh://user@host through the OS's SSH handler
// (services/terminal-uri.ts). An empty user leaves it out of the URI.
export const atom_terminalUser = atomWithStorage<string>("terminalUser", "");
export const atom_terminalHost = atomWithStorage<string>("terminalHost", "localhost");
// "Not Now" on the FolderPrompt: it shrinks to a "Not saved to a folder"
// mark for the rest of the visit. In memory, so the next visit asks again.
export const atom_folderPromptDismissed = atom<boolean>(false);
// Folded heading sections per note path, by heading line (heading-fold.ts),
// so a note reopened later in the visit folds the same headings. In memory:
// a new visit opens every note unfolded.
export const atom_headingFolds = atom<Record<string, string[]>>({});

export const atom_frontmatterHasPrompted = atomWithStorage<boolean>(
  "frontmatterHasPrompted",
  false,
);
// Shows dotfiles/dotfolders (e.g. .hermesmarkdown/) and underscore-prefixed skill/meta
// files in the file tree and search. Off by default, so the file tree
// stays focused on the user's own notes; the settings page and command
// palette offer a quick opt-in for when someone needs to see those files.
// node_modules and vendor stay excluded regardless, since they're never
// vault content.
export const atom_showHiddenFiles = atomWithStorage<boolean>(
  "hermes_show_hidden_files",
  false,
);
// The palette's `/` text search includes Markdown and other readable text
// files by default. When enabled, it restricts results to Markdown notes.
export const atom_searchMarkdownOnly = atomWithStorage<boolean>("hermes_search_markdown_only", false);
// The `/` search reads the query as a regular expression (the palette's
// Regex chip, Alt+R). Remembered, like a find bar's regex toggle.
export const atom_searchRegex = atomWithStorage<boolean>("hermes_search_regex", false);
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

// Vault creation flow — transient, never persisted
export type VaultCreationSubStep = "name-and-folder" | "installing";
export const atom_vaultCreationSubStep = atom<VaultCreationSubStep | null>(null);
export const atom_vaultCreationName = atom<string>("");
export const atom_vaultCreationParentHandle = atom<FileSystemDirectoryHandle | null>(null);
export const atom_vaultCreationError = atom<string | null>(null);
// Post-onboarding trigger: set true to open the NewVaultDialog
export const atom_newVaultFlowOpen = atom<boolean>(false);
// Browser vault picker: create, reopen, or delete vaults kept in browser storage.
export const atom_browserVaultDialogOpen = atom<boolean>(false);
// Recent Vaults: reorder, pin or remove the vault switcher's recent vaults.
export const atom_recentVaultsDialogOpen = atom<boolean>(false);
// The emoji picked in Create Vault, for the vault of that name once it opens
// (useRecentVaultTracker puts it on the vault's recents entry).
export const atom_pendingVaultIcon = atom<{ name: string; icon: string } | null>(null);
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
  "auto",
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

export interface OllamaModelInfo {
  id: string;
  name: string;
}
export const atom_availableOllamaModels = atom<OllamaModelInfo[]>([]);

// Ambient AI action status, surfaced as the status bar's center pill.
// `seq` lets a delayed "auto-clear to idle" timeout (see app/services/ai-status.ts)
// confirm it's not clobbering a newer action that started during its delay.
export type AiActionStatus =
  | { seq: number; status: "idle" }
  | { seq: number; status: "thinking"; label: string }
  | { seq: number; status: "done"; label: string }
  | { seq: number; status: "error"; message: string };
export const atom_aiActionStatus = atom<AiActionStatus>({ seq: 0, status: "idle" });

export const atom_isFileLoading = atom<boolean>(false);
// The file openFile is opening, set before its text is read: the pane shows
// its title (and a body skeleton) and the sidebar marks it current at once.
export const atom_openingFilePath = atom<string | null>(null);
// A note shown at once from memory while openFile checks the disk behind it
// (use-open-file.ts): its editor takes no typing until the check is done,
// so a newer disk text can replace it without losing a keystroke.
export const atom_verifyingNotePath = atom<string | null>(null);

// Bumped to open the AI companion from outside the editor page (Ask AI,
// Ctrl/Cmd+J, the slash menu); the editor page opens it with the note in
// front and its selection (companion/use-open-companion.ts).
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
