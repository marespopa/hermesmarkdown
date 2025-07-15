import React from "react";
import Button from "@/app/components/Button";
import { FaTimes, FaFile, FaSave, FaFilePdf, FaKeyboard, FaSearch, FaMoon, FaSun, FaCopy } from "react-icons/fa";
import { useAtom } from "jotai";
import { atom_theme } from "@/app/atoms/atoms";

interface ActionsMobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  actions: {
    handleNewFile: () => void;
    handleOpenFile: () => void;
    handleSelectTemplate: () => void;
    handleOpenFindAndReplace: () => void;
  };
  contentEdited: string;
  exportToMD: () => void;
  showPdfPreviewModal: () => void;
  setIsShortcutsOpen: (open: boolean) => void;
  renderFileMenu: () => React.ReactNode;
  renderEditMenu: () => React.ReactNode;
  renderHelpMenu: () => React.ReactNode;
}

const ActionsMobileMenu: React.FC<ActionsMobileMenuProps> = ({
  isOpen,
  onClose,
  actions,
  contentEdited,
  exportToMD,
  showPdfPreviewModal,
  setIsShortcutsOpen
}) => {
  const [theme, setTheme] = useAtom(atom_theme);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-gray-900 bg-opacity-95 dark:bg-opacity-95">
      <Button
        variant="icon"
        onClick={onClose}
        aria-label="Close Menu"
        title="Close Menu"
        styles="absolute top-4 right-4"
      >
        <FaTimes />
      </Button>
      <div className="flex flex-col gap-4 px-4 mt-8 mb-4 overflow-y-auto max-h-[80vh] items-stretch w-full">
        <Button variant="secondary" onClick={actions.handleNewFile} label={<><FaFile className="inline mr-2" />New File</>} styles="w-full" />
        <Button variant="secondary" onClick={actions.handleOpenFile} label={<><FaFile className="inline mr-2" />Open File</>} styles="w-full" />
        <Button variant="secondary" onClick={actions.handleSelectTemplate} label={<><FaFile className="inline mr-2" />Select Template</>} styles="w-full" />
        <Button variant="secondary" onClick={exportToMD} label={<><FaSave className="inline mr-2" />Save As</>} styles="w-full" />
        <Button variant="secondary" onClick={showPdfPreviewModal} label={<><FaFilePdf className="inline mr-2" />Export to PDF</>} styles="w-full" />
        <Button variant="secondary" onClick={actions.handleOpenFindAndReplace} label={<><FaSearch className="inline mr-2" />Find and Replace</>} styles="w-full" />
        <Button variant="secondary" onClick={() => setTheme(theme === "light" ? "dark" : "light")} label={<>{theme === 'light' ? <FaMoon className="inline mr-2" /> : <FaSun className="inline mr-2" />} {theme === 'light' ? "Dark Mode" : "Light Mode"}</>} styles="w-full" />
        <Button variant="secondary" onClick={() => navigator.clipboard.writeText(contentEdited)} label={<><FaCopy className="inline mr-2" /> Copy Markdown</>} styles="w-full" />
      </div>
    </div>
  );
};

export default ActionsMobileMenu; 