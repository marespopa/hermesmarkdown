"use client";

import { useIndexActiveFile } from "@/app/hooks/file-system/use-index-active-file";

// Re-indexes the active note a second after its text last changed. Mounted
// once (EditorShell) rather than inside useFileSystem, whose many callers
// would each re-render on every keystroke and each post the note to the
// worker. Renders nothing, so only it re-renders while typing.
export default function ActiveFileIndexer() {
  useIndexActiveFile();
  return null;
}
