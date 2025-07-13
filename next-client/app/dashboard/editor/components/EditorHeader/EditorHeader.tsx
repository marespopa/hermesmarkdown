"use client";

import Button from "@/app/components/Button";
import { useAtom } from "jotai";
import EditorPreviewTrigger from "../EditorPreviewTrigger";
import PenIcon from "@/app/components/Icons/PenIcon";
import { useEffect, useRef, useState } from "react";
import EditorForm from "../EditorForm";
import { FileMetadata } from "@/app/types/markdown";
import { atom_content, atom_showTimer, atom_panelState, atom_hasChanges, atom_theme } from "@/app/atoms/atoms";
import DropdownMenu from "@/app/components/DropdownMenu";
import ExportService from "@/app/services/export-service";
import { FaClock, FaFile, FaEdit, FaQuestion, FaEye, FaColumns, FaPen, FaExclamationCircle, FaSave, FaCheck } from "react-icons/fa";
import { useRouter } from "next/navigation";
import useIsMobile from "@/app/hooks/use-is-mobile";
import ThemeToggle from "@/app/components/ThemeToggle";
import IconButton from "@/app/components/IconButton";
import React from "react";

interface Props {
  contentEdited: string;
  frontMatter: FileMetadata;
  hasChanges: boolean;
  actions: {
    handleNewFile: () => void;
    handleOpenFile: () => void;
    handleSelectTemplate: () => void;
    handleOpenFindAndReplace: () => void;
  };
}

export default function EditorHeader({
  contentEdited,
  frontMatter,
  hasChanges,
  actions,
}: Props) {
  const [, setFileContent] = useAtom(atom_content);
  const [isFormatterDialogOpen, setIsFormatterDialogOpen] = useState(false);
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);
  const [showTimer, setShowTimer] = useAtom(atom_showTimer);
  const [panelState, setPanelState] = useAtom(atom_panelState);
  const [, setHasChanges] = useAtom(atom_hasChanges);
  const router = useRouter();
  const isMobile = useIsMobile();
  const fileTitle = frontMatter.title;
  const fileName = frontMatter.fileName;
  const hasTitle = fileTitle.length > 0;
  const fabMenuRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useAtom(atom_theme);

  // Higher-order function to wrap actions with closeFabMenu
  const withCloseFabMenu = (action: () => void) => () => {
    closeFabMenu();
    setTimeout(() => {
      action();
    }, 0);
  };

  // File menu options
  const fileMenuOptions = [
    {
      label: "New File...",
      action: withCloseFabMenu(actions.handleNewFile),
    },
    {
      label: "New from template...",
      action: withCloseFabMenu(actions.handleSelectTemplate),
    },
    {
      label: "Open File...",
      action: withCloseFabMenu(actions.handleOpenFile),
    },
    {
      label: "Save As...",
      action: withCloseFabMenu(exportToMD),
    },
  ];

  // Help menu options
  const helpMenuOptions = [
    {
      label: "Welcome",
      action: withCloseFabMenu(() => {
        router.push("/dashboard");
      }),
    },
    {
      label: "Documentation",
      action: withCloseFabMenu(() => router.push("/documentation")),
    },
  ];

  // Edit menu options
  const editMenuOptions = [
    {
      label: "Copy Markdown",
      action: withCloseFabMenu(() =>
        navigator.clipboard.writeText(contentEdited)
      ),
    },
    {
      label: "Find/Replace...",
      action: withCloseFabMenu(actions.handleOpenFindAndReplace),
    },
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        fabMenuRef.current &&
        !fabMenuRef.current.contains(event.target as Node)
      ) {
        setIsFabMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <>
      {isMobile ? (
        <>
          {renderOptionsMenu()}
          <PanelControls panelState={panelState} setPanelState={setPanelState} />
        </>
      ) : (
        <div
          className="bg-white dark:bg-gray-800 border border-black/10 dark:border-white/10 shadow-sm px-4 py-2 flex flex-col gap-2 mt-4"
        >
          {/* Top row: file info and actions */}
          <div className="flex flex-row justify-between items-center w-full gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl leading-tight flex gap-2 items-center text-gray-900 dark:text-white">
                <span>{hasTitle && `${fileTitle}`}</span>
                <span className="cursor-pointer" onClick={showFileDialog}>
                  <PenIcon tooltip="File Settings" size={16} alt="Edit Title" />
                </span>
              </h1>
              <h2 className="text-xs leading-tight text-gray-700 dark:text-gray-300 font-mono">{`${
                fileName?.endsWith(".md") ? fileName : fileName + ".md"
              }`}</h2>
            </div>
            <div className="flex flex-col items-end gap-1 min-w-[320px]">
              <div className="flex flex-row items-center gap-2">
                {renderFileMenu()}
                {renderEditMenu()}
                {renderHelpMenu()}
                <EditorPreviewTrigger />
                <IconButton
                  icon={<FaSave />}
                  title="Save As"
                  onClick={exportToMD}
                />
                <IconButton
                  icon={<FaClock />}
                  title={showTimer ? "Hide timer" : "Show timer"}
                  onClick={() => setShowTimer(!showTimer)}
                  isActive={showTimer}
                  dataTestId="timer-toggle"
                />
                <ThemeToggle />
              </div>
              {/* Unsaved changes indicator - right-aligned, pill style, with icon, fade-in */}
              <div className="h-5 flex items-center justify-end w-full">
                {hasChanges && (
                  <span className="flex items-center gap-1 px-3 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 text-xs font-medium shadow-sm animate-fade-in">
                    <FaExclamationCircle className="w-3 h-3 mr-1" />
                    You have unsaved changes.
                  </span>
                )}
              </div>
            </div>
          </div>
          {/* Toggle Bar: full width, flush with header bottom */}
          <PanelControls panelState={panelState} setPanelState={setPanelState} />
        </div>
      )}
      <EditorForm isOpened={isFormatterDialogOpen} handleClose={closeFabMenu} />
    </>
  );

  function closeFabMenu() {
    setIsFormatterDialogOpen(false);
    setIsFabMenuOpen(false);
  }

  function renderOptionsMenu() {
    if (isMobile) {
      return (
        <>
          <div className="fixed top-4 right-2 sm:top-8 sm:right-8 z-50">
            <button
              onClick={() => setIsFabMenuOpen(!isFabMenuOpen)}
              className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
              aria-label="Menu"
              title="Menu"
            >
              <span className="font-bold text-gray-700 dark:text-gray-300">Menu</span>
            </button>
          </div>
          {isFabMenuOpen && (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-gray-900 bg-opacity-95 dark:bg-opacity-95">
              <button
                onClick={() => setIsFabMenuOpen(false)}
                className="absolute top-4 right-4 text-3xl text-gray-700 dark:text-gray-300 focus:outline-none"
                aria-label="Close Menu"
              >
                &times;
              </button>
              <div className="flex flex-col gap-3 w-full max-w-xs px-4">
                <button
                  className="w-full py-3 border border-black dark:border-white bg-white dark:bg-gray-900 text-black dark:text-white font-mono font-bold rounded-none text-lg hover:bg-black hover:text-white transition-colors"
                  onClick={withCloseFabMenu(actions.handleNewFile)}
                >
                  New File
                </button>
                <button
                  className="w-full py-3 border border-black dark:border-white bg-white dark:bg-gray-900 text-black dark:text-white font-mono font-bold rounded-none text-lg hover:bg-black hover:text-white transition-colors"
                  onClick={withCloseFabMenu(actions.handleSelectTemplate)}
                >
                  New From Template
                </button>
                <button
                  className="w-full py-3 border border-black dark:border-white bg-white dark:bg-gray-900 text-black dark:text-white font-mono font-bold rounded-none text-lg hover:bg-black hover:text-white transition-colors"
                  onClick={withCloseFabMenu(exportToMD)}
                >
                  Save File
                </button>
                <button
                  className="w-full py-3 border border-black dark:border-white bg-white dark:bg-gray-900 text-black dark:text-white font-mono font-bold rounded-none text-lg hover:bg-black hover:text-white transition-colors"
                  onClick={withCloseFabMenu(actions.handleOpenFile)}
                >
                  Open File
                </button>
                <button
                  className="w-full py-3 border border-black dark:border-white bg-white dark:bg-gray-900 text-black dark:text-white font-mono font-bold rounded-none text-lg hover:bg-black hover:text-white transition-colors"
                  onClick={withCloseFabMenu(() => navigator.clipboard.writeText(contentEdited))}
                >
                  Copy Markdown
                </button>
                <button
                  className="w-full py-3 border border-black dark:border-white bg-white dark:bg-gray-900 text-black dark:text-white font-mono font-bold rounded-none text-lg hover:bg-black hover:text-white transition-colors"
                  onClick={withCloseFabMenu(actions.handleOpenFindAndReplace)}
                >
                  Find/Replace
                </button>
                <button
                  className="w-full py-3 border border-black dark:border-white bg-white dark:bg-gray-900 text-black dark:text-white font-mono font-bold rounded-none text-lg hover:bg-black hover:text-white transition-colors"
                  onClick={withCloseFabMenu(() => router.push('/dashboard'))}
                >
                  Welcome
                </button>
                <button
                  className="w-full py-3 border border-black dark:border-white bg-white dark:bg-gray-900 text-black dark:text-white font-mono font-bold rounded-none text-lg hover:bg-black hover:text-white transition-colors"
                  onClick={withCloseFabMenu(() => router.push('/documentation'))}
                >
                  Documentation
                </button>
                <div className="flex justify-center w-full py-2">
                  <button
                    className="w-full py-3 border border-black dark:border-white bg-white dark:bg-gray-900 text-black dark:text-white font-mono font-bold rounded-none text-lg hover:bg-black hover:text-white transition-colors"
                    onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                  >
                    {theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      );
    }

    return (
      <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2 items-start">
        <DropdownMenu label="File" options={fileMenuOptions} />
        <DropdownMenu label="Edit" options={editMenuOptions} />
        <DropdownMenu label="Help" options={helpMenuOptions} />
        <EditorPreviewTrigger />
        <Button variant="primary" label="Save As" handler={exportToMD} />
      </div>
    );
  }

  function renderEditMenu() {
    return (
      <DropdownMenu
        options={editMenuOptions}
        trigger={
          <IconButton
            icon={<FaEdit />}
            title="Edit"
            showDropdownIndicator={true}
          />
        }
      />
    );
  }

  function renderHelpMenu() {
    return (
      <DropdownMenu
        options={helpMenuOptions}
        trigger={
          <IconButton
            icon={<FaQuestion />}
            title="Help"
            showDropdownIndicator={true}
          />
        }
      />
    );
  }

  function renderFileMenu() {
    return (
      <DropdownMenu
        options={fileMenuOptions}
        trigger={
          <IconButton
            icon={<FaFile />}
            title="File"
            showDropdownIndicator={true}
          />
        }
      />
    );
  }

  function showFileDialog() {
    setIsFormatterDialogOpen(true);
  }

  function exportToMD() {
    ExportService.exportMarkdown(contentEdited, frontMatter);
    setFileContent(contentEdited);
    setHasChanges(false); // Clear unsaved changes after save
  }
}

const PanelControls = ({ panelState, setPanelState }: { panelState: string; setPanelState: (state: any) => void }) => (
  <div className="flex justify-center gap-2 w-full mt-2 mb-2 rounded-none p-1 bg-transparent">
    <ToggleButton
      icon={<FaPen />}
      title="Editor Only"
      isActive={panelState === "editor"}
      onClick={() => setPanelState("editor")}
    />
    <ToggleButton
      icon={<FaEye />}
      title="Preview Only"
      isActive={panelState === "preview"}
      onClick={() => setPanelState("preview")}
    />
    <ToggleButton
      icon={<FaColumns />}
      title="Split View (Editor + Preview)"
      isActive={panelState === "both"}
      onClick={() => setPanelState("both")}
    />
  </div>
);

const ToggleButton = ({
  icon,
  title,
  isActive,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  isActive: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    aria-label={title}
    aria-pressed={isActive}
    className={`px-2 py-2 min-w-[44px] h-10 border border-black rounded-none bg-white text-black font-mono font-bold flex items-center justify-center relative hover:bg-black hover:text-white transition-colors duration-150`}
    data-testid={
      title === "Editor Only"
        ? "toggle-editor"
        : title === "Preview Only"
        ? "toggle-preview"
        : title === "Split View (Editor + Preview)"
        ? "toggle-split"
        : undefined
    }
  >
    <span className="flex items-center justify-center h-5 w-5">
      {icon}
    </span>
    {isActive && (
      <span style={{ position: 'absolute', top: 2, right: 2 }}>
        <FaCheck className="w-3 h-3 text-emerald-500" />
      </span>
    )}
  </button>
);

export { PanelControls };