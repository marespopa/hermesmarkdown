"use client";

import React, { useEffect, useRef, useState } from "react";
import Button from "../Button";
import { FaCaretDown } from "react-icons/fa";

type DropdownOption = {
  label: string;
  action: () => void;
};

type Props = {
  label?: React.ReactNode; // Allow string or icon
  options: DropdownOption[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIndex: number | null;
  onSelect: (idx: number) => void;
};

const DropdownMenu = ({ label, options, isOpen, onOpenChange, selectedIndex, onSelect }: Props) => {
  const [alignRight, setAlignRight] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null); // Ref to track the dropdown element
  const menuRef = useRef<HTMLDivElement>(null); // Ref for the menu itself
  const toggleDropdown = () => {
    onOpenChange(!isOpen);
  };

  useEffect(() => {
    if (isOpen && dropdownRef.current && menuRef.current) {
      // Measure the trigger and menu
      const triggerRect = dropdownRef.current.getBoundingClientRect();
      const menuRect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      // If the menu would overflow right, align right
      if (triggerRect.left + menuRect.width > viewportWidth) {
        setAlignRight(true);
      } else {
        setAlignRight(false);
      }
    }
  }, [isOpen]);

  const handleOptionClick = (option: DropdownOption, idx: number) => {
    onOpenChange(false); // Close the dropdown after selecting an option
    onSelect(idx);
    option.action();
    // Add specific functionality based on the option here if needed
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        onOpenChange(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onOpenChange]);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <Button variant="secondary" onClick={toggleDropdown} aria-expanded={isOpen}>
        <span className="flex items-center gap-2">
          {selectedIndex !== null ? options[selectedIndex].label : label}
          <FaCaretDown />
        </span>
      </Button>
      {isOpen && (
        <div
          ref={menuRef}
          className={`absolute mt-2 min-w-[200px] max-w-xs bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-zinc-200/50 dark:border-neutral-800/50 rounded-2xl shadow-2xl font-sans z-50 p-1.5 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-200 ${alignRight ? 'right-0' : 'left-0'}`}
        >
          {options.map((option, idx) => (
            <Button
              key={option.label}
              variant="bare"
              onClick={() => handleOptionClick(option, idx)}
              className={`w-full text-left whitespace-nowrap h-10 px-3.5 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80 rounded-xl transition-all duration-150 focus-visible:ring-2 focus-visible:ring-blue-500 hover:text-zinc-900 dark:hover:text-zinc-100 ${selectedIndex === idx ? 'bg-zinc-100 dark:bg-zinc-800 font-semibold text-zinc-900 dark:text-zinc-100' : ''}`}
              tabIndex={0}
            >
              <span className="flex items-center gap-2 w-full text-ui-footnote">
                {option.label}
                {selectedIndex === idx && (
                  <span className="ml-auto text-blue-500">✓</span>
                )}
              </span>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

export default DropdownMenu;
