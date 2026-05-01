import type { AsyncStorage } from "jotai/vanilla/utils/atomWithStorage";
import { createJSONStorage } from "jotai/utils";
import {
  createFileSystemStorage,
  fileSystemStorageMeta,
} from "@/app/services/storage/fsStorage";

export type StorageBackend = "filesystem" | "localstorage";

const getRequestedBackend = (): StorageBackend => {
  if (typeof process !== "undefined") {
    const value = process.env.NEXT_PUBLIC_STORAGE_BACKEND;
    if (value === "filesystem" || value === "localstorage") {
      return value;
    }
  }

  return "filesystem";
};

const createLocalStorageAsyncAdapter = <T>(): AsyncStorage<T> => {
  const storage = createJSONStorage<T>(() => localStorage);

  return {
    getItem: async (key, initialValue) => storage.getItem(key, initialValue),
    setItem: async (key, value) => storage.setItem(key, value),
    removeItem: async (key) => storage.removeItem(key),
  };
};

export const getAtomStorage = <T>(): AsyncStorage<T> => {
  const backend = getRequestedBackend();

  if (backend === "filesystem" && fileSystemStorageMeta.supportsOPFS()) {
    return createFileSystemStorage<T>();
  }

  return createLocalStorageAsyncAdapter<T>();
};

export const atomStorageConfig = {
  requestedBackend: getRequestedBackend,
};
