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
      className="flex justify-between items-center px-3 py-2 cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-md mx-1 transition-colors group"
      onClick={onToggle}
    >
      <div className="flex items-center gap-2">
        <h3 className="text-[9px] tracking-[0.2em] font-bold opacity-30 group-hover:opacity-100 transition-opacity">
          {title}
        </h3>
        {action && (
          <div onClick={(e) => e.stopPropagation()}>
            {action}
          </div>
        )}
      </div>
      <HiOutlineChevronDown 
        size={12} 
        className={`opacity-30 group-hover:opacity-100 transition-all duration-200 ${isExpanded ? "" : "-rotate-90"}`} 
      />
    </div>
  );
}
