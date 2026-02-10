import React from "react";
import Button from "@/app/components/Button";
import { FaFile, FaFolderOpen, FaDownload, FaSearch, FaChevronLeft, FaChevronRight, FaClipboardList, FaCog, FaCopy, FaSun, FaMoon } from "react-icons/fa";
import classNames from "classnames";
import { useAtom } from "jotai";
import { atom_sidebarCollapsed, atom_theme } from "@/app/atoms/atoms";
import { useRouter } from "next/navigation";

interface ActionsSidebarProps {
  actions: {
    handleNewFile: () => void;
    handleOpenFile: () => void;
    handleSelectTemplate: () => void;
    handleOpenFindAndReplace: () => void;
    handleCopyPrompt: () => void;
  };
  exportToMD: () => void;
  onShowFindBar: () => void;
}

const labelClass = "hidden xl:inline ml-2 text-left";
const dividerClass = "my-3 border-t border-gray-200 dark:border-neutral-700 w-full";

// Helper for button styles based on collapsed state
const getButtonStyles = (collapsed: boolean) =>
  classNames(
    "border border-neutral-200 dark:border-neutral-700",
    collapsed ? "mx-auto" : "w-full !justify-start"
  );

const ActionsSidebar: React.FC<ActionsSidebarProps> = ({
  actions,
  exportToMD,
  onShowFindBar,
}) => {
  const [collapsed, setCollapsed] = useAtom(atom_sidebarCollapsed);
  const [theme, setTheme] = useAtom(atom_theme);
  const router = useRouter();
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
        <Button
          variant="icon"
          onClick={actions.handleCopyPrompt}
          aria-label="Copy Prompt"
          title="Copy Prompt"
          styles={classNames(getButtonStyles(collapsed), "dark:border-neutral-600")}
        >
          <FaCopy /> <span className={getLabelClass()}>Copy Prompt</span>
        </Button>
        <Button
          variant="icon"
          aria-label="Show Find Bar"
          onClick={onShowFindBar}
          styles={getButtonStyles(collapsed)}
        >
          <FaSearch /> <span className={getLabelClass()}>Search</span>
        </Button>
        <span className={dividerClass} />
        <Button
          variant="icon"
          onClick={actions.handleNewFile}
          aria-label="New File"
          title="New File"
          styles={classNames(getButtonStyles(collapsed), "dark:border-neutral-600")}
        >
          <FaFile /> <span className={getLabelClass()}>New</span>
        </Button>
        <Button
          variant="icon"
          onClick={actions.handleSelectTemplate}
          aria-label="Select Template"
          title="Select Template"
          styles={getButtonStyles(collapsed)}
        >
          <FaClipboardList /> <span className={getLabelClass()}>Template</span>
        </Button>
        <Button
          variant="icon"
          onClick={actions.handleOpenFile}
          aria-label="Import File"
          title="Import File"
          styles={getButtonStyles(collapsed)}
        >
          <FaFolderOpen /> <span className={getLabelClass()}>Import</span>
        </Button>
        <Button
          variant="icon"
          onClick={exportToMD}
          aria-label="Export File"
          title="Export File"
          styles={getButtonStyles(collapsed)}
        >
          <FaDownload /> <span className={getLabelClass()}>Export</span>
        </Button>
        <span className={dividerClass} />
        <Button
          variant="icon"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          aria-label={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
          title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
          styles={getButtonStyles(collapsed)}
        >
          {theme === "light" ? <FaMoon /> : <FaSun />} <span className={getLabelClass()}>{theme === "light" ? "Dark Mode" : "Light Mode"}</span>
        </Button>
        <Button
          variant="icon"
          onClick={() => router.push("/dashboard/settings")}
          aria-label="Settings"
          title="Settings"
          styles={getButtonStyles(collapsed)}
        >
          <FaCog /> <span className={getLabelClass()}>Settings</span>
        </Button>
      </div>
    </aside>
  );
};

export default ActionsSidebar; 