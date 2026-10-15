import { atom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import { tabSessionStorage } from "./session-storage";

// Board state that never goes into the file. Import this file directly, not
// through the `atoms.ts` barrel.

export interface BoardViewport {
  scrollX: number;
  scrollY: number;
  zoom: number;
}

// Scroll and zoom per path, in this browser tab only.
export const atom_boardViewports = atomWithStorage<Record<string, BoardViewport>>(
  "hermes_board_viewport",
  {},
  createJSONStorage<Record<string, BoardViewport>>(tabSessionStorage),
  { getOnInit: true },
);

// Boards the user opened as Markdown this session (in memory, not persisted).
export const atom_boardMarkdownPaths = atom<ReadonlySet<string>>(new Set<string>());

export const atom_toggleBoardMarkdown = atom(null, (get, set, path: string) => {
  const next = new Set(get(atom_boardMarkdownPaths));
  if (!next.delete(path)) next.add(path);
  set(atom_boardMarkdownPaths, next);
});
