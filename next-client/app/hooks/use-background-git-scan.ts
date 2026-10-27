"use client";

import { useEffect } from "react";
import { useAtomValue, useStore } from "jotai";
import { usePathname } from "next/navigation";
import { atom_fileMetadata, atom_gitChangesCache, atom_vaultKey, atom_vaultTextFiles } from "@/app/atoms/atoms";
import { atom_vaultDescriptor, atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { saveChangesCache } from "@/app/services/changes-cache";
import { startChangesScan } from "@/app/services/git-changes-client";
import type { KnownFile } from "@/app/services/git/git-changes-scan";

// Wait for the vault's own startup work (listing, indexing) before scanning.
const START_DELAY_MS = 4000;

/**
 * Warms the Changes page's scan once the vault is unlocked: after a delay and
 * an idle moment, one scan runs in the worker and fills the same cache the
 * page shows at once (atom_gitChangesCache, and the copy saved for the vault).
 * Nothing runs for a vault already scanned this session, a vault not on disk,
 * or while the Changes page is open (it scans itself); leaving cancels it.
 * Mounted once by EditorShell.
 */
export function useBackgroundGitScan(enabled: boolean): void {
  const store = useStore();
  const vault = useAtomValue(atom_vaultHandle);
  const vaultKey = useAtomValue(atom_vaultKey);
  const isDisk = useAtomValue(atom_vaultDescriptor)?.kind === "local";
  const onChanges = usePathname() === "/editor/changes";

  useEffect(() => {
    if (!enabled || !vault || !isDisk || onChanges) return;
    let scan: { cancel(): void } | null = null;
    let cancelled = false;
    const run = () => {
      if (cancelled || store.get(atom_gitChangesCache)?.vault === vault) return;
      const known: KnownFile[] = [
        ...Object.values(store.get(atom_fileMetadata)).flatMap((meta) => (meta.handle ? [{ path: meta.path, handle: meta.handle as FileSystemFileHandle }] : [])),
        ...store.get(atom_vaultTextFiles),
      ];
      const started = startChangesScan(vault, () => {}, () => {}, known);
      scan = started;
      void started.result.then((result) => {
        if (cancelled || result === "cancelled" || result.status === "error") return;
        store.set(atom_gitChangesCache, (current) => current?.vault === vault ? current : { vault, result });
        if (vaultKey) void saveChangesCache(vaultKey, result);
      });
    };
    let idleId: number | undefined;
    const timer = window.setTimeout(() => {
      if (typeof window.requestIdleCallback === "function") idleId = window.requestIdleCallback(run, { timeout: 10_000 });
      else run();
    }, START_DELAY_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (idleId !== undefined) window.cancelIdleCallback?.(idleId);
      scan?.cancel();
    };
  }, [enabled, vault, vaultKey, isDisk, onChanges, store]);
}
