import { isBrowserVaultDescriptor, type BrowserVaultDescriptor } from "./opfs";

const DB_NAME = "HermesMDVaultDB";
const STORE_NAME = "handles";
const KEY_VAULT = "lastVaultHandle";
const KEY_BROWSER_VAULT = "lastBrowserVault";
const KEY_BROWSER_VAULT_REGISTRY = "browserVaults";

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
      store.delete(KEY_BROWSER_VAULT);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn("Failed to save vault handle to IDB:", err);
  }
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

// Call only from a click or key handler. requestPermission must begin before
// any await, because querying first can consume the browser's user activation.
export async function requestPermissionFromUserGesture(handle: FileSystemHandle, readWrite = true): Promise<boolean> {
  if (!hasPermissionApi(handle)) return true;
  const request = (handle as any).requestPermission;
  if (typeof request !== "function") return false;
  const options: any = readWrite ? { mode: "readwrite" } : {};
  return (await request.call(handle, options)) === "granted";
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

// Every key in the store; used to find keys left by removed features.
export function listKeys(): Promise<string[]> {
  return getDB().then((db) => new Promise<string[]>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAllKeys();
    request.onsuccess = () => resolve(request.result.filter((key): key is string => typeof key === "string"));
    request.onerror = () => reject(request.error);
  }));
}

export function deleteKeys(keys: readonly string[]): Promise<void> {
  return getDB().then((db) => new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    for (const key of keys) tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
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
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("Failed to save browser vault descriptor to IDB:", err);
  }
}

// Adds a browser vault to the registry without making it the last-opened one.
export async function registerBrowserVault(descriptor: BrowserVaultDescriptor) {
  const registry = await loadBrowserVaultRegistry();
  await writeKey(KEY_BROWSER_VAULT_REGISTRY, [...registry.filter((entry) => entry.id !== descriptor.id), descriptor]);
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
