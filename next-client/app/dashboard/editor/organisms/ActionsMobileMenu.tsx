import React from "react";
import Button from "@/app/components/Button";
import { FaTimes, FaFile, FaDownload, FaSearch, FaFolderOpen, FaClipboardList, FaCog, FaCopy, FaSun, FaMoon } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { useAtom } from "jotai";
import { atom_theme } from "@/app/atoms/atoms";

interface ActionsMobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  actions: {
    handleNewFile: () => void;
    handleOpenFile: () => void;
    handleOpenFindAndReplace: () => void;
    handleCopyPrompt: () => void;
  };
  exportToMD: () => void;
}

const ActionsMobileMenu: React.FC<ActionsMobileMenuProps> = ({
  isOpen,
  onClose,
  actions,
  exportToMD
}) => {
  const router = useRouter();
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
        <Button variant="primary" onClick={actions.handleCopyPrompt} label={<><FaCopy className="inline mr-2" />Copy Prompt</>} styles="w-full" />
        <Button variant="secondary" onClick={actions.handleOpenFindAndReplace} label={<><FaSearch className="inline mr-2" />Search</>} styles="w-full" />
        <hr className="border-t border-gray-200 dark:border-neutral-700 w-full my-2" />
        <Button variant="secondary" onClick={actions.handleNewFile} label={<><FaFile className="inline mr-2" />New File</>} styles="w-full" />
        <Button variant="secondary" onClick={actions.handleOpenFile} label={<><FaFolderOpen className="inline mr-2" />Import File</>} styles="w-full" />
        <Button variant="secondary" onClick={exportToMD} label={<><FaDownload className="inline mr-2" />Export</>} styles="w-full" />
        <Button
          variant="secondary"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          label={<>{theme === "light" ? <FaMoon className="inline mr-2" /> : <FaSun className="inline mr-2" />}{theme === "light" ? "Dark Mode" : "Light Mode"}</>}
          styles="w-full"
        />
        <Button
          variant="secondary"
          onClick={() => {
            router.push("/dashboard/settings");
            onClose();
          }}
          label={<><FaCog className="inline mr-2" />Settings</>}
          styles="w-full"
        />
      </div>
    </div>
  );
};

export default ActionsMobileMenu; 
