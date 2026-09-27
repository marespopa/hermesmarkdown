import { useEffect, useRef } from "react";

// Keeps the vault's current directory pointed at the active file's folder
// (used by folder-relative actions like New file). Retries after the vault
// permission is granted, and skips paths it has already synced.
export function useSyncCurrentDirectory(
  activeFilePath: string | null,
  isVaultPending: boolean,
  syncCurrentDirectoryToPath: (path: string) => Promise<boolean>,
) {
  const lastSyncedPathRef = useRef<string | null>(null);
  useEffect(() => {
    if (
      !activeFilePath ||
      activeFilePath === "draft" ||
      activeFilePath === lastSyncedPathRef.current ||
      isVaultPending
    ) return;

    let cancelled = false;
    void syncCurrentDirectoryToPath(activeFilePath).then((synced) => {
      if (synced && !cancelled) lastSyncedPathRef.current = activeFilePath;
    });
    return () => {
      cancelled = true;
    };
  }, [activeFilePath, isVaultPending, syncCurrentDirectoryToPath]);
}
