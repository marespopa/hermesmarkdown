import Button from "@/app/components/Button";
import { FaTimes } from "react-icons/fa";
import React from "react";
import { useAtom } from "jotai";
import { atom_theme } from "@/app/atoms/atoms";
import DropdownMenu from "@/app/components/DropdownMenu";
import { atom_fontFamily } from "@/app/atoms/atoms";
import { showCopyToast } from "@/app/components/Toastr";
import { copyCleanPrompt } from "@/app/services/prompt-utils";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  actions: {
    handleNewFile: () => void;
    handleOpenFile: () => void;
    handleSelectTemplate: () => void;
    handleOpenFindAndReplace: () => void;
    handleOpenFontSettings: () => void;
  };
  contentEdited: string;
  fontOptions: { value: string; label: string }[];
  fontSizeOptions: { value: string; label: string }[];
  exportToMD: () => void;
}

const MobileMenu: React.FC<MobileMenuProps> = ({
  isOpen,
  onClose,
  actions,
  contentEdited,
  fontOptions,
  fontSizeOptions,
  exportToMD,
}) => {
  const [theme, setTheme] = useAtom(atom_theme);
  const [fontFamily, setFontFamily] = useAtom(atom_fontFamily);
  const [isFontMenuOpen, setIsFontMenuOpen] = React.useState(false);

  if (!isOpen) return null;

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  const handleThemeToggle = () => {
    setTheme(theme === "light" ? "dark" : "light");
    onClose();
  };

  const handleCopyPrompt = async () => {
    const success = await copyCleanPrompt(contentEdited);
    if (success) {
      showCopyToast("Prompt copied succesfully!");
    } else {
      showCopyToast("Failed to copy prompt");
    }
    onClose();
  };

  const handleDocumentation = () => {
    window.location.assign('/documentation');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-gray-900 bg-opacity-95 dark:bg-opacity-95">
      <Button
        variant="icon"
        onClick={onClose}
        aria-label="Close Menu"
        title="Close Menu"
      >
        <FaTimes />
      </Button>
      <div className="flex flex-col gap-3 max-w-xs mx-auto px-4 mt-8 mb-4 overflow-y-auto max-h-[80vh] items-stretch">
        <div className="flex flex-col gap-3 w-full items-center">
          <Button variant="primary" label="New File" onClick={() => handleAction(actions.handleNewFile)} />
          <Button variant="primary" label="Template" onClick={() => handleAction(actions.handleSelectTemplate)} />
          <Button variant="primary" label="Export File" onClick={() => handleAction(exportToMD)} />
          <Button variant="primary" label="Import File" onClick={() => handleAction(actions.handleOpenFile)} />
          <Button variant="primary" label="Copy Prompt" onClick={handleCopyPrompt} />
          <Button variant="primary" label="Replace" onClick={() => handleAction(actions.handleOpenFindAndReplace)} />
          <Button variant="primary" label="Font" onClick={() => handleAction(actions.handleOpenFontSettings)} />
          <Button variant="primary" label={theme === "light" ? "Dark Mode" : "Light Mode"} onClick={handleThemeToggle} />
          <Button variant="primary" label="Documentation" onClick={handleDocumentation} />
        </div>
      </div>
    </div>
  );
};

export default MobileMenu; 