"use client";

import { atom_frontMatter, atom_hasChanges } from "@/app/atoms/atoms";
import Button from "@/app/components/Button";
import DialogModal from "@/app/components/DialogModal";
import Input from "@/app/components/Input";
import LoadingOverlay from "@/app/components/LoadingOverlay";
import SaveStateText, {
  SaveState,
} from "@/app/components/SaveStateText/SaveStateText";
import Textarea from "@/app/components/Textarea";
import { useAtom } from "jotai";
import { FormEvent, useEffect, useRef, useState } from "react";

interface Props {
  isOpened: boolean;
  handleClose: () => void;
}

type Timeout = ReturnType<typeof setTimeout> | null;

export default function EditorForm({ isOpened, handleClose }: Props) {
  const [, setHasChanges] = useAtom(atom_hasChanges);
  const [frontMatterData, setFrontMatterData] = useAtom(atom_frontMatter);
  const [saveState, setSaveState] = useState<SaveState>("none");
  const [localFrontMatterData, setLocalFrontMatterData] = useState(frontMatterData);
  const savingTimeout = useRef<Timeout>(null);
  const savedTimeout = useRef<Timeout>(null);

  useEffect(() => {
    setSaveState("none");
    setLocalFrontMatterData(frontMatterData);
  }, [isOpened, frontMatterData]);

  const handleChange = (e: FormEvent<any>, field: string) => {
    const element = e.currentTarget as HTMLInputElement | HTMLTextAreaElement;
    const value = element.value;
    setLocalFrontMatterData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
    setSaveState("none");
  };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    setFrontMatterData(localFrontMatterData);
    setSaveState("saving");
    setHasChanges(false);
    if (savingTimeout.current) clearTimeout(savingTimeout.current);
    if (savedTimeout.current) clearTimeout(savedTimeout.current);
    savingTimeout.current = setTimeout(() => {
      setSaveState("saved");
    }, 800);
  };

  const hasUnsavedChanges = JSON.stringify(localFrontMatterData) !== JSON.stringify(frontMatterData);

  return (
    <DialogModal isOpened={isOpened} onClose={handleClose}>
      <form className="mt-8 max-w-xl" onSubmit={handleSave}>
        <h3 className="text-2xl mt-4 flex gap-2 items-center justify-between">
          <span>Document Properties</span>
        </h3>
        <p className="mt-2 my-4 text-sm text-gray-500">
          These fields, which will be saved as frontmatter, contain essential
          information about your Markdown file.
        </p>
        <Input
          label="File Name"
          name="fileName"
          value={localFrontMatterData.fileName}
          handleChange={(e) => handleChange(e, "fileName")}
          helperText="The extension .md will be automatically added when saving."
        />
        <Input
          label="Title"
          name="title"
          value={localFrontMatterData.title}
          handleChange={(e) => handleChange(e, "title")}
        />
        <Textarea
          label="Description"
          name="description"
          value={localFrontMatterData.description}
          handleChange={(e) => handleChange(e, "description")}
        />
        <Input
          label="Tags"
          name="tags"
          value={localFrontMatterData.tags}
          handleChange={(e) => handleChange(e, "tags")}
          helperText="Separate tags by using comma ,"
        />
        <div className="flex gap-2 items-center">
          <Button
            variant="primary"
            type="submit"
            label="Save"
            disabled={!hasUnsavedChanges}
          />
          <Button
            variant="secondary"
            onClick={handleClose}
            label="Close"
            type="button"
          />
          <SaveStateText status={saveState} />
        </div>
      </form>
    </DialogModal>
  );
}
