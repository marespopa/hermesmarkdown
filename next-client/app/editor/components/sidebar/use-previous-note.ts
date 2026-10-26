"use client";

import { useCallback, useEffect, useRef } from "react";
import { useStore } from "jotai";
import { atom_fileMetadata } from "@/app/atoms/metadata";
import { showErrorToast } from "@/app/components/Toastr";
import { useSidebarNavigation } from "./use-sidebar-navigation";

// Ctrl/Cmd+0, back to the note opened before this one, however either was
// opened (a pin, Files, the palette, a link…). Pressing it again returns, so
// it toggles between the last two notes. Off the editor (`activePath` null),
// it brings back the last note in front. Kept in memory only, for this window.
export function usePreviousNote(activePath: string | null) {
  const store = useStore();
  const { openHandle } = useSidebarNavigation();
  // The last note in front, and the one before it.
  const last = useRef<string | null>(null);
  const previous = useRef<string | null>(null);

  useEffect(() => {
    if (!activePath || activePath === last.current) return;
    previous.current = last.current;
    last.current = activePath;
  }, [activePath]);

  // False when there's no note to go back to (the key is left alone).
  const goBack = useCallback((): boolean => {
    const path = activePath ? previous.current : last.current;
    if (!path) return false;
    const handle = store.get(atom_fileMetadata)[path]?.handle as FileSystemFileHandle | null | undefined;
    if (!handle) {
      if (path === previous.current) previous.current = null;
      else last.current = null;
      showErrorToast(`“${path.split("/").pop()}” isn't in this vault any more.`);
      return true;
    }
    void openHandle(handle, path);
    return true;
  }, [activePath, store, openHandle]);

  return goBack;
}
