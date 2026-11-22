// The folders added to a vault's library, kept in IndexedDB beside the
// vault's own handle: one record per vault, `{ primary, mounts }`. The record
// is used only when its `primary` is the same folder as the vault being
// opened, so two different folders that share a name never share mounts.
import { queryPermission, readKey, writeKey, deleteKeys } from "./idb";
import { CompositeDirectoryHandle, type LibraryMount } from "./library-roots";

interface StoredLibrary {
  primary: FileSystemDirectoryHandle;
  mounts: { name: string; handle: FileSystemDirectoryHandle }[];
}

const keyFor = (vaultKey: string) => `libraryFolders:${vaultKey}`;

async function isSame(a: FileSystemDirectoryHandle, b: FileSystemDirectoryHandle): Promise<boolean> {
  try {
    return await (a as any).isSameEntry(b);
  } catch {
    return false;
  }
}

// The added folders saved for `primary`; empty when none (or unreadable).
export async function loadLibraryMounts(
  vaultKey: string,
  primary: FileSystemDirectoryHandle,
): Promise<{ name: string; handle: FileSystemDirectoryHandle }[]> {
  try {
    const stored = await readKey<StoredLibrary>(keyFor(vaultKey));
    if (!stored?.primary || !Array.isArray(stored.mounts)) return [];
    if (!(await isSame(stored.primary, primary))) return [];
    return stored.mounts.filter((m) => m && typeof m.name === "string" && m.handle);
  } catch (err) {
    console.warn("Failed to load the library's folders:", err);
    return [];
  }
}

// Saves the added folders (real handles only: the record is structured-cloned).
export async function saveLibraryMounts(
  vaultKey: string,
  primary: FileSystemDirectoryHandle,
  mounts: readonly LibraryMount[],
): Promise<void> {
  if (mounts.length === 0) {
    await deleteKeys([keyFor(vaultKey)]);
    return;
  }
  const record: StoredLibrary = {
    primary,
    mounts: mounts.map(({ name, handle }) => ({ name, handle })),
  };
  await writeKey(keyFor(vaultKey), record);
}

// Whether the browser still lets the app read and write `handle`, asking
// nothing (no prompt opens outside a click). Never throws.
export async function hasAccess(handle: FileSystemDirectoryHandle): Promise<boolean> {
  try {
    return await queryPermission(handle);
  } catch {
    return false;
  }
}

// The handle the vault opens with: the folder itself when nothing was added
// to it, or a library of the folder and its added folders. Folders whose
// access has lapsed are kept, locked, so their open notes stay open.
export async function buildLibraryHandle(
  vaultKey: string,
  primary: FileSystemDirectoryHandle,
): Promise<FileSystemDirectoryHandle> {
  const stored = await loadLibraryMounts(vaultKey, primary);
  if (stored.length === 0) return primary;
  const mounts: LibraryMount[] = await Promise.all(
    stored.map(async (m) => ({ ...m, locked: !(await hasAccess(m.handle)) })),
  );
  return new CompositeDirectoryHandle(primary, mounts) as unknown as FileSystemDirectoryHandle;
}

// The library with each unlocked folder's access checked again: the same
// handle when nothing changed, else a new one with the folders that lost
// access locked (a click on the row asks again).
export async function withLapsedFoldersLocked(root: FileSystemDirectoryHandle): Promise<FileSystemDirectoryHandle> {
  if (!(root instanceof CompositeDirectoryHandle)) return root;
  const checked = await Promise.all(
    root.mounts.map(async (m) => (m.locked || (await hasAccess(m.handle)) ? m : { ...m, locked: true })),
  );
  if (checked.every((m, i) => m === root.mounts[i])) return root;
  return new CompositeDirectoryHandle(root.primary, checked) as unknown as FileSystemDirectoryHandle;
}
