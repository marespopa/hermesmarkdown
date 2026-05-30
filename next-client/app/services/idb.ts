const DB_NAME = "HermesMDVaultDB";
const STORE_NAME = "handles";
const KEY_VAULT = "lastVaultHandle";

const isSupported = () => typeof window !== "undefined" && !!window.indexedDB;

export async function getDB() {
  if (!isSupported()) {
    throw new Error("IndexedDB not supported");
  }

  return new Promise<IDBDatabase>((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, 1);
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
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn("Failed to clear vault handle from IDB:", err);
  }
}

export async function verifyPermission(handle: FileSystemHandle, readWrite = true) {
  const options: any = {};
  if (readWrite) {
    options.mode = "readwrite";
  }
  // Check if we already have permission, if so, return true.
  if ((await (handle as any).queryPermission(options)) === "granted") {
    return true;
  }
  // Request permission to the file, if the user grants permission, return true.
  if ((await (handle as any).requestPermission(options)) === "granted") {
    return true;
  }
  // The user did not grant permission, return false.
  return false;
}
