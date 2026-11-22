// A library: the open vault's folder plus other disk folders added to it.
// Each added folder ("mount") shows as a top-level folder named `name`, so
// its notes have ids like `Work/notes/a.md` and every path walk, index,
// search and tab keeps working unchanged.
//
// CompositeDirectoryHandle stands in for the vault's root handle. It is a
// plain delegating class, not a Proxy: native methods called with a Proxy as
// `this` throw "Illegal invocation". Native APIs that take a handle as an
// argument (move(), FileSystemObserver.observe(), IndexedDB writes,
// isSameEntry on a real handle) reject it; callers pass realHandle() there.

export interface LibraryMount {
  name: string;
  handle: FileSystemDirectoryHandle;
  /** Permission not granted yet: listed, but walking into it throws NotAllowedError. */
  locked?: boolean;
}

function domError(name: string, message = name): DOMException {
  return new DOMException(message, name);
}

const sameName = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export class CompositeDirectoryHandle {
  readonly kind = "directory" as const;

  constructor(
    readonly primary: FileSystemDirectoryHandle,
    readonly mounts: readonly LibraryMount[],
  ) {}

  get name(): string {
    return this.primary.name;
  }

  mountNamed(name: string): LibraryMount | undefined {
    return this.mounts.find((m) => sameName(m.name, name));
  }

  async getDirectoryHandle(name: string, options?: FileSystemGetDirectoryOptions): Promise<FileSystemDirectoryHandle> {
    const mount = this.mountNamed(name);
    if (mount) {
      if (mount.locked) throw domError("NotAllowedError", `“${mount.name}” needs permission again`);
      return mount.handle;
    }
    return this.primary.getDirectoryHandle(name, options);
  }

  getFileHandle(name: string, options?: FileSystemGetFileOptions): Promise<FileSystemFileHandle> {
    if (this.mountNamed(name)) return Promise.reject(domError("TypeMismatchError"));
    return this.primary.getFileHandle(name, options);
  }

  async removeEntry(name: string, options?: FileSystemRemoveOptions): Promise<void> {
    if (this.mountNamed(name)) throw domError("InvalidModificationError", "A library folder is removed from the library, never deleted");
    return (this.primary as any).removeEntry(name, options);
  }

  // The primary's entries (any it has with a mount's name stay hidden behind
  // the mount), then the mounts that can be read.
  async *entries(): AsyncIterableIterator<[string, FileSystemHandle]> {
    for await (const entry of (this.primary as any).values() as AsyncIterable<FileSystemHandle>) {
      if (this.mountNamed(entry.name)) continue;
      yield [entry.name, entry];
    }
    for (const mount of this.mounts) {
      if (!mount.locked) yield [mount.name, mountEntry(mount)];
    }
  }

  async *values(): AsyncIterableIterator<FileSystemHandle> {
    for await (const [, handle] of this.entries()) yield handle;
  }

  async *keys(): AsyncIterableIterator<string> {
    for await (const [name] of this.entries()) yield name;
  }

  [Symbol.asyncIterator]() {
    return this.entries();
  }

  // Path segments from the library root to `handle`, or null when it's
  // outside every folder.
  async resolve(handle: FileSystemHandle): Promise<string[] | null> {
    const target = realHandle(handle as FileSystemDirectoryHandle);
    if (target === this.primary || handle === (this as unknown)) return [];
    for (const mount of this.mounts) {
      if (mount.locked) continue;
      if (await isSameEntrySafe(mount.handle, target)) return [mount.name];
      try {
        const parts = await (mount.handle as any).resolve(target);
        if (parts) return [mount.name, ...parts];
      } catch {
        // Not inside this one.
      }
    }
    try {
      return await (this.primary as any).resolve(target);
    } catch {
      return null;
    }
  }

  isSameEntry(other: FileSystemHandle): Promise<boolean> {
    return isSameEntrySafe(this.primary, realHandle(other as FileSystemDirectoryHandle));
  }

  queryPermission(descriptor?: unknown): Promise<PermissionState> {
    return (this.primary as any).queryPermission(descriptor);
  }

  requestPermission(descriptor?: unknown): Promise<PermissionState> {
    return (this.primary as any).requestPermission(descriptor);
  }
}

// A mount listed as a child keeps its own handle (so `.name` is the mount's
// name, which is its folder name or that name with " (2)" after it). A
// renamed one is wrapped so it lists under the mount name.
const renamedMounts = new WeakMap<object, FileSystemDirectoryHandle>();

function mountEntry(mount: LibraryMount): FileSystemHandle {
  if (mount.handle.name === mount.name) return mount.handle;
  const renamed = new Proxy(mount.handle, {
    get(target, prop) {
      if (prop === "name") return mount.name;
      const value = Reflect.get(target, prop, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  renamedMounts.set(renamed, mount.handle);
  return renamed;
}

async function isSameEntrySafe(a: FileSystemHandle, b: FileSystemHandle): Promise<boolean> {
  if (a === b) return true;
  try {
    return await (a as any).isSameEntry(b);
  } catch {
    return false;
  }
}

export function isCompositeHandle(handle: unknown): handle is CompositeDirectoryHandle {
  return handle instanceof CompositeDirectoryHandle;
}

// The real handle to hand native APIs: the vault's own folder for a library,
// the handle itself otherwise.
// (A renamed mount's listed entry unwraps to the folder's own handle too.)
export function realHandle<T extends FileSystemDirectoryHandle | null | undefined>(handle: T): T {
  if (isCompositeHandle(handle)) return handle.primary as T;
  return ((handle && renamedMounts.get(handle)) ?? handle) as T;
}
export const primaryHandleOf = realHandle;

export function libraryMounts(handle: FileSystemDirectoryHandle | null | undefined): readonly LibraryMount[] {
  return isCompositeHandle(handle) ? handle.mounts : [];
}

// ---------------------------------------------------------------------------
// Pure path helpers. They read the open library's mount names, registered
// whenever atom_vaultHandle changes (one library is open at a time).

let activeMountNames: readonly string[] = [];

export function setActiveMountNames(names: readonly string[]): void {
  activeMountNames = names.slice();
}

export function activeMounts(): readonly string[] {
  return activeMountNames;
}

// The added folder `path` lives in, or null for the vault's own folder.
export function mountOf(path: string, names: readonly string[] = activeMountNames): string | null {
  const first = path.split("/")[0];
  return names.find((n) => n === first) ?? null;
}

// `path` relative to the folder it lives in.
export function stripMount(path: string, names: readonly string[] = activeMountNames): string {
  const mount = mountOf(path, names);
  return mount ? path.slice(mount.length + 1) : path;
}

// The prefix that puts a folder-relative path back in the library: "" for the
// vault's own folder, "Work/" for a mount.
export function mountPrefix(path: string, names: readonly string[] = activeMountNames): string {
  const mount = mountOf(path, names);
  return mount ? `${mount}/` : "";
}

export function isMountRoot(path: string, names: readonly string[] = activeMountNames): boolean {
  return !!path && names.includes(path);
}

// Whether `a` and `b` are in the same folder of the library.
export function sameLibraryFolder(a: string, b: string, names: readonly string[] = activeMountNames): boolean {
  return mountOf(a, names) === mountOf(b, names);
}

// ---------------------------------------------------------------------------
// Mount names.

const RESERVED_NAMES = [".hermesmarkdown", "assets", "_templates"];

// A name for a newly added folder: its own name, or that name with " (2)",
// " (3)" … after it when it would clash with something already at the top of
// the library or a name the app treats specially. Compared without case:
// macOS and Windows treat "work" and "Work" as the same folder.
export function chooseMountName(
  folderName: string,
  taken: { primaryName: string; topLevelNames: readonly string[]; mountNames: readonly string[]; skippedDirs: Iterable<string> },
): string {
  const base = folderName.replace(/^\.+/, "").trim() || "Folder";
  const blocked = [
    taken.primaryName,
    ...taken.topLevelNames,
    ...taken.mountNames,
    ...taken.skippedDirs,
    ...RESERVED_NAMES,
  ].map((n) => n.toLowerCase());
  const isFree = (name: string) => !blocked.includes(name.toLowerCase());
  if (isFree(base)) return base;
  for (let i = 2; ; i++) {
    const candidate = `${base} (${i})`;
    if (isFree(candidate)) return candidate;
  }
}
