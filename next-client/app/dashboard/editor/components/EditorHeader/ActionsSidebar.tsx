import React from "react";
import Button from "@/app/components/Button";
import { FaFile, FaFolderOpen, FaSave, FaFilePdf, FaKeyboard, FaCopy, FaSearch, FaChevronLeft, FaChevronRight, FaClock, FaQuestion, FaSun, FaMoon } from "react-icons/fa";
import classNames from "classnames";
import { useAtom } from "jotai";
import { atom_theme, atom_sidebarCollapsed } from "@/app/atoms/atoms";

interface ActionsSidebarProps {
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
  showTimer: boolean;
  setShowTimer: (show: boolean) => void;
}

const labelClass = "hidden xl:inline ml-2";
const dividerClass = "my-2 border-t border-gray-300 dark:border-gray-700 w-full";
const sectionHeaderClass = "text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 px-2 mt-2 mb-1 w-full text-center";

const ActionsSidebar: React.FC<ActionsSidebarProps> = ({
  actions,
  contentEdited,
  exportToMD,
  showPdfPreviewModal,
  setIsShortcutsOpen,
  showTimer,
  setShowTimer,
}) => {
  const [theme, setTheme] = useAtom(atom_theme);
  const [collapsed, setCollapsed] = useAtom(atom_sidebarCollapsed);
  // Remove local collapsed state
  // Helper to conditionally show label
  const getLabelClass = () => (collapsed ? "hidden" : labelClass);

  return (
    <aside
      className={classNames(
        "fixed top-0 left-0 h-full z-30 bg-white dark:bg-neutral-700 border-r border-gray-200 dark:border-gray-800 flex flex-col items-center transition-all duration-200",
        collapsed ? "w-16" : "w-56"
      )}
    >
      {/* Collapse/Expand Button (fixed at top) */}
      <div className="flex-shrink-0 w-full flex flex-col items-center py-4">
        <Button
          variant="icon"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          styles="mb-4"
        >
          {collapsed ? <FaChevronRight /> : <FaChevronLeft />}
        </Button>
      </div>
      {/* Scrollable actions area */}
      <div className="flex flex-col gap-1 flex-1 w-full items-start overflow-y-auto overflow-x-hidden text-left">
        {/* File Section */}
        <div className={sectionHeaderClass + (collapsed ? " hidden" : "")}>File</div>
        <Button
          variant="icon"
          onClick={actions.handleNewFile}
          aria-label="New File"
          title="New File"
          styles="w-full justify-start pl-0 border border-neutral-200 dark:border-neutral-600"
        >
          <FaFile /> <span className={getLabelClass()}>New File</span>
        </Button>
        <Button
          variant="icon"
          onClick={actions.handleOpenFile}
          aria-label="Open File"
          title="Open File"
          styles="w-full justify-start pl-0 border border-neutral-200 dark:border-neutral-700"
        >
          <FaFolderOpen /> <span className={getLabelClass()}>Open File</span>
        </Button>
        <Button
          variant="icon"
          onClick={actions.handleSelectTemplate}
          aria-label="Select Template"
          title="Select Template"
          styles="w-full justify-start pl-0 border border-neutral-200 dark:border-neutral-700"
        >
          <FaFile /> <span className={getLabelClass()}>Template</span>
        </Button>
        <Button
          variant="icon"
          onClick={exportToMD}
          aria-label="Save As"
          title="Save As"
          styles="w-full justify-start pl-0 border border-neutral-200 dark:border-neutral-700"
        >
          <FaSave /> <span className={getLabelClass()}>Save As</span>
        </Button>
        <span className={dividerClass} />
        {/* Edit Section */}
        <div className={sectionHeaderClass + (collapsed ? " hidden" : "")}>Edit</div>
        <Button
          variant="icon"
          onClick={() => navigator.clipboard.writeText(contentEdited)}
          aria-label="Copy Markdown"
          title="Copy Markdown"
          styles="w-full justify-start pl-0 border border-neutral-200 dark:border-neutral-700"
        >
          <FaCopy /> <span className={getLabelClass()}>Copy Markdown</span>
        </Button>
        <Button
          variant="icon"
          onClick={actions.handleOpenFindAndReplace}
          aria-label="Find and Replace"
          title="Find and Replace"
          styles="w-full justify-start pl-0 border border-neutral-200 dark:border-neutral-700"
        >
          <FaSearch /> <span className={getLabelClass()}>Find/Replace</span>
        </Button>
        <span className={dividerClass} />
        {/* Export Section */}
        <div className={sectionHeaderClass + (collapsed ? " hidden" : "")}>Export</div>
        <Button
          variant="icon"
          onClick={showPdfPreviewModal}
          aria-label="Export to PDF"
          title="Export to PDF"
          styles="w-full justify-start pl-0 border border-neutral-200 dark:border-neutral-700"
        >
          <FaFilePdf /> <span className={getLabelClass()}>Export PDF</span>
        </Button>
        <span className={dividerClass} />
        {/* Tools Section */}
        <div className={sectionHeaderClass + (collapsed ? " hidden" : "")}>Tools</div>
        <Button
          variant="icon"
          onClick={() => setShowTimer(!showTimer)}
          aria-label="Toggle Timer"
          title="Toggle Timer"
          styles="w-full justify-start pl-0 border border-neutral-200 dark:border-neutral-700"
        >
          <FaClock /> <span className={getLabelClass()}>Timer</span>
        </Button>
        <Button
          variant="icon"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          aria-label={theme === "light" ? "Dark" : "Light"}
          title={theme === "light" ? "Dark" : "Light"}
          styles="w-full justify-start pl-0 border border-neutral-200 dark:border-neutral-700"
        >
          {theme === "light" ? <FaMoon className="w-5 h-5" /> : <FaSun className="w-5 h-5" />}
          <span className={getLabelClass()}>{theme === "light" ? "Dark" : "Light"}</span>
        </Button>
        <Button
          variant="icon"
          onClick={() => setIsShortcutsOpen(true)}
          aria-label="Keyboard Shortcuts"
          title="Keyboard Shortcuts"
          styles="w-full justify-start pl-0 border border-neutral-200 dark:border-neutral-700"
        >
          <FaKeyboard /> <span className={getLabelClass()}>Shortcuts</span>
        </Button>
        <span className={dividerClass} />
        {/* Help Section */}
        <div className={sectionHeaderClass + (collapsed ? " hidden" : "")}>Help</div>
        <Button
          variant="icon"
          onClick={() => window.open('/documentation', '_blank')}
          aria-label="Documentation"
          title="Documentation"
          styles="w-full justify-start pl-0 border border-neutral-200 dark:border-neutral-700"
        >
          <FaQuestion /> <span className={getLabelClass()}>Docs</span>
        </Button>
      </div>
    </aside>
  );
};

export default ActionsSidebar; 