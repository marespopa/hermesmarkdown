import { WritableAtom, atom, createStore } from "jotai";
import { RESET, atomWithStorage } from "jotai/utils";
import { getAtomStorage } from "@/app/services/storage/atomStorage";

export type TimerData = {
  durationInMin: number;
};

// User-defined snippets
export type UserSnippet = {
  id: string; // Unique identifier
  key: string; // Trigger key (e.g., "/mysnippet")
  label: string; // Display name
  description: string; // Short description
  content: string; // Snippet template content
  category: string; // Custom category for organization
  createdAt: number; // Timestamp
  updatedAt: number; // Last update timestamp
};

export const contentStore = createStore();

// User-defined snippets management
export const atom_userSnippets = atomWithStorage<UserSnippet[]>(
  "userSnippets",
  [],
);

// Theme & appearance
export const atom_theme = atomWithStorage<"light" | "dark">("theme", "light");
export const atom_fontFamily = atomWithStorage<string>(
  "editorFontFamily",
  "Fira Mono, monospace",
);
export const atom_fontSize = atomWithStorage<string>(
  "editorFontSize",
  "prose-base",
);

// Timer functionality
export type SimpleTimerSessionState = {
  startTime: number | null;
  pauseTime: number;
  isTimerCounting: boolean;
  duration: number; // in seconds
};
export const atom_timerSettings = atomWithStorage("timerSettings", {
  durationInMin: 25,
} as TimerData);
export const atom_showTimer = atomWithStorage("showTimer", false);
export const atom_timerSessionState = atomWithStorage<SimpleTimerSessionState>(
  "timerSessionState",
  {
    startTime: null,
    pauseTime: 0,
    isTimerCounting: false,
    duration: 1500, // 25 minutes default
  },
);
export const atom_pomodoroPosition = atomWithStorage<{ x: number; y: number }>(
  "pomodoroPosition",
  { x: 16, y: 16 },
);
export const atom_pomodoroDragging = atom<boolean>(false);

// Editor file structure
export type Frontmatter = {
  title: string;
  description: string;
  fileName: string;
  tags: string;
};
export type OpenFile = {
  id: string; // Unique identifier for the file tab
  content: string; // Saved content
  contentEdited: string; // Working/unsaved content
  frontMatter: Frontmatter;
  isSaved: boolean;
};
export const atom_files = atomWithStorage<OpenFile[]>("files", []);
export const atom_selectedFileId = atomWithStorage<string | null>(
  "selectedFileId",
  null,
);
export const atom_currentFile = atom((get) => {
  const files = get(atom_files);
  const selectedId = get(atom_selectedFileId);
  return files.find((f) => f.id === selectedId) || null;
});

export const atom_sidebarCollapsed = atomWithStorage<boolean>(
  "sidebarCollapsed",
  false,
);

export const atom_showStatusBar = atomWithStorage<boolean>("showStatusBar", true); 
export const atom_isSaved = atom(false);

// Backward compatibility atoms (deprecated, kept for migration)
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
    }>,
  ],
  void
>;
type ContentAtom = WritableAtom<
  string,
  [SetStateActionWithReset<string>],
  void
>;
export const atom_liteContent = atomWithStorage("liteContent", "") as ContentAtom;
export const atom_content = atomWithStorage("content", "") as ContentAtom;
export const atom_contentEdited = atomWithStorage(
  "contentEdited",
  "",
) as ContentAtom;
export const atom_frontMatter = atomWithStorage("frontmatter", {
  title: "",
  description: "",
  fileName: "file",
  tags: "",
}) as FrontmatterAtom;

export const atom_pdfPreviewOpen = atom(false);
