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
export const atom_fontSize = atomWithStorage<string>("editorFontSize", "16px");
export const atom_lineHeight = atomWithStorage<string>(
  "editorLineHeight",
  "1.8",
);
export const atom_letterSpacing = atomWithStorage<string>(
  "editorLetterSpacing",
  "normal",
);
export const atom_showStats = atomWithStorage<boolean>("showStats", true);
export const atom_isZenModeActive = atomWithStorage<boolean>(
  "isZenModeActive",
  false,
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

export const atom_currency = atomWithStorage<string>("currencyCode", "USD");

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

export const atom_sidebarWidth = atomWithStorage<number>("sidebarWidth", 260);
export const atom_isSidebarOpen = atomWithStorage<boolean>(
  "isSidebarOpen",
  true,
);

export type SidebarTab = "content" | "views";
export const atom_sidebarTabOrder = atomWithStorage<SidebarTab[]>(
  "sidebarTabOrder",
  ["content", "views"],
);

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
export const atom_vaultSetupWizardOpen = atom<string | null>(null);

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
