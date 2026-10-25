import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

// Git Changes (Settings → Editor → View): gutter bars for the lines that
// differ from HEAD in a disk vault whose root has a `.git` folder
// (codemirror/git-changes.ts). Off by default.
export const atom_showGitChanges = atomWithStorage<boolean>("showGitChanges", false);

// Whether the open vault has a readable `.git` at its root. null until
// checked; false makes the palette command say why nothing shows.
export const atom_gitAvailable = atom<boolean | null>(null);
