import React from "react";
import Button from "@/app/components/Button";
import { FaFile, FaFolderOpen, FaSave, FaFilePdf, FaKeyboard, FaCopy, FaSearch, FaChevronLeft, FaChevronRight, FaClock, FaQuestion, FaSun, FaMoon, FaFont, FaRegClone } from "react-icons/fa";
import classNames from "classnames";
import { useAtom } from "jotai";
import { atom_theme, atom_sidebarCollapsed } from "@/app/atoms/atoms";
import { showCopyToast } from "@/app/components/Toastr";

interface ActionsSidebarProps {
  actions: {
    handleNewFile: () => void;
    handleOpenFile: () => void;
    handleSelectTemplate: () => void;
    handleOpenFindAndReplace: () => void;
    handleOpenFontSettings?: () => void;
  };
  contentEdited: string;
  exportToMD: () => void;
  showPdfPreviewModal: () => void;
  setIsShortcutsOpen: (open: boolean) => void;
  showTimer: boolean;
  setShowTimer: (show: boolean) => void;
  onShowFindBar: () => void;
  isFindBarOpen: boolean; // new prop
}

const labelClass = "hidden xl:inline ml-2";
const dividerClass = "my-2 border-t border-gray-300 dark:border-neutral-500 w-full";
const sectionHeaderClass = "text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 px-2 mt-2 mb-1 w-full text-center";

// Helper for button styles based on collapsed state
const getButtonStyles = (collapsed: boolean) =>
  classNames(
    "border border-neutral-200 dark:border-neutral-700",
    collapsed ? "mx-auto" : "w-full justify-start"
  );

const ActionsSidebar: React.FC<ActionsSidebarProps> = ({
  actions,
  contentEdited,
  exportToMD,
  showPdfPreviewModal,
  setIsShortcutsOpen,
  showTimer,
  setShowTimer,
  onShowFindBar,
  isFindBarOpen,
}) => {
  const [theme, setTheme] = useAtom(atom_theme);
  const [collapsed, setCollapsed] = useAtom(atom_sidebarCollapsed);
  // Helper to conditionally show label
  const getLabelClass = () => (collapsed ? "hidden" : labelClass);

  return (
    <aside
      className={classNames(
        "fixed top-0 left-0 h-full z-30 bg-white dark:bg-neutral-700 border-r border-gray-200 dark:border-gray-800 flex flex-col items-center transition-all duration-200 overflow-y-auto overflow-x-hidden",
        collapsed ? "w-16" : "w-56"
      )}
    >
      <div className={classNames(
        "flex flex-col gap-1 flex-1 w-full py-4",
        collapsed ? "items-center" : "items-start px-4"
      )}>
        {/* Collapse sidebar button */}
        <Button
          variant="icon"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          styles="mb-2"
        >
          {collapsed ? <FaChevronRight /> : <FaChevronLeft />}
        </Button>
        {/* Main file actions */}
        <Button
          variant="icon"
          onClick={actions.handleNewFile}
          aria-label="New File"
          title="New File"
          styles={classNames(getButtonStyles(collapsed), "dark:border-neutral-600")}
        >
          <FaFile /> <span className={getLabelClass()}>New File</span>
        </Button>
        <Button
          variant="icon"
          onClick={exportToMD}
          aria-label="Save As"
          title="Save As"
          styles={getButtonStyles(collapsed)}
        >
          <FaSave /> <span className={getLabelClass()}>Save As</span>
        </Button>
        <Button
          variant="icon"
          onClick={actions.handleSelectTemplate}
          aria-label="Select Template"
          title="Select Template"
          styles={getButtonStyles(collapsed)}
        >
          <FaRegClone /> <span className={getLabelClass()}>Template</span>
        </Button>
        <Button
          variant="icon"
          onClick={actions.handleOpenFile}
          aria-label="Import File"
          title="Import File"
          styles={getButtonStyles(collapsed)}
        >
          <FaFolderOpen /> <span className={getLabelClass()}>Import File</span>
        </Button>
        <span className={classNames(
          "my-2 border-t border-gray-300 dark:border-neutral-500",
          collapsed ? "w-8 mx-auto" : "w-full"
        )} />
        {/* Edit Section */}
        <div className={classNames(sectionHeaderClass, collapsed && "hidden")}>Edit</div>
        {/* Search button */}
        <Button
          variant="icon"
          aria-label="Show Find Bar"
          onClick={onShowFindBar}
          styles={getButtonStyles(collapsed)}
        >
          <FaSearch /> <span className={getLabelClass()}>Search</span>
        </Button>

        {/* Copy Markdown button */}
        <Button
          variant="icon"
          onClick={() => {
            navigator.clipboard.writeText(contentEdited);
            showCopyToast("Markdown copied to clipboard");
          }}
          aria-label="Copy Markdown"
          title="Copy Markdown"
          styles={getButtonStyles(collapsed)}
        >
          <FaCopy /> <span className={getLabelClass()}>Copy Markdown</span>
        </Button>
        <Button
          variant="icon"
          onClick={actions.handleOpenFontSettings}
          aria-label="Font Settings"
          title="Font Settings"
          styles={getButtonStyles(collapsed)}
        >
          <FaFont /> <span className={getLabelClass()}>Font Settings</span>
        </Button>
        <span className={dividerClass} />
        {/* Export Section */}
        <div className={classNames(sectionHeaderClass, collapsed && "hidden")}>Export</div>
        <Button
          variant="icon"
          onClick={showPdfPreviewModal}
          aria-label="Export to PDF"
          title="Export to PDF"
          styles={getButtonStyles(collapsed)}
        >
          <FaFilePdf /> <span className={getLabelClass()}>Export PDF</span>
        </Button>
        <span className={dividerClass} />
        {/* Tools Section */}
        <div className={classNames(sectionHeaderClass, collapsed && "hidden")}>Tools</div>
        <Button
          variant="icon"
          onClick={() => setShowTimer(!showTimer)}
          aria-label="Toggle Timer"
          title="Toggle Timer"
          styles={getButtonStyles(collapsed)}
        >
          <FaClock /> <span className={getLabelClass()}>Timer</span>
        </Button>
        <Button
          variant="icon"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          aria-label={theme === "light" ? "Dark" : "Light"}
          title={theme === "light" ? "Dark" : "Light"}
          styles={getButtonStyles(collapsed)}
        >
          {theme === "light" ? <FaMoon className="w-5 h-5" /> : <FaSun className="w-5 h-5" />}
          <span className={getLabelClass()}>{theme === "light" ? "Dark" : "Light"}</span>
        </Button>
        <Button
          variant="icon"
          onClick={() => setIsShortcutsOpen(true)}
          aria-label="Keyboard Shortcuts"
          title="Keyboard Shortcuts"
          styles={getButtonStyles(collapsed)}
        >
          <FaKeyboard /> <span className={getLabelClass()}>Shortcuts</span>
        </Button>
        <span className={dividerClass} />
        {/* Help Section */}
        <div className={classNames(sectionHeaderClass, collapsed && "hidden")}>Help</div>
        <Button
          variant="icon"
          onClick={() => window.open('/documentation', '_blank')}
          aria-label="Documentation"
          title="Documentation"
          styles={getButtonStyles(collapsed)}
        >
          <FaQuestion /> <span className={getLabelClass()}>Docs</span>
        </Button>
      </div>
    </aside>
  );
};

export default ActionsSidebar; 