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
