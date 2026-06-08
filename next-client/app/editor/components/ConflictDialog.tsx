"use client";

import { useAtom } from "jotai";
import {
  atom_activeFileHandle,
  atom_content,
  atom_lastSavedContent,
  atom_fileLastModified,
  atom_fileConflict,
} from "@/app/atoms/atoms";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import Button from "@/app/components/Button";
import toast from "react-hot-toast";

export default function ConflictDialog() {
  const [activeFileHandle] = useAtom(atom_activeFileHandle);
  const [conflict, setConflict] = useAtom(atom_fileConflict);
  const [, setContent] = useAtom(atom_content);
  const [, setLastSavedContent] = useAtom(atom_lastSavedContent);
  const [, setFileLastModified] = useAtom(atom_fileLastModified);

  if (!conflict) return null;

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

  return (
    <DialogModal
      isOpened={!!conflict}
      onClose={() => {}}
      onConfirm={handleReload}
      styles="max-w-md"
    >
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">External Modification Detect</h3>
        <p className="text-ui-footnote opacity-70">
          This file was modified externally, but you have unsaved local changes in HermesMarkdown.
 
          How would you like to proceed?
        </p>
        
        <div className="flex flex-col gap-3 pt-4">
          <Button variant="primary" onClick={handleReload} className="w-full text-left flex flex-col items-start py-4">
            <span className="font-bold">Reload External Changes</span>
            <span className="text-ui-footnote opacity-70 font-normal mt-0.5">
              Discard my local edits and use the file on disk.
            </span>
          </Button>
          
          <Button variant="secondary" onClick={handleKeepLocal} className="w-full text-left flex flex-col items-start py-4">
            <span className="font-bold">Keep My Local Edits</span>
            <span className="text-ui-footnote opacity-70 font-normal mt-0.5">
              I will overwrite the disk version when I save.
            </span>
          </Button>
        </div>
      </div>
    </DialogModal>
  );
}
