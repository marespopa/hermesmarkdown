"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAtom } from "jotai";
import { atom_theme } from "@/app/atoms/atoms";
import {
  FaTimes, FaFile, FaDownload, FaSearch,
  FaFolderOpen, FaCog, FaCopy, FaSun, FaMoon, FaMagic
} from "react-icons/fa";
import SnippetManagerModal from "./SnippetManager/SnippetManagerModal";
import Button from "@/app/components/Button/Button.component";

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
  const [isSnippetManagerOpen, setIsSnippetManagerOpen] = useState(false);
  const [theme, setTheme] = useAtom(atom_theme);
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    if (hour < 21) return "Good evening";
    return "Working late";
  }, []);

  const navigateToLite = () => {
    router.push("/lite");
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setIsOpen(false);
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

  return (
    <div className="fixed top-12 right-6 z-[100] flex flex-col items-end gap-2 font-mono selection:bg-zinc-200 dark:selection:bg-zinc-800" ref={menuRef}>
      
      {/* Control Strip */}
      <div className="flex items-center bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-md shadow-sm overflow-hidden">
        
        {/* Status Label */}
        <div className="px-4 py-2 hidden md:block border-r border-zinc-200 dark:border-zinc-800">
          <span className="text-[12px] text-zinc-400 dark:text-zinc-500 lowercase tracking-tight">
            {greeting}
          </span>
        </div>

        {/* Copy Action */}
        <Button variant="fab-action" onClick={actions.handleCopyPrompt}>
          <FaCopy size={12} className="opacity-40 group-hover:opacity-100 transition-opacity" />
          <span>copy_prompt</span>
        </Button>

        {/* Menu Toggle */}
        <Button
          variant="fab-toggle"
          onClick={() => setIsOpen(!isOpen)}
          styles={isOpen
            ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400"
          }
        >
          {isOpen ? <FaTimes size={14} /> : (
            <div className="flex flex-col gap-[3px] items-center">
              <div className="w-3.5 h-[1px] bg-current" />
              <div className="w-3.5 h-[1px] bg-current" />
            </div>
          )}
        </Button>
      </div>

      {/* Popover Menu */}
      <div 
        className={`
          transition-all duration-200 ease-out transform
          ${isOpen ? "opacity-100 translate-y-0 scale-100" : "opacity-0 -translate-y-2 scale-95 pointer-events-none"}
        `}
      >
        <div className="w-48 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl p-1.5 flex flex-col gap-0.5">
          <MenuButton onClick={() => { actions.handleNewFile(); setIsOpen(false); }} icon={<FaFile size={12} />} label="new_file" />
          <MenuButton onClick={() => { actions.handleOpenFile(); setIsOpen(false); }} icon={<FaFolderOpen size={12} />} label="open_file" />
          <MenuButton onClick={() => { actions.handleOpenFindAndReplace(); setIsOpen(false); }} icon={<FaSearch size={12} />} label="search" />
          <MenuButton onClick={() => { navigateToLite(); setIsOpen(false); }} icon={<FaFile size={12} />} label="lite_editor" />
          <MenuButton onClick={() => { exportToMD(); setIsOpen(false); }} icon={<FaDownload size={12} />} label="export_md" />
          <MenuButton onClick={() => { setIsSnippetManagerOpen(true); setIsOpen(false); }} icon={<FaMagic size={12} />} label="snippets" />

          <div className="h-[1px] bg-zinc-100 dark:bg-zinc-800 my-1 mx-2" />

          <MenuButton 
            onClick={() => setTheme(theme === "light" ? "dark" : "light")} 
            icon={theme === "light" ? <FaMoon size={12} /> : <FaSun size={12} />} 
            label={theme === "light" ? "appearance_dark" : "appearance_light"} 
          />
          <MenuButton 
            onClick={() => router.push("/dashboard/settings")} 
            icon={<FaCog size={12} />} 
            label="settings" 
          />
        </div>
      </div>

      {/* Snippet Manager Modal */}
      <SnippetManagerModal
        isOpen={isSnippetManagerOpen}
        onClose={() => setIsSnippetManagerOpen(false)}
      />
    </div>
  );
};

/* --- Minimal Menu Button Component --- */

const MenuButton = ({ onClick, icon, label }: { onClick: () => void, icon: React.ReactNode, label: string }) => (
  <Button variant="menu-item" onClick={onClick}>
    <span className="opacity-40 group-hover:opacity-100 transition-opacity w-4 flex justify-center">{icon}</span>
    <span className="tracking-tight">{label}</span>
  </Button>
);

export default ActionsFAB;
