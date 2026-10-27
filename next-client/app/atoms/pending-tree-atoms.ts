import { atom } from "jotai";

// Rows for items that are being written and aren't indexed yet (a folder
// template being created). The file tree shows them at once, without a
// handle; they are removed when the real rows take over. Kept apart from
// atom_fileMetadata so search, tags, tasks and links never see notes that
// don't exist yet. Never persisted.
export interface PendingTreeEntry {
  /** Vault-relative file paths. */
  files: string[];
  /** Vault-relative folder paths. */
  folders: string[];
}

// By run id.
export const atom_pendingTreeEntries = atom<ReadonlyMap<string, PendingTreeEntry>>(new Map());

export const atom_addPendingTree = atom(null, (get, set, [id, entry]: [string, PendingTreeEntry]) => {
  const next = new Map(get(atom_pendingTreeEntries));
  next.set(id, entry);
  set(atom_pendingTreeEntries, next);
});

export const atom_removePendingTree = atom(null, (get, set, id: string) => {
  const next = new Map(get(atom_pendingTreeEntries));
  next.delete(id);
  set(atom_pendingTreeEntries, next);
});

const NONE = { files: new Set<string>(), folders: [] as string[] };

// Every pending path of every run, flattened.
export const atom_pendingTreePaths = atom((get) => {
  const entries = get(atom_pendingTreeEntries);
  if (entries.size === 0) return NONE;
  const files = new Set<string>();
  const folders: string[] = [];
  for (const entry of entries.values()) {
    entry.files.forEach((path) => files.add(path));
    folders.push(...entry.folders);
  }
  return { files, folders };
});
