"use client";

import React from "react";
import { HiOutlineChevronDown } from "react-icons/hi";

interface SidebarHeaderProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  action?: React.ReactNode;
}

export default function SidebarHeader({ title, isExpanded, onToggle, action }: SidebarHeaderProps) {
  return (
    <div 
      className="flex justify-between items-center px-4 py-2 cursor-pointer transition-colors group"
      onClick={onToggle}
    >
      <div className="flex items-center gap-2">
        <h3 className="text-[10px] tracking-[0.15em] font-bold uppercase text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">
          {title}
        </h3>
        {action && (
          <div onClick={(e) => e.stopPropagation()} className="flex items-center">
            {action}
          </div>
        )}
      </div>
      <HiOutlineChevronDown 
        size={14} 
        className={`text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-all duration-200 ${isExpanded ? "" : "-rotate-90"}`} 
      />
    </div>
  );
}
