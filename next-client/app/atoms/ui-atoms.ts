import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import type { EditorView } from "@codemirror/view";

// Theme & appearance
export const atom_theme = atomWithStorage<"light" | "dark">("theme", "light");
export const atom_wordWrap = atomWithStorage<boolean>("wordWrap", true);
// Shared default monospace stack, used as the atom_fontFamily default so active-state
// matching in settings can't drift from the IBM Plex Mono entry in FONTS.
export const MONO_FONT_STACK = "var(--font-ibm-mono), ui-monospace, monospace";
export const atom_fontFamily = atomWithStorage<string>(
  "editorFontFamily",
  MONO_FONT_STACK,
);
export const atom_fontSize = atomWithStorage<string>("editorFontSize", "17px");
export const atom_lineHeight = atomWithStorage<string>(
  "editorLineHeight",
  "1.8",
);
export const atom_letterSpacing = atomWithStorage<string>(
  "editorLetterSpacing",
  "normal",
);
export const atom_isEditorFocused = atom<boolean>(false);
export const atom_cursorPosition = atom<{ line: number; col: number }>({
  line: 1,
  col: 1,
});
export const atom_statusMetricMode = atomWithStorage<
  "words" | "chars" | "readingTime"
>("statusMetricMode", "words");
export const atom_isAutoSaveEnabled = atomWithStorage<boolean>(
  "isAutoSaveEnabled",
  true,
);

export type AutosaveMode = "afterDelay" | "onFocusChange" | "manual";

export const atom_autosaveMode = atomWithStorage<AutosaveMode>(
  "autosaveMode",
  "afterDelay",
);
export const atom_autosaveDelay = atomWithStorage<number>(
  "autosaveDelay",
  2000,
);
export const atom_editorWidth = atomWithStorage<"standard" | "narrow">(
  "editorWidth",
  "standard",
);
export const atom_hasCompletedOnboarding = atomWithStorage<boolean>(
  "hasCompletedOnboarding",
  false,
);
export const atom_isWizardOpen = atom<boolean>(false);
// Survives the full-page reload caused by the Google Drive OAuth round-trip, so the
// wizard resumes where the user left off instead of restarting at the welcome step.
export const atom_welcomeWizardStep = atomWithStorage<number>(
  "welcomeWizardStep",
  0,
);

export const atom_autoInjectFrontmatter = atomWithStorage<boolean>(
  "autoInjectFrontmatter",
  false,
);
export const atom_frontmatterDefaultMode = atomWithStorage<"fields" | "raw">(
  "frontmatterDefaultMode",
  "fields",
);
export const atom_frontmatterHasPrompted = atomWithStorage<boolean>(
  "frontmatterHasPrompted",
  false,
);
// Shows dotfiles/dotfolders (e.g. .hermes/) and underscore-prefixed skill/meta
// files in the sidebar tree and search. Off by default, so the file tree
// stays focused on the user's own notes; the sidebar toggle, settings page,
// and command palette all offer a quick opt-in for when someone needs to see
// skills, AGENTS.md, voice.md, and other files the app writes on their
// behalf. node_modules and vendor stay excluded regardless, since they're
// never vault content.
export const atom_showHiddenFiles = atomWithStorage<boolean>(
  "hermes_show_hidden_files",
  false,
);
export const atom_voiceWizardOpen = atom<boolean>(false);
export const atom_repurposeWizardOpen = atom<boolean>(false);
// One-time nudge suggesting voice.md setup — set once the nudge has been
// shown (dismissed or acted on) or once a voice.md is found to already exist,
// so it never asks again.
export const atom_voiceMdNudgeDismissed = atomWithStorage<boolean>(
  "voiceMdNudgeDismissed",
  false,
);

// Vault creation flow — transient, never persisted
export type VaultCreationSubStep = "name-and-folder" | "installing";
export const atom_vaultCreationSubStep = atom<VaultCreationSubStep | null>(null);
export const atom_vaultCreationName = atom<string>("");
export const atom_vaultCreationParentHandle = atom<FileSystemDirectoryHandle | null>(null);
export const atom_vaultCreationError = atom<string | null>(null);
// Post-onboarding trigger: set true to open the NewVaultDialog
export const atom_newVaultFlowOpen = atom<boolean>(false);

// No getOnInit: the server has no localStorage and always renders the 260
// default, so reading it eagerly on the client would mismatch the SSR HTML
// and trigger a hydration error. The default-then-localStorage-on-mount
// jump is expected; see atom_isSidebarResizing below for why that jump
// used to leave a visible gap during resize.
export const atom_sidebarWidth = atomWithStorage<number>("sidebarWidth", 260);

// True only while the sidebar's drag-resize handle is active. The width
// transitions on the toggle button/clip container in page.tsx are meant
// for the open/close animation only — during a live drag they'd otherwise
// keep easing toward each mousemove target instead of tracking the mouse,
// leaving a lagging gap for ~300ms after the drag ends.
export const atom_isSidebarResizing = atom<boolean>(false);

// The icon rail (SidebarRail.tsx) is always visible; atom_railPanel is
// which panel (if any) is open next to it — null means the sidebar is
// collapsed to just the rail. Transient — never persisted, since writing
// mode always starts clean (collapsed) on load.
export type RailPanel = "files" | "search" | "tags" | "views" | "tasks";
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

export const atom_selectionCount = atom<number>(0);
export type IndexerState = "idle" | "compiling" | { status: "compiling"; count: number };
export const atom_indexerState = atom<IndexerState>("idle");


export type AiModelKey = string;
export const atom_selectedAiModel = atomWithStorage<AiModelKey>(
  "selectedAiModel",
  "sonnet-4-6",
);

export interface GeminiModelInfo {
  id: string;
  name: string;
}
export const atom_availableGeminiModels = atom<GeminiModelInfo[]>([]);

// Holds the file path being edited, or null when closed
export const atom_frontmatterWizardOpen = atom<string | null>(null);
// Field key to jump the wizard to on open
export const atom_frontmatterWizardTargetField = atom<string | null>(null);

// Ambient AI action status, surfaced as the status bar's center pill.
// `seq` lets a delayed "auto-clear to idle" timeout (see app/services/ai-status.ts)
// confirm it's not clobbering a newer action that started during its delay.
export type AiActionStatus =
  | { seq: number; status: "idle" }
  | { seq: number; status: "thinking"; label: string }
  | { seq: number; status: "done"; label: string }
  | { seq: number; status: "error"; message: string };
export const atom_aiActionStatus = atom<AiActionStatus>({ seq: 0, status: "idle" });

// Derived: true while any AI request (auto-fix, frontmatter wizard, selection
// actions) is in flight, so the editor can block typing and show an overlay
// regardless of which feature triggered the call.
export const atom_isAiBusy = atom((get) => get(atom_aiActionStatus).status === "thinking");

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

// Bumped to toggle voice dictation from outside the editor (the FAB group
// next to the AI chat button). The SpeechRecognition session itself is a
// single instance shared by the whole app (see use-global-voice-input.ts),
// not one per pane — so switching panes mid-dictation never drops it.
export const atom_voiceInputRequest = atom<number>(0);
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

// Most-recently-used command ids for the command palette's empty-query state
// ("feels intelligent" with zero visible "recent" UI). Capped at 8 on write.
export const atom_recentCommandIds = atomWithStorage<string[]>("recentCommandIds", []);

export const atom_indexTimestamp = atom<number | null>(null);

// Whether the pane tab bar starts expanded or collapsed. Each pane still
// tracks its own open/closed state locally (see PaneLeaf.tsx) so a user can
// toggle it per-pane during a session; this only controls the initial value.
export const atom_tabsBarVisibleByDefault = atomWithStorage<boolean>(
  "tabsBarVisibleByDefault",
  false,
);
