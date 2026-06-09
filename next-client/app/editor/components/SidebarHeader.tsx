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
        <h3 className="text-ui-footnote font-medium text-ink-muted dark:text-stone group-hover:text-ink-light dark:group-hover:text-ink-dark transition-colors">
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
        className={`text-beige dark:text-fg-faint group-hover:text-ink-light dark:group-hover:text-ink-dark transition-all duration-200 ${isExpanded ? "" : "-rotate-90"}`} 
      />
    </div>
  );
}
