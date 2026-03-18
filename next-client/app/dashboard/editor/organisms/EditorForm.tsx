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

  const activeFile = files.find(f => f.id === selectedId);

  const [localData, setLocalData] = useState({
    title: "",
    description: "",
    fileName: "",
    tags: "",
  });

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

    const updatedFiles = files.map((f) =>
      f.id === activeFile.id
        ? { ...f, frontMatter: { ...localData }, isSaved: false }
        : f
    );
    
    setFiles(updatedFiles);
    showSaveStateToast("saved");
    
    setTimeout(() => {
      setSaveState(false);
      handleClose();
    }, 300);
  };

  return (
    <DialogModal isOpened={isOpened} onClose={handleClose}>
      <form className="w-full max-w-lg p-6 font-mono" onSubmit={handleSave}>
        {/* Header Section */}
        <div className="mb-8">
          <h2 className="text-xl font-normal text-zinc-800 dark:text-zinc-100 tracking-tight font-serif italic">
            document_settings
          </h2>
          <p className="text-[12px] text-zinc-400 dark:text-zinc-500 mt-1">
            manage metadata and frontmatter
          </p>
        </div>

        {/* Form Fields */}
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
            <Input
              label="file name"
              name="fileName"
              value={localData.fileName}
              handleChange={(e) => handleChange("fileName", e.currentTarget.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Input
              label="title"
              name="title"
              value={localData.title}
              handleChange={(e) => handleChange("title", e.currentTarget.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Textarea
            label="description"
            name="description"
            value={localData.description}
            handleChange={(e) => handleChange("description", e.currentTarget.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Input
            label="tags (comma separated)"
            name="tags"
            value={localData.tags}
            handleChange={(e) => handleChange("tags", e.currentTarget.value)}
          />
        </div>
      </div>

      {/* Actions Section */}
      <div className="mt-10 flex items-center justify-end gap-3 pt-6 border-t border-zinc-100 dark:border-zinc-800">
        <Button
          variant="tertiary"
          onClick={handleClose}
        >
          cancel
        </Button>
        <Button
          variant="primary"
          type="submit"
          label={saveState ? "saving..." : "save_changes"}
            disabled={saveState}
          />
        </div>
      </form>
    </DialogModal>
  );
}
