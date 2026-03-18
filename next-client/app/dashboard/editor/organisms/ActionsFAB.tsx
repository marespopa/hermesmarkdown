"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
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

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning!";
    if (hour < 17) return "Good afternoon!";
    if (hour < 21) return "Good evening!";
    return "Working late.";
  }, []);

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

  return (
    <div className="fixed top-12 right-4 z-[100] flex flex-col items-end gap-1 font-mono" ref={menuRef}>
      
      {/* iA Writer Inspired Control Strip */}
      <div className="flex items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm divide-x divide-zinc-200 dark:divide-zinc-800 shadow-sm transition-all duration-200">
        
        {/* Status Label */}
        <div className="px-3 py-2 hidden md:block">
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 tracking-tight">
            {greeting}
          </span>
        </div>

        {/* Copy Action */}
        <button
          onClick={actions.handleCopyPrompt}
          className="px-4 py-2 text-[11px] font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2 group"
        >
          <FaCopy size={11} className="opacity-30 group-hover:opacity-100 transition-opacity" />
          <span>copy_prompt</span>
        </button>

        {/* Menu Toggle - Hamburger Style */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`px-4 py-2 transition-colors flex items-center justify-center min-w-[44px] ${
            isOpen ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black" : "hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
          }`}
        >
          {isOpen ? (
            <FaTimes size={12} />
          ) : (
            <div className="flex flex-col gap-[3px] items-center">
              <div className="w-3.5 h-[1px] bg-current" />
              <div className="w-3.5 h-[1px] bg-current" />
              <div className="w-3.5 h-[1px] bg-current" />
            </div>
          )}
        </button>
      </div>

      {/* Popover Menu - Precision Alignment */}
      <div 
        className={`
          mt-1 transition-all duration-150 ease-out transform
          ${isOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1 pointer-events-none"}
        `}
      >
        <div className="w-44 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm shadow-[0_10px_30px_rgba(0,0,0,0.1)] p-1 flex flex-col">
          <MenuButton onClick={() => { actions.handleNewFile(); setIsOpen(false); }} icon={<FaFile size={10} />} label="new_file" />
          <MenuButton onClick={() => { actions.handleOpenFile(); setIsOpen(false); }} icon={<FaFolderOpen size={10} />} label="open_file" />
          <MenuButton onClick={() => { actions.handleOpenFindAndReplace(); setIsOpen(false); }} icon={<FaSearch size={10} />} label="search" />
          <MenuButton onClick={() => { exportToMD(); setIsOpen(false); }} icon={<FaDownload size={10} />} label="export_md" />
          
          <div className="h-[1px] bg-zinc-100 dark:bg-zinc-800 my-1 mx-2" />

          <MenuButton 
            onClick={() => setTheme(theme === "light" ? "dark" : "light")} 
            icon={theme === "light" ? <FaMoon size={10} /> : <FaSun size={10} />} 
            label={theme === "light" ? "dark_mode" : "light_mode"} 
          />
          <MenuButton 
            onClick={() => router.push("/dashboard/settings")} 
            icon={<FaCog size={10} />} 
            label="settings" 
          />
        </div>
      </div>
    </div>
  );
};

/* --- Helper: Minimal Menu Button --- */

const MenuButton = ({ onClick, icon, label }: { onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-3 px-3 py-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-100 dark:hover:text-black transition-colors rounded-[1px] text-left group"
  >
    <span className="opacity-40 group-hover:opacity-100">{icon}</span>
    <span className="tracking-tight">{label}</span>
  </button>
);

export default ActionsFAB;
