import { atom } from "jotai";
import type { ChangesResult } from "@/app/services/git/git-changes-types";
import { atomWithStorage } from "jotai/utils";

// Git Changes (Settings → Editor → View): gutter bars for the lines that
// differ from HEAD in a disk vault whose root has a `.git` folder
// (codemirror/git-changes.ts). Off by default.
export const atom_showGitChanges = atomWithStorage<boolean>("showGitChanges", false);

// Whether the open vault has a readable `.git` at its root. null until
// checked; false makes the palette command say why nothing shows.
export const atom_gitAvailable = atom<boolean | null>(null);

// How many editors are still reading HEAD's text for Git Changes (read in
// use-git-baseline.ts until the diff is shown). The corner toggle spins while
// it's above 0.
export const atom_gitLoading = atom(0);

// The Changes page's last scan (editor/changes/use-git-changes.ts), shown at
// once on return while a new scan runs. A plain atom, not persisted.
export const atom_gitChangesCache = atom<{ vault: FileSystemDirectoryHandle; result: ChangesResult } | null>(null);
