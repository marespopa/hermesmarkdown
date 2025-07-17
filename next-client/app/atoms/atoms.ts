import { WritableAtom, atom, createStore } from "jotai";
import { RESET, atomWithStorage } from "jotai/utils";

export type TimerData = {
  workSessionDurationInMin: number;
  shortBreakSessionDurationInMin: number;
  longBreakSessionDurationInMin: number;
};

export const contentStore = createStore();

// Theme atom for dark/light mode
export const atom_theme = atomWithStorage<"light" | "dark">("theme", "light");

export const atom_timerSettings = atomWithStorage("timerSettings", {
  workSessionDurationInMin: 25,
  shortBreakSessionDurationInMin: 5,
  longBreakSessionDurationInMin: 15,
} as TimerData);

export const atom_fontFamily = atomWithStorage<string>("editorFontFamily", "Inter, system-ui, sans-serif");
export const atom_fontSize = atomWithStorage<string>("editorFontSize", "prose-base");

export type SimpleTimerSessionState = {
  startTime: number | null;
  pauseTime: number;
  isTimerCounting: boolean;
  duration: number; // in seconds
};

export const atom_timerSessionState = atomWithStorage<SimpleTimerSessionState>(
  "timerSessionState",
  {
    startTime: null,
    pauseTime: 0,
    isTimerCounting: false,
    duration: 1500, // 25 minutes default
  }
);

type SetStateActionWithReset<Value> =
  | Value
  | typeof RESET
  | ((prev: Value) => Value | typeof RESET);

type FrontmatterAtom = WritableAtom<
  {
    title: string;
    description: string;
    fileName: string;
    tags: string;
  },
  [
    SetStateActionWithReset<{
      title: string;
      description: string;
      fileName: string;
      tags: string;
    }>
  ],
  void
>;

type ContentAtom = WritableAtom<
  string,
  [SetStateActionWithReset<string>],
  void
>;

export type PanelStateAtom = WritableAtom<
  "both" | "editor" | "preview" | "none",
  [SetStateActionWithReset<"both" | "editor" | "preview" | "none">],
  void
>;

// File Atoms
export const atom_content = atomWithStorage("content", "") as ContentAtom;
export const atom_contentEdited = atomWithStorage(
  "contentEdited",
  ""
) as ContentAtom;
export const atom_frontMatter = atomWithStorage("frontmatter", {
  title: "",
  description: "",
  fileName: "file",
  tags: "",
}) as FrontmatterAtom;
export const atom_panelState = atomWithStorage("panelState", "both") as PanelStateAtom;
export const atom_showTimer = atomWithStorage("showTimer", false);
export const atom_sidebarCollapsed = atomWithStorage<boolean>("sidebarCollapsed", false);

export const atom_hasChanges = atom(false);
export const atom_isSaved = atom(false);

// Pomodoro Timer position atom
export const atom_pomodoroPosition = atomWithStorage<{ x: number; y: number }>("pomodoroPosition", { x: 0, y: 0 });
// Optional: atom for drag state
export const atom_pomodoroDragging = atom<boolean>(false);
