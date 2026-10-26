import { atom } from "jotai";

export type BusyOp = "rename" | "move" | "trash" | "delete" | "undo";

export interface BusyPath {
  op: BusyOp;
  // The name a rename gives the item, shown on its row right away.
  newName?: string;
}

// Vault paths a rename, move, move to Trash, delete or undo is working on.
// Their rows show a spinner and take no actions until it is done; a busy
// folder covers everything inside it. Never persisted.
export const atom_busyPaths = atom<ReadonlyMap<string, BusyPath>>(new Map());

// The busy entry for `path`: its own, or that of a folder it is in (without
// the folder's new name, which isn't this item's).
export function busyEntry(busy: ReadonlyMap<string, BusyPath>, path: string): BusyPath | undefined {
  if (busy.size === 0) return undefined;
  const own = busy.get(path);
  if (own) return own;
  for (const [busyPath, entry] of busy) {
    if (path.startsWith(`${busyPath}/`)) return { op: entry.op };
  }
  return undefined;
}

export const atom_markBusy = atom(null, (get, set, entries: [string, BusyPath][]) => {
  const next = new Map(get(atom_busyPaths));
  for (const [path, entry] of entries) next.set(path, entry);
  set(atom_busyPaths, next);
});

export const atom_clearBusy = atom(null, (get, set, paths: string[]) => {
  const next = new Map(get(atom_busyPaths));
  for (const path of paths) next.delete(path);
  set(atom_busyPaths, next);
});
