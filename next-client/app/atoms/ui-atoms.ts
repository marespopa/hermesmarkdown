import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

// Theme & appearance
export const atom_theme = atomWithStorage<"light" | "dark">("theme", "light");
export const atom_wordWrap = atomWithStorage<boolean>("wordWrap", true);
// Shared default monospace stack. Used both as the atom_fontFamily default and as the
// "System Mono" option value in settings, so active-state matching can't drift.
export const MONO_FONT_STACK =
  'ui-monospace, "SF Mono", "Cascadia Code", "JetBrains Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
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
// Transient — toggled via keyboard shortcut / command palette, not persisted.
// The doc-info panel (word/token count, structured score) is on-demand only.
export const atom_isDocInfoOpen = atom<boolean>(false);
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

export const atom_autoInjectFrontmatter = atomWithStorage<boolean>(
  "autoInjectFrontmatter",
  false,
);
export const atom_frontmatterHasPrompted = atomWithStorage<boolean>(
  "frontmatterHasPrompted",
  false,
);
export const atom_schemaAutoCreate = atomWithStorage<boolean>(
  "schemaAutoCreate",
  false,
);
export const atom_schemaWizardOpen = atom<boolean>(false);
export const atom_vaultMigrateOpen = atom<boolean>(false);

export const atom_sidebarWidth = atomWithStorage<number>("sidebarWidth", 260);

// The rail is always visible; `atom_railPanel` is which panel (if any) is
// open next to it — null means the sidebar is collapsed to just the rail.
// Transient — never persisted, since writing mode always starts clean (collapsed).
export type RailPanel = "files" | "search" | "tags" | "views";
export const atom_railPanel = atom<RailPanel | null>(null);

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
// Schema field key to jump the wizard to on open (e.g. from the health score panel's Fix button)
export const atom_frontmatterWizardTargetField = atom<string | null>(null);
export const atom_vaultSetupWizardOpen = atom<string | null>(null);

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

// Most-recently-used command ids for the command palette's empty-query state
// ("feels intelligent" with zero visible "recent" UI). Capped at 8 on write.
export const atom_recentCommandIds = atomWithStorage<string[]>("recentCommandIds", []);

export const atom_indexTimestamp = atom<number | null>(null);
