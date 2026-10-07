import type { GitHubVaultDescriptor, GitHubVaultManifest } from "./github-vault-workspace";
import { isBrowserVaultDescriptor, type BrowserVaultDescriptor } from "./opfs";

const DB_NAME = "HermesMDVaultDB";
const STORE_NAME = "handles";
const KEY_VAULT = "lastVaultHandle";
const KEY_GITHUB_VAULT = "lastGithubVault";
const KEY_GITHUB_MANIFEST_PREFIX = "githubManifest:";
const KEY_BROWSER_VAULT = "lastBrowserVault";
const KEY_BROWSER_VAULT_REGISTRY = "browserVaults";

function getGitHubManifestKey(descriptor: Pick<GitHubVaultDescriptor, "repositoryId" | "branch">) {
  return `${KEY_GITHUB_MANIFEST_PREFIX}${descriptor.repositoryId}:${descriptor.branch}`;
}

const isSupported = () => typeof window !== "undefined" && !!window.indexedDB;

export async function getDB() {
  if (!isSupported()) {
    throw new Error("IndexedDB not supported");
  }

  return new Promise<IDBDatabase>((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, 2);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    } catch (err) {
      reject(err);
    }
  });
}

export async function saveVaultHandle(handle: FileSystemDirectoryHandle) {
  if (!isSupported()) return;
  
  try {
    const db = await getDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(handle, KEY_VAULT);
      store.delete(KEY_GITHUB_VAULT);
      store.delete(KEY_BROWSER_VAULT);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn("Failed to save vault handle to IDB:", err);
  }
}

export async function saveGitHubVaultDescriptor(descriptor: GitHubVaultDescriptor) {
  if (!isSupported()) return;

  try {
    const db = await getDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(descriptor, KEY_GITHUB_VAULT);
      store.delete(KEY_VAULT);
      store.delete(KEY_BROWSER_VAULT);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn("Failed to save GitHub vault descriptor to IDB:", err);
  }
}

export async function loadGitHubVaultDescriptor(): Promise<GitHubVaultDescriptor | null> {
  if (!isSupported()) return null;

  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(KEY_GITHUB_VAULT);
      request.onsuccess = () => {
        const descriptor = request.result;
        const valid = descriptor &&
          descriptor.version === 1 &&
          descriptor.kind === "github" &&
          Number.isSafeInteger(descriptor.repositoryId) &&
          typeof descriptor.owner === "string" &&
          typeof descriptor.repository === "string" &&
          typeof descriptor.branch === "string" &&
          typeof descriptor.displayName === "string" &&
          (typeof descriptor.baseHeadSha === "string" || descriptor.baseHeadSha === null);
        resolve(valid ? descriptor as GitHubVaultDescriptor : null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn("Failed to load GitHub vault descriptor from IDB:", err);
    return null;
  }

}

export async function saveGitHubVaultManifest(
  descriptor: Pick<GitHubVaultDescriptor, "repositoryId" | "branch">,
  manifest: GitHubVaultManifest,
) {
  if (!isSupported()) return;
  const db = await getDB();
  return new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME)
      .put(manifest, getGitHubManifestKey(descriptor));
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function loadGitHubVaultManifest(
  descriptor: Pick<GitHubVaultDescriptor, "repositoryId" | "branch">,
): Promise<GitHubVaultManifest | null> {
  if (!isSupported()) return null;
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME)
      .get(getGitHubManifestKey(descriptor));
    request.onsuccess = () => {
      const manifest = request.result;
      const valid = manifest && manifest.version === 1 &&
        (typeof manifest.baseHeadSha === "string" || manifest.baseHeadSha === null) &&
        manifest.entries && typeof manifest.entries === "object" &&
        (typeof manifest.pendingSyncOperationId === "string" || manifest.pendingSyncOperationId === null);
      resolve(valid ? manifest as GitHubVaultManifest : null);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function loadVaultHandle(): Promise<FileSystemDirectoryHandle | null> {
  if (!isSupported()) return null;

  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(KEY_VAULT);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn("Failed to load vault handle from IDB:", err);
    return null;
  }
}

export async function clearVaultHandle() {
  if (!isSupported()) return;

  try {
    const db = await getDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(KEY_VAULT);
      store.delete(KEY_GITHUB_VAULT);
      store.delete(KEY_BROWSER_VAULT);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn("Failed to clear vault handle from IDB:", err);
  }
}

// Browser-storage handles (and every handle in Safari/Firefox) have no
// permission methods: they are always writable, so a missing method counts as
// granted rather than throwing.
const hasPermissionApi = (handle: FileSystemHandle) =>
  typeof (handle as any).queryPermission === "function";

export async function verifyPermission(handle: FileSystemHandle, readWrite = true) {
  if (!hasPermissionApi(handle)) return true;
  const options: any = {};
  if (readWrite) {
    options.mode = "readwrite";
  }
  if ((await (handle as any).queryPermission(options)) === "granted") {
    return true;
  }
  // requestPermission requires a user gesture — only call it when inside one.
  if (typeof (handle as any).requestPermission === "function" &&
    (await (handle as any).requestPermission(options)) === "granted") {
    return true;
  }
  return false;
}

export async function queryPermission(handle: FileSystemHandle, readWrite = true): Promise<boolean> {
  if (!hasPermissionApi(handle)) return true;
  const options: any = readWrite ? { mode: "readwrite" } : {};
  return (await (handle as any).queryPermission(options)) === "granted";
}

export function readKey<T>(key: string): Promise<T | undefined> {
  return getDB().then((db) => new Promise<T | undefined>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }));
}

export function writeKey(key: string, value: unknown): Promise<void> {
  return getDB().then((db) => new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  }));
}

export async function saveBrowserVaultDescriptor(descriptor: BrowserVaultDescriptor) {
  if (!isSupported()) return;

  try {
    const db = await getDB();
    const registry = await loadBrowserVaultRegistry();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put(descriptor, KEY_BROWSER_VAULT);
      store.put(
        [descriptor, ...registry.filter((entry) => entry.id !== descriptor.id)],
        KEY_BROWSER_VAULT_REGISTRY,
      );
      store.delete(KEY_VAULT);
      store.delete(KEY_GITHUB_VAULT);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("Failed to save browser vault descriptor to IDB:", err);
  }
}

export async function loadBrowserVaultDescriptor(): Promise<BrowserVaultDescriptor | null> {
  if (!isSupported()) return null;

  try {
    const descriptor = await readKey<unknown>(KEY_BROWSER_VAULT);
    return isBrowserVaultDescriptor(descriptor) ? descriptor : null;
  } catch (err) {
    console.warn("Failed to load browser vault descriptor from IDB:", err);
    return null;
  }
}

// Every browser vault created on this device, most recently opened first.
export async function loadBrowserVaultRegistry(): Promise<BrowserVaultDescriptor[]> {
  if (!isSupported()) return [];

  try {
    const registry = await readKey<unknown>(KEY_BROWSER_VAULT_REGISTRY);
    return Array.isArray(registry) ? registry.filter(isBrowserVaultDescriptor) : [];
  } catch (err) {
    console.warn("Failed to load browser vault registry from IDB:", err);
    return [];
  }
}

// Drops a deleted browser vault from the registry, and forgets it as the last
// vault when it was the one open.
export async function removeBrowserVaultDescriptor(id: string) {
  if (!isSupported()) return;

  try {
    const db = await getDB();
    const registry = await loadBrowserVaultRegistry();
    const last = await loadBrowserVaultDescriptor();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put(registry.filter((entry) => entry.id !== id), KEY_BROWSER_VAULT_REGISTRY);
      if (last?.id === id) store.delete(KEY_BROWSER_VAULT);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("Failed to remove browser vault descriptor from IDB:", err);
  }
}

// Renames a browser vault in the registry and, when it is the open vault, in
// the saved descriptor. Its storage folder (by id) is untouched. Returns the
// updated descriptor, or null when the vault isn't registered.
export async function renameBrowserVaultDescriptor(id: string, displayName: string): Promise<BrowserVaultDescriptor | null> {
  if (!isSupported()) return null;

  const db = await getDB();
  const registry = await loadBrowserVaultRegistry();
  const last = await loadBrowserVaultDescriptor();
  const entry = registry.find((item) => item.id === id) ?? (last?.id === id ? last : null);
  if (!entry) return null;
  const updated = { ...entry, displayName };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const known = registry.some((item) => item.id === id);
    store.put(known ? registry.map((item) => item.id === id ? updated : item) : [updated, ...registry], KEY_BROWSER_VAULT_REGISTRY);
    if (last?.id === id) store.put(updated, KEY_BROWSER_VAULT);
    tx.oncomplete = () => resolve(updated);
    tx.onerror = () => reject(tx.error);
  });
}

// Stamps the vault's last export time in the registry and, when it is the
// open vault, in the saved descriptor. Returns the updated descriptor.
export async function markBrowserVaultExported(id: string, at = Date.now()): Promise<BrowserVaultDescriptor | null> {
  if (!isSupported()) return null;

  try {
    const db = await getDB();
    const registry = await loadBrowserVaultRegistry();
    const last = await loadBrowserVaultDescriptor();
    const entry = registry.find((item) => item.id === id) ?? (last?.id === id ? last : null);
    if (!entry) return null;
    const updated = { ...entry, lastExportedAt: at };
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put(registry.map((item) => item.id === id ? updated : item), KEY_BROWSER_VAULT_REGISTRY);
      if (last?.id === id) store.put(updated, KEY_BROWSER_VAULT);
      tx.oncomplete = () => resolve(updated);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("Failed to record browser vault export in IDB:", err);
    return null;
  }
}
