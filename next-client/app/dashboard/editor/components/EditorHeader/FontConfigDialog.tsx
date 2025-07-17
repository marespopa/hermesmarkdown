import React, { useState } from "react";
import DialogModal from "@/app/components/DialogModal";
import Button from "@/app/components/Button";
import FontMenu from "./FontMenu";
import FontSizeMenu from "./FontSizeMenu";

interface FontConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (fontFamily: string, fontSize: string) => void;
  initialFontFamily: string;
  initialFontSize: string;
}

const fontOptions = [
  { value: "Fira Mono, monospace", label: "Fira Mono" },
  { value: "JetBrains Mono, monospace", label: "JetBrains Mono" },
  { value: "Source Code Pro, monospace", label: "Source Code Pro" },
  { value: "Inconsolata, monospace", label: "Inconsolata" },
  { value: "Ubuntu Mono, monospace", label: "Ubuntu Mono" },
];

const fontSizeOptions = [
  { value: "14px", label: "Small" },
  { value: "16px", label: "Normal" },
  { value: "18px", label: "Large" },
  { value: "20px", label: "Extra Large" },
];

const labelClass = "text-xs text-neutral-400 dark:text-neutral-400 mb-1";

const FontConfigDialog: React.FC<FontConfigDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  initialFontFamily,
  initialFontSize,
}) => {
  const [fontFamily, setFontFamily] = useState(initialFontFamily);
  const [fontSize, setFontSize] = useState(initialFontSize);

  function handleSave() {
    onSave(fontFamily, fontSize);
    onClose();
  }

  return (
    <DialogModal isOpened={isOpen} onClose={onClose}>
      <h2 className="text-2xl font-bold mt-2">Font Settings</h2>
      <div className="flex flex-col gap-4 mt-6 w-full max-w-2xl mx-auto">
        <div>
          <div className={labelClass}>Font Family</div>
          <FontMenu fontOptions={fontOptions} setFontFamily={setFontFamily} value={fontFamily} />
        </div>
        <div>
          <div className={labelClass}>Font Size</div>
          <FontSizeMenu fontSizeOptions={fontSizeOptions} setFontSize={setFontSize} value={fontSize} />
        </div>
      </div>
      <div className="mt-16 flex gap-2 justify-start">
        <Button variant="secondary" onClick={onClose} label="Cancel" />
        <Button variant="primary" onClick={handleSave} label="Save" />
      </div>
    </DialogModal>
  );
};

export default FontConfigDialog; 