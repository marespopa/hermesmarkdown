"use client";

import { useEffect } from "react";
import toast from "react-hot-toast";
import { useOpenFile } from "./use-open-file";

type LaunchParams = { files?: FileSystemHandle[] };
type LaunchQueue = { setConsumer: (consumer: (params: LaunchParams) => void) => void };

// Opens the files the OS hands to the installed app (double-click a .md file,
// "Open with" HermesMarkdown), via the manifest's `file_handlers`. Chromium
// only; elsewhere `launchQueue` is absent and nothing happens. A launched
// file sits outside the vault, so it opens by name, like a picked file.
// Mounted once by EditorShell.
export function useLaunchFiles() {
  const { openFile } = useOpenFile();

  useEffect(() => {
    const queue = (window as unknown as { launchQueue?: LaunchQueue }).launchQueue;
    if (!queue) return;
    queue.setConsumer(async (params) => {
      const handles = (params.files ?? []).filter((h): h is FileSystemFileHandle => h.kind === "file");
      // One file opens at once; the rest open behind it in order.
      for (const handle of handles) {
        try {
          await openFile(handle, handle.name);
        } catch {
          toast.error(`Couldn't open ${handle.name}`);
        }
      }
    });
  }, [openFile]);
}
