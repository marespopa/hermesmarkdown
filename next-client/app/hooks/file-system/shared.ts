"use client";

export let metadataWorker: Worker | null = null;
if (typeof window !== "undefined") {
  try {
    metadataWorker = new Worker(new URL("../../workers/metadata.worker.ts", import.meta.url));
  } catch (err) {
    console.error("Failed to initialize metadata worker:", err);
  }
}

export const isVaultSupported = typeof window !== "undefined" && "showDirectoryPicker" in window;
export const isIdbSupported = typeof window !== "undefined" && !!window.indexedDB;

// Global lock to prevent "File picker already active" errors
let isPickerActive = false;

/**
 * Helper to retry operations that fail due to "state had changed" (common race condition in FS API)
 */
export const withRetry = async <T>(fn: () => Promise<T>, retries = 2): Promise<T> => {
  try {
    return await fn();
  } catch (err: any) {
    const isRetryable =
      err.name === "InvalidStateError" ||
      err.message?.includes("state had changed");
    if (isRetryable && retries > 0) {
      console.warn(
        `File System operation failed (state changed), retrying... (${retries} left)`,
      );
      await new Promise((resolve) => setTimeout(resolve, 100));
      return withRetry(fn, retries - 1);
    }
    throw err;
  }
};

export async function withPickerLock<T>(fn: () => Promise<T>): Promise<T | undefined> {
  if (isPickerActive) {
    console.warn("Picker already active, ignoring request");
    return undefined;
  }
  isPickerActive = true;
  try {
    return await fn();
  } finally {
    // Small delay to ensure the browser has fully cleared the previous picker state
    setTimeout(() => {
      isPickerActive = false;
    }, 500);
  }
}
