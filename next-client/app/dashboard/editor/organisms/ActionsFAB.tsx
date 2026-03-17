"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAtom } from "jotai";
import { atom_theme } from "@/app/atoms/atoms";
import { 
  FaTimes, FaFile, FaDownload, FaSearch, 
  FaFolderOpen, FaCog, FaCopy, FaSun, FaMoon 
} from "react-icons/fa";
import Button from "@/app/components/Button";

interface ActionsFABProps {
  actions: {
    handleNewFile: () => void;
    handleOpenFile: () => void;
    handleOpenFindAndReplace: () => void;
    handleCopyPrompt: () => void;
  };
  exportToMD: () => void;
}

const ActionsFAB: React.FC<ActionsFABProps> = ({ actions, exportToMD }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [theme, setTheme] = useAtom(atom_theme);
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside or Escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEsc);
    };
  }, []);

  const runAction = (fn: () => void) => {
    fn();
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-3" ref={menuRef}>
      {/* Popover Menu Content */}
      <div 
        className={`
          mb-2 transition-all duration-300 origin-bottom-right
          ${isOpen ? "scale-100 opacity-100 translate-y-0" : "scale-95 opacity-0 translate-y-4 pointer-events-none"}
        `}
      >
        <div className="w-56 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-sky-200 dark:border-sky-900/50 rounded-2xl shadow-2xl p-1.5 flex flex-col gap-0.5">
          
          <MenuButton 
            variant="primary" 
            onClick={() => runAction(actions.handleCopyPrompt)} 
            icon={<FaCopy size={14} />} 
            label="Copy Prompt" 
          />
          
          <Divider />
          
          <MenuButton onClick={() => runAction(actions.handleNewFile)} icon={<FaFile size={14} />} label="New Document" />
          <MenuButton onClick={() => runAction(actions.handleOpenFile)} icon={<FaFolderOpen size={14} />} label="Import File" />
          <MenuButton onClick={() => runAction(actions.handleOpenFindAndReplace)} icon={<FaSearch size={14} />} label="Search Text" />
          <MenuButton onClick={() => runAction(exportToMD)} icon={<FaDownload size={14} />} label="Export .md" />
          
          <Divider />

          <MenuButton 
            onClick={() => setTheme(theme === "light" ? "dark" : "light")} 
            icon={theme === "light" ? <FaMoon size={14} /> : <FaSun size={14} />} 
            label={theme === "light" ? "Dark Mode" : "Light Mode"} 
          />
          
          <MenuButton 
            onClick={() => { router.push("/dashboard/settings"); setIsOpen(false); }} 
            icon={<FaCog size={14} />} 
            label="Settings" 
          />
        </div>
      </div>

      {/* Main Trigger Button */}
      <Button
        variant={isOpen ? "secondary" : "icon-bg"}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Actions Menu"
        styles={`
          rounded-full shadow-lg !w-12 !h-12 !min-w-0 !min-h-0 !p-0 transition-all duration-300
          ${isOpen ? "rotate-90 bg-sky-100 dark:bg-zinc-800" : ""}
        `}
      >
        {isOpen ? (
          <FaTimes size={18} />
        ) : (
          <div className="grid grid-cols-2 gap-0.5">
            <div className="w-1.5 h-1.5 bg-current rounded-[1px]" />
            <div className="w-1.5 h-1.5 bg-current rounded-[1px]" />
            <div className="w-1.5 h-1.5 bg-current rounded-[1px]" />
            <div className="w-1.5 h-1.5 bg-current rounded-[1px]" />
          </div>
        )}
      </Button>
    </div>
  );
};

/* --- Internal Helpers for Clarity --- */

const Divider = () => <div className="h-px bg-sky-100 dark:bg-sky-900/30 my-1 mx-2" />;

const MenuButton = ({ 
  variant = "tertiary", 
  onClick, 
  icon, 
  label 
}: { 
  variant?: "primary" | "tertiary", 
  onClick: () => void, 
  icon: React.ReactNode, 
  label: string 
}) => (
  <Button
    variant={variant}
    onClick={onClick}
    styles={`
      w-full !justify-start !px-3 !py-2 !min-h-0 !h-10 transition-colors
      ${variant === 'tertiary' ? '!text-[13px] !border-none !text-zinc-600 dark:!text-zinc-400' : '!text-[13px]'}
    `}
  >
    <span className="opacity-70">{icon}</span>
    <span className="font-semibold tracking-tight">{label}</span>
  </Button>
);

export default ActionsFAB;
