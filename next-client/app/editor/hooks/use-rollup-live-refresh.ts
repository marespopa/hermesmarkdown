"use client";

import { useEffect, useRef, useState } from "react";
import { useAtomValue, useStore } from "jotai";
import { atom_activeFilePath } from "@/app/atoms/file-atoms";
import { atom_indexerState, atom_rollupStatus } from "@/app/atoms/ui-atoms";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { atom_workspaceLayout } from "@/app/atoms/workspace-atoms";
import type { PanelLeaf, WorkspaceContainer } from "@/app/types/workspace";
import { NOTE_SAVED_EVENT } from "@/app/utils/note-events";
import { childPeriods, parseRollupName, type RollupPeriod } from "@/app/utils/rollup/period";
import { parseSheetName } from "@/app/utils/sheet-nav";
import { useRollups } from "./use-rollups";

// Rebuilt this recently (openRollup refreshes before it opens): opening skips it.
const JUST_REFRESHED_MS = 5_000;
// Coming back to the window refreshes the active sheet if it's older than this.
const STALE_ON_FOCUS_MS = 10_000;
// A burst of saves (autosave while typing) refreshes once, after this pause.
const SAVE_DEBOUNCE_MS = 1_500;

const fileName = (path: string) => path.split("/").pop() ?? path;
const rollupOf = (path: string | null | undefined) => (path ? parseRollupName(fileName(path)) : null);

// The file each pane is showing.
function shownPaths(node: WorkspaceContainer | PanelLeaf): string[] {
  if ("type" in node) return node.activeFilePath ? [node.activeFilePath] : [];
  return node.children.flatMap(shownPaths);
}

// Whether saving `savedPath` changes what `period`'s rollup is built from: a
// daily sheet in the period, or a sheet one level down (its Notes).
export function feedsRollup(savedPath: string, period: RollupPeriod): boolean {
  const saved = parseSheetName(fileName(savedPath));
  if (!saved) return false;
  if (saved.level === "day") return saved.start >= period.start && saved.start <= period.end;
  return childPeriods(period).some((child) => child.name === saved.period?.name);
}

// Keeps weekly, monthly, quarterly and yearly sheets current, quietly:
// - when one becomes the active tab (opened, switched back to, restored on
//   launch), unless openRollup has just refreshed it;
// - when the window regains focus, if the active one is more than 10s old;
// - when a sheet it's built from is saved while it's showing in a pane.
// Nothing runs until a full index run of the open vault has finished: before
// that the index may hold no daily sheets, and a refresh would empty it.
export function useRollupLiveRefresh(enabled: boolean) {
  const store = useStore();
  const { refreshRollup } = useRollups();
  const activePath = useAtomValue(atom_activeFilePath);
  const vaultHandle = useAtomValue(atom_vaultHandle);
  const indexing = useAtomValue(atom_indexerState) !== "idle";
  const indexingVault = useRef<FileSystemDirectoryHandle | null>(null);
  const [indexedVault, setIndexedVault] = useState<FileSystemDirectoryHandle | null>(null);
  const refreshedFor = useRef<string | null>(null);

  // The vault whose index run started and then finished.
  useEffect(() => {
    if (indexing) indexingVault.current = vaultHandle;
    else if (vaultHandle && indexingVault.current === vaultHandle) setIndexedVault(vaultHandle);
  }, [indexing, vaultHandle]);
  const ready = enabled && !indexing && !!vaultHandle && indexedVault === vaultHandle;

  const age = (path: string) => Date.now() - (store.get(atom_rollupStatus)[path]?.at ?? 0);

  // Becoming the active tab: once per activation.
  useEffect(() => {
    if (refreshedFor.current !== activePath) refreshedFor.current = null;
    if (!ready || !activePath || refreshedFor.current === activePath || !rollupOf(activePath)) return;
    refreshedFor.current = activePath;
    if (age(activePath) > JUST_REFRESHED_MS) void refreshRollup(activePath, { quiet: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `age` reads the store at call time
  }, [ready, activePath, refreshRollup]);

  // Coming back to the window.
  useEffect(() => {
    if (!ready) return;
    const onReturn = () => {
      if (document.visibilityState === "hidden") return;
      const path = store.get(atom_activeFilePath);
      if (path && rollupOf(path) && age(path) > STALE_ON_FOCUS_MS) void refreshRollup(path, { quiet: true });
    };
    window.addEventListener("focus", onReturn);
    document.addEventListener("visibilitychange", onReturn);
    return () => {
      window.removeEventListener("focus", onReturn);
      document.removeEventListener("visibilitychange", onReturn);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `age` reads the store at call time
  }, [ready, store, refreshRollup]);

  // A source sheet saved while its rollup shows in a pane.
  useEffect(() => {
    if (!ready) return;
    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    const onSaved = (event: Event) => {
      const saved = (event as CustomEvent<{ path: string }>).detail?.path;
      if (!saved) return;
      for (const path of shownPaths(store.get(atom_workspaceLayout).rootContainer)) {
        const period = rollupOf(path);
        if (path === saved || !period || !feedsRollup(saved, period)) continue;
        clearTimeout(timers.get(path));
        timers.set(path, setTimeout(() => {
          timers.delete(path);
          void refreshRollup(path, { quiet: true });
        }, SAVE_DEBOUNCE_MS));
      }
    };
    document.addEventListener(NOTE_SAVED_EVENT, onSaved);
    return () => {
      document.removeEventListener(NOTE_SAVED_EVENT, onSaved);
      timers.forEach(clearTimeout);
    };
  }, [ready, store, refreshRollup]);
}
