"use client";

import { useAtom } from "jotai";
import {
  atom_pendingFileSwitch,
  atom_content,
  atom_activeFileHandle,
  atom_fileName,
} from "@/app/atoms/atoms";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import Button from "@/app/components/Button";
import { useFileSystem } from "@/app/hooks/use-file-system";

export default function UnsavedChangesDialog() {
  const [pendingSwitch, setPendingSwitch] = useAtom(atom_pendingFileSwitch);
  const [content] = useAtom(atom_content);
  const [fileName] = useAtom(atom_fileName);
  const [activeFileHandle] = useAtom(atom_activeFileHandle);
  const { saveFile, openFile, exportFile } = useFileSystem();

  if (!pendingSwitch) return null;

  const handleSaveAndSwitch = async () => {
    if (!pendingSwitch) return;
    
    // Try normal save first
    let success = await saveFile(content);
    
    // Fallback for read-only handles (Android) or new drafts
    if (!success) {
      success = await exportFile(content, fileName);
    }

    if (success) {
      const { handle, path } = pendingSwitch;
      setPendingSwitch(null);
      // Use setTimeout to ensure the modal closing doesn't interfere with the next state update if needed, 
      // though Jotai handles this well. force=true to bypass the dirty check.
      await openFile(handle, path, true);
    }
  };

  const handleDiscardAndSwitch = async () => {
    if (!pendingSwitch) return;
    const { handle, path } = pendingSwitch;
    setPendingSwitch(null);
    await openFile(handle, path, true);
  };

  const handleCancel = () => {
    setPendingSwitch(null);
  };

  return (
    <DialogModal
      isOpened={!!pendingSwitch}
      onClose={handleCancel}
      onConfirm={handleSaveAndSwitch}
      styles="max-w-md"
    >
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Unsaved Changes</h3>
        <p className="text-sm opacity-70">
          You have unsaved changes in <span className="font-bold text-blue-500">"{activeFileHandle?.name || "current file"}"</span>. 
          Do you want to save them before switching?
        </p>
        
        <div className="flex flex-col gap-3 pt-4">
          <Button variant="primary" onClick={handleSaveAndSwitch} className="w-full text-left flex flex-col items-start py-4">
            <span className="font-bold">Save & Switch</span>
            <span className="text-[10px] opacity-70 font-normal mt-0.5">
              Save your changes and open the next file.
            </span>
          </Button>
          
          <Button variant="secondary" onClick={handleDiscardAndSwitch} className="w-full text-left flex flex-col items-start py-4">
            <span className="font-bold">Discard & Switch</span>
            <span className="text-[10px] opacity-70 font-normal mt-0.5">
              Lose all unsaved changes and open the next file.
            </span>
          </Button>

          <Button variant="secondary" onClick={handleCancel} className="w-full text-center py-2">
            Cancel
          </Button>
        </div>
      </div>
    </DialogModal>
  );
}
