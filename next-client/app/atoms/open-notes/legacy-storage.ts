import { createJSONStorage } from "jotai/utils";
import { clearRecoveryIssue, isQuotaError, reportRecoveryIssue } from "../recovery-atoms";

// The open notes' old home, and the fallback when IndexedDB can't be used
// (private mode, blocked storage): every open note as one JSON value in
// localStorage. Typing changes the open notes on every keystroke, and
// writing them all each time cost the editor a frame per key, so writes wait
// for a pause in typing and go out at once when the page is hidden or
// closed; reads see the pending value.
const PERSIST_DELAY_MS = 400;

type SyncStorage<T> = ReturnType<typeof createJSONStorage<T>>;

export function debouncedJSONStorage<T>(delay = PERSIST_DELAY_MS): SyncStorage<T> {
  const storage = createJSONStorage<T>(() => localStorage);
  let pending: { key: string; value: T } | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const flush = () => {
    clearTimeout(timer);
    if (!pending) return;
    const { key, value } = pending;
    pending = null;
    // A full localStorage throws; the notes stay in memory, so say so
    // instead of losing the write silently.
    try {
      storage.setItem(key, value);
      clearRecoveryIssue("storage-full");
    } catch (err) {
      if (!isQuotaError(err)) throw err;
      reportRecoveryIssue({ kind: "storage-full" });
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flush();
    });
  }
  return {
    ...storage,
    getItem: (key, initialValue) => (pending?.key === key ? pending.value : storage.getItem(key, initialValue)),
    setItem: (key, value) => {
      if (pending && pending.key !== key) flush();
      pending = { key, value };
      clearTimeout(timer);
      timer = setTimeout(flush, delay);
    },
    removeItem: (key) => {
      if (pending?.key === key) pending = null;
      storage.removeItem(key);
    },
  };
}
