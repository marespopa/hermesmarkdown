const DB_NAME = "HermesVaultDB";
const STORE_NAME = "handles";
const KEY_VAULT = "lastVaultHandle";

export async function getDB() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveVaultHandle(handle: FileSystemDirectoryHandle) {
  const db = await getDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(handle, KEY_VAULT);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function loadVaultHandle(): Promise<FileSystemDirectoryHandle | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(KEY_VAULT);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function clearVaultHandle() {
  const db = await getDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(KEY_VAULT);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
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
