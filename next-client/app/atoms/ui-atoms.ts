import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

// Theme & appearance
export const atom_theme = atomWithStorage<"light" | "dark">("theme", "light");
export const atom_wordWrap = atomWithStorage<boolean>("wordWrap", true);
export const atom_fontFamily = atomWithStorage<string>(
  "editorFontFamily",
  'ui-monospace, "SF Mono", "Cascadia Code", "JetBrains Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
);
export const atom_fontSize = atomWithStorage<string>("editorFontSize", "16px");
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

export const atom_sidebarWidth = atomWithStorage<number>("sidebarWidth", 260);
export const atom_isSidebarOpen = atomWithStorage<boolean>("isSidebarOpen", true);

export type DialogType = "alert" | "confirm" | "prompt";

export interface DialogConfig {
  type: DialogType;
  title?: string;
  message: string;
  subtext?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  defaultValue?: string;
  resolve: (value: any) => void;
}

export const atom_globalDialog = atom<DialogConfig | null>(null);
