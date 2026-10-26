"use client";

import { useRouter } from "next/navigation";
import { useSetAtom } from "jotai";
import { useCallback } from "react";
import toast from "react-hot-toast";
import { atom_pendingScrollTarget, resolveFileHandleAtPath } from "@/app/atoms/atoms";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { editorFileHref } from "../utils/editor-url";

/** Opens a changed file in the editor at a line (the Tasks page's steps). */
export function useOpenChange() {
  const router = useRouter();
  const { vaultHandle, openFile } = useFileSystem();
  const setPendingScrollTarget = useSetAtom(atom_pendingScrollTarget);

  return useCallback(
    async (path: string, line: number, column?: number) => {
      if (!vaultHandle) return;
      try {
        const handle = await resolveFileHandleAtPath(vaultHandle, path);
        await openFile(handle, path);
        setPendingScrollTarget(column === undefined ? { path, line } : { path, line, column });
        router.push(editorFileHref(path));
      } catch {
        toast.error(`Couldn't open ${path.split("/").pop()}`);
      }
    },
    [vaultHandle, openFile, setPendingScrollTarget, router],
  );
}
