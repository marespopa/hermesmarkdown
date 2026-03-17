"use client";

import { atom_files, atom_selectedFileId } from "@/app/atoms/atoms";
import Button from "@/app/components/Button";
import DialogModal from "@/app/components/DialogModal";
import Input from "@/app/components/Input";
import showSaveStateToast from "@/app/components/Toastr";
import Textarea from "@/app/components/Textarea";
import { useAtom, useAtomValue } from "jotai";
import { FormEvent, useEffect, useState } from "react";

interface Props {
  isOpened: boolean;
  handleClose: () => void;
}

export default function EditorForm({ isOpened, handleClose }: Props) {
  const [files, setFiles] = useAtom(atom_files);
  const selectedId = useAtomValue(atom_selectedFileId);
  const [saveState, setSaveState] = useState(false);

  // Find the file locally so we can edit it without affecting the global state until "Save" is hit
  const activeFile = files.find(f => f.id === selectedId);

  const [localData, setLocalData] = useState({
    title: "",
    description: "",
    fileName: "",
    tags: "",
  });

  // Sync local state when modal opens
  useEffect(() => {
    if (isOpened && activeFile) {
      setLocalData({
        title: activeFile.frontMatter?.title || "",
        description: activeFile.frontMatter?.description || "",
        fileName: activeFile.frontMatter?.fileName || "",
        tags: activeFile.frontMatter?.tags || "",
      });
    }
  }, [isOpened, activeFile]);

  const handleChange = (field: string, value: string) => {
    setLocalData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (!activeFile) return;

    setSaveState(true);

    // Update the files array
    const updatedFiles = files.map((f) =>
      f.id === activeFile.id
        ? { ...f, frontMatter: { ...localData }, isSaved: false }
        : f
    );
    
    setFiles(updatedFiles);

    // Success Actions
    showSaveStateToast("saved");
    
    // Minimal delay to show the button state before closing
    setTimeout(() => {
      setSaveState(false);
      handleClose();
    }, 300);
  };

  return (
    <DialogModal isOpened={isOpened} onClose={handleClose}>
      <form className="w-full max-w-lg p-2" onSubmit={handleSave}>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
            Document Settings
          </h2>
          <p className="text-xs text-neutral-500 font-medium">Edit file metadata and frontmatter</p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              name="fileName"
              label="File Name"
              value={localData.fileName}
              handleChange={(e) => handleChange("fileName", e.currentTarget.value)}
            />
            <Input
              name="title"
              label="Title"
              value={localData.title}
              handleChange={(e) => handleChange("title", e.currentTarget.value)}
            />
          </div>

          <Textarea
            name="description"
            label="Description"
            value={localData.description}
            handleChange={(e) => handleChange("description", e.currentTarget.value)}
          />

          <Input
            name="tags"
            label="Tags"
            value={localData.tags}
            handleChange={(e) => handleChange("tags", e.currentTarget.value)}
          />
        </div>

        <div className="mt-8 flex items-center justify-end gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
          <button
            type="button"
            onClick={handleClose}
            className="text-xs font-bold text-neutral-500 hover:text-neutral-700 px-4 py-2 transition-colors"
          >
            Cancel
          </button>
          <Button
            variant="primary"
            type="submit"
            label={saveState ? "Saving..." : "Save Properties"}
            disabled={saveState}
            styles="!py-2 !px-6 !text-xs shadow-lg shadow-sky-500/20"
          />
        </div>
      </form>
    </DialogModal>
  );
}
