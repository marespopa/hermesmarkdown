"use client";

import { useCallback } from "react";
import { useStore } from "jotai";
import { usePathname, useRouter } from "next/navigation";
import { atom_newNoteRequested } from "@/app/atoms/ui-atoms";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { editorFileHref } from "../../utils/editor-url";

// Where the sidebar takes you, from any /editor route. On the editor itself
// notes open in place; from Tasks, Templates, Settings… the note opens and
// the route goes back to the editor at that note's URL.
export function useSidebarNavigation() {
  const router = useRouter();
  const pathname = usePathname() ?? "/editor";
  const store = useStore();
  const { openFile } = useFileSystem();
  const onEditor = pathname === "/editor";

  const toEditor = useCallback((path?: string | null) => {
    if (!onEditor) router.push(editorFileHref(path));
  }, [onEditor, router]);

  // A tree row: its handle is at hand.
  const openHandle = useCallback(async (handle: FileSystemFileHandle, path?: string) => {
    await openFile(handle, path);
    toEditor(path);
  }, [openFile, toEditor]);

  const newNote = useCallback(() => {
    store.set(atom_newNoteRequested, true);
    toEditor();
  }, [store, toEditor]);

  return { pathname, onEditor, openHandle, newNote, toEditor };
}
