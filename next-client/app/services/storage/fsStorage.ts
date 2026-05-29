import type { AsyncStorage } from "jotai/vanilla/utils/atomWithStorage";

const ROOT_DIR = "hermes";

const hasWindow = () => typeof window !== "undefined";

const supportsOPFS = () =>
  hasWindow() &&
  typeof navigator !== "undefined" &&
  !!navigator.storage &&
  typeof navigator.storage.getDirectory === "function";

const safeParse = <T>(raw: string | null, initialValue: T): T => {
  if (!raw) return initialValue;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return initialValue;
  }
};

const getRootDirectory = async (): Promise<FileSystemDirectoryHandle | null> => {
  if (!supportsOPFS()) return null;

  const opfsRoot = await navigator.storage.getDirectory();
  return opfsRoot.getDirectoryHandle(ROOT_DIR, { create: true });
};

const getKeyFileHandle = async (
  key: string,
  create: boolean,
): Promise<FileSystemFileHandle | null> => {
  const root = await getRootDirectory();
  if (!root) return null;

  return root.getFileHandle(`${key}.json`, { create });
};

const readKey = async (key: string): Promise<string | null> => {
  try {
    const handle = await getKeyFileHandle(key, false);
    if (!handle) return null;

    const file = await handle.getFile();
    return file.text();
  } catch {
    return null;
  }
};

const writeKey = async (key: string, value: string): Promise<void> => {
  const handle = await getKeyFileHandle(key, true);
  if (!handle) return;

  let writable: FileSystemWritableFileStream | null = null;
  try {
    writable = await handle.createWritable();
    if (writable) {
      await writable.write(value);
      await writable.close();
      writable = null;
    }
  } finally {
    if (writable) {
      try {
        await (writable as any).close();
      } catch {
        // Ignore cleanup error
      }
    }
  }
};

const removeKey = async (key: string): Promise<void> => {
  const root = await getRootDirectory();
  if (!root) return;

  try {
    await root.removeEntry(`${key}.json`);
  } catch {
    // noop
  }
};

export const createFileSystemStorage = <T>(): AsyncStorage<T> => ({
  getItem: async (key, initialValue) => {
    const raw = await readKey(key);
    return safeParse<T>(raw, initialValue);
  },
  setItem: async (key, value) => {
    await writeKey(key, JSON.stringify(value));
  },
  removeItem: async (key) => {
    await removeKey(key);
  },
});

export const fileSystemStorageMeta = {
  rootDir: ROOT_DIR,
  supportsOPFS,
};

