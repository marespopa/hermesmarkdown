"use client";

import { useAtom } from "jotai";
import {
  atom_activeFileHandle,
  atom_content,
  atom_lastSavedContent,
  atom_fileLastModified,
  atom_fileConflict,
  atom_openFiles,
  atom_activeFilePath,
} from "@/app/atoms/atoms";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import Button from "@/app/components/Button";
import toast from "react-hot-toast";
import { useState } from "react";
import { useFileSystem } from "@/app/hooks/use-file-system";

export default function ConflictDialog() {
  const [activeFileHandle] = useAtom(atom_activeFileHandle);
  const [conflict, setConflict] = useAtom(atom_fileConflict);
  const [openFiles, setOpenFiles] = useAtom(atom_openFiles);
  const [activePath] = useAtom(atom_activeFilePath);
  const [, setContent] = useAtom(atom_content);
  const [, setLastSavedContent] = useAtom(atom_lastSavedContent);
  const [, setFileLastModified] = useAtom(atom_fileLastModified);

  if (!conflict) return null;

  const snapshots = activePath ? openFiles[activePath!]?.snapshots ?? [] : [];

  const handleReload = async () => {
    if (!activeFileHandle) return;
    try {
      const file = await activeFileHandle.getFile();
      const remoteContent = await file.text();
      
      setContent(remoteContent);
      setLastSavedContent(remoteContent);
      setFileLastModified(file.lastModified);
      setConflict(null);
      toast.success("Loaded external changes");
    } catch (err) {
      console.error(err);
      toast.error("Failed to reload file");
    }
  };

  const { saveFile } = useFileSystem();

  const handleKeepLocal = async () => {
    if (!activeFileHandle) return;
    try {
      const file = await activeFileHandle.getFile();
      setFileLastModified(file.lastModified);
      setConflict(null);
      toast.success("Local edits kept — will overwrite on next save");
    } catch (err) {
      console.error(err);
      setConflict(null);
    }
  };

  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergedText, setMergedText] = useState("");

  const openMergeEditor = () => {
    // Default merged editor: start with local content, but user can load any snapshot
    const local = activePath ? openFiles[activePath!]?.content || "" : "";
    setMergedText(local || conflict?.remoteContent || "");
    setMergeOpen(true);
  };

  const handleSaveMerged = async () => {
    if (!activeFileHandle) return;
    try {
      const ok = await saveFile(mergedText, activeFileHandle, 0, false, undefined);
      if (ok) {
        const file = await activeFileHandle.getFile();
        setFileLastModified(file.lastModified);
        setLastSavedContent(mergedText);
        setConflict(null);
        setMergeOpen(false);
        // Clear snapshots for this file now that merge resolved
        if (activePath) {
          setOpenFiles(prev => {
            if (!prev[activePath!]) return prev;
            return { ...prev, [activePath!]: { ...prev[activePath!], snapshots: [] } };
          });
        }
        toast.success("Merged changes saved");
      } else {
        toast.error("Failed to save merged content");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to save merged content");
    }
  };

  const loadSnapshotIntoMerged = (content: string) => {
    setMergedText(content);
    setMergeOpen(true);
  };

  return (
    <DialogModal
      isOpened={!!conflict}
      onClose={() => {}}
      onConfirm={handleReload}
      styles="max-w-2xl"
    >
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">External Modification Detected</h3>
        <p className="text-ui-footnote">
          This file was modified externally, but you have unsaved local changes in HermesMarkdown.

          How would you like to proceed?
        </p>

        <div className="flex flex-col gap-3 pt-4">
          <Button variant="primary" onClick={handleReload} className="w-full text-left flex flex-col items-start py-4">
            <span className="font-bold">Reload External Changes</span>
            <span className="text-ui-footnote font-normal mt-0.5">Discard my local edits and use the file on disk.</span>
          </Button>

          <Button variant="secondary" onClick={handleKeepLocal} className="w-full text-left flex flex-col items-start py-4">
            <span className="font-bold">Keep My Local Edits</span>
            <span className="text-ui-footnote font-normal mt-0.5">I will overwrite the disk version when I save.</span>
          </Button>

          <Button variant="secondary" onClick={openMergeEditor} className="w-full text-left flex flex-col items-start py-4">
            <span className="font-bold">Open Merge Editor</span>
            <span className="text-ui-footnote font-normal mt-0.5">Manually merge remote and local changes, then save.</span>
          </Button>
        </div>

        {snapshots.length > 0 && (
          <div className="pt-4">
            <h4 className="text-sm font-semibold">Available snapshots</h4>
            <p className="text-ui-footnote">Saved automatically when the conflict was detected. Use them to inspect and merge.</p>
            <div className="mt-2 grid gap-2">
              {snapshots.map((s, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <div className="text-sm font-medium">{s.type === "local" ? "Local" : "Remote"}</div>
                    <div className="text-xs text-ui-footnote">{new Date(s.timestamp).toLocaleString()}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="tertiary" onClick={() => loadSnapshotIntoMerged(s.content)}>Load into merge</Button>
                    <Button variant="tertiary" onClick={() => {
                      // Open ephemeral side preview: copy to clipboard as a quick inspect affordance
                      try {
                        navigator.clipboard.writeText(s.content || "");
                        toast("Snapshot copied to clipboard for quick inspection.");
                      } catch {
                        // noop
                      }
                    }}>Copy</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {mergeOpen && (
          <div className="pt-4">
            <h4 className="text-sm font-semibold">Merge Editor</h4>
            <p className="text-ui-footnote">Edit the merged text below. When ready, save to resolve the conflict.</p>
            <textarea
              value={mergedText}
              onChange={(e) => setMergedText(e.target.value)}
              className="w-full h-48 mt-2 p-2 font-mono text-sm border rounded"
            />
            <div className="flex gap-2 mt-2">
              <Button variant="primary" onClick={handleSaveMerged}>Save merged</Button>
              <Button variant="secondary" onClick={() => setMergeOpen(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </div>
    </DialogModal>
  );
}
