import { listFiles, FOLDER_MIME } from './client';

export interface DriveEntry {
  id: string;
  name: string;
  mimeType: string;
  modifiedAt: number;
  parentId: string;
}

export class DrivePathIndex {
  private byPath = new Map<string, DriveEntry>();
  private byId = new Map<string, string>(); // id → path

  getEntry(path: string): DriveEntry | undefined {
    return this.byPath.get(path);
  }

  getIdForPath(path: string): string | undefined {
    return this.byPath.get(path)?.id;
  }

  getPathForId(id: string): string | undefined {
    return this.byId.get(id);
  }

  addEntry(path: string, entry: DriveEntry): void {
    const existing = this.byPath.get(path);
    if (existing) this.byId.delete(existing.id);
    this.byPath.set(path, entry);
    this.byId.set(entry.id, path);
  }

  removeEntry(path: string): void {
    const entry = this.byPath.get(path);
    if (!entry) return;
    this.byId.delete(entry.id);
    this.byPath.delete(path);
  }

  renameEntry(oldPath: string, newPath: string): void {
    const entry = this.byPath.get(oldPath);
    if (!entry) return;

    this.byPath.delete(oldPath);
    this.byId.delete(entry.id);
    const updated: DriveEntry = { ...entry, name: newPath.split('/').pop()! };
    this.byPath.set(newPath, updated);
    this.byId.set(updated.id, newPath);

    // Update all children
    const prefix = oldPath + '/';
    const children: [string, DriveEntry][] = [];
    for (const [p, e] of this.byPath) {
      if (p.startsWith(prefix)) children.push([p, e]);
    }
    for (const [childPath, childEntry] of children) {
      this.byPath.delete(childPath);
      this.byId.delete(childEntry.id);
      const newChildPath = newPath + '/' + childPath.slice(prefix.length);
      this.byPath.set(newChildPath, childEntry);
      this.byId.set(childEntry.id, newChildPath);
    }
  }

  allEntries(): [string, DriveEntry][] {
    return Array.from(this.byPath.entries());
  }

  allPaths(): string[] {
    return Array.from(this.byPath.keys());
  }

  clear(): void {
    this.byPath.clear();
    this.byId.clear();
  }

  async build(rootFolderId: string, signal?: AbortSignal, onProgress?: (count: number) => void): Promise<void> {
    this.clear();
    let count = 0;
    const increment = () => {
      count++;
      onProgress?.(count);
    };
    await this.walk(rootFolderId, '', signal, increment);
  }

  private async walk(folderId: string, prefix: string, signal?: AbortSignal, onEntry?: () => void): Promise<void> {
    let pageToken: string | undefined;
    const isIgnored = (name: string) =>
      name === 'node_modules' || name === 'vendor' || name.startsWith('.');

    do {
      if (signal?.aborted) return;
      const result = await listFiles(folderId, pageToken, signal);
      pageToken = result.nextPageToken;


      for (const file of result.files) {
        if (signal?.aborted) return;
        if (isIgnored(file.name)) continue;

        const path = prefix ? `${prefix}/${file.name}` : file.name;
        this.addEntry(path, {
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          modifiedAt: new Date(file.modifiedTime).getTime(),
          parentId: folderId,
        });
        onEntry?.();

        if (file.mimeType === FOLDER_MIME) {
          try {
            await this.walk(file.id, path, signal, onEntry);
          } catch (err: any) {
            if (err.name === 'AbortError') throw err; // propagate aborts
            console.warn(`Drive: skipping folder "${path}" due to error:`, err);
          }
        }
      }
    } while (pageToken);
  }


  serialize(): string {
    return JSON.stringify(Array.from(this.byPath.entries()));
  }

  deserialize(json: string): void {
    this.clear();
    const entries: [string, DriveEntry][] = JSON.parse(json);
    for (const [path, entry] of entries) {
      this.byPath.set(path, entry);
      this.byId.set(entry.id, path);
    }
  }

  static loadFromCache(vaultId: string): DrivePathIndex | null {
    try {
      const raw = localStorage.getItem(`hermes_drive_index_${vaultId}`);
      if (!raw) return null;
      const index = new DrivePathIndex();
      index.deserialize(raw);
      return index;
    } catch {
      return null;
    }
  }

  saveToCache(vaultId: string): void {
    try {
      localStorage.setItem(`hermes_drive_index_${vaultId}`, this.serialize());
    } catch {
      // Ignore storage quota errors
    }
  }
}
