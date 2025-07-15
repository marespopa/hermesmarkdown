import Button from "@/app/components/Button";
import DropdownMenu from "@/app/components/DropdownMenu";
import { FaTimes } from "react-icons/fa";
import React, { useState } from "react";
import { useAtom } from "jotai";
import { atom_theme, atom_fontFamily, atom_fontSize } from "@/app/atoms/atoms";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  actions: {
    handleNewFile: () => void;
    handleOpenFile: () => void;
    handleSelectTemplate: () => void;
    handleOpenFindAndReplace: () => void;
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
  const [fontSize, setFontSize] = useAtom(atom_fontSize);
  const [fontMenuOpen, setFontMenuOpen] = useState(false);
  const [fontSizeMenuOpen, setFontSizeMenuOpen] = useState(false);
  const fontMenuSelected = fontOptions.findIndex(option => option.value === fontFamily);
  const fontSizeMenuSelected = fontSizeOptions.findIndex(option => option.value === fontSize);
  if (!isOpen) return null;
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
        <DropdownMenu
          options={fontOptions.map(option => ({ label: option.label, action: () => setFontFamily(option.value) }))}
          label={<span>Aa</span>}
          isOpen={fontMenuOpen}
          onOpenChange={setFontMenuOpen}
          selectedIndex={fontMenuSelected === -1 ? null : fontMenuSelected}
          onSelect={idx => setFontFamily(fontOptions[idx].value)}
        />
        <DropdownMenu
          options={fontSizeOptions.map(option => ({ label: option.label, action: () => setFontSize(option.value) }))}
          label={<span>Size</span>}
          isOpen={fontSizeMenuOpen}
          onOpenChange={setFontSizeMenuOpen}
          selectedIndex={fontSizeMenuSelected === -1 ? null : fontSizeMenuSelected}
          onSelect={idx => setFontSize(fontSizeOptions[idx].value)}
        />
        <div className="mb-6" />
        <div className="flex flex-col gap-3 w-full items-center">
          <Button variant="primary" label="New File" onClick={actions.handleNewFile} />
          <Button variant="secondary" label="Template" onClick={actions.handleSelectTemplate} />
          <Button variant="primary" label="Save File" onClick={exportToMD} />
          <Button variant="primary" label="Open File" onClick={actions.handleOpenFile} />
          <Button variant="primary" label="Copy Markdown" onClick={() => navigator.clipboard.writeText(contentEdited)} />
          <Button variant="primary" label="Find/Replace" onClick={actions.handleOpenFindAndReplace} />
          <Button variant="primary" label={theme === "light" ? "Dark Mode" : "Light Mode"} onClick={() => setTheme(theme === "light" ? "dark" : "light")} />
          <Button variant="primary" label="Documentation" onClick={() => window.location.assign('/documentation')} />
        </div>
      </div>
    </div>
  );
};

export default MobileMenu; 