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
          className={`absolute mt-1 min-w-[180px] max-w-xs bg-white dark:bg-neutral-900 border border-black dark:border-white rounded-none shadow-xl font-sourcecode z-10 p-0 flex flex-col ${alignRight ? 'right-0' : 'left-0'}`}
        >
          {options.map((option, idx) => (
            <button
              key={option.label}
              onClick={() => handleOptionClick(option, idx)}
              className={`w-full text-left whitespace-nowrap h-12 px-5 bg-white dark:bg-neutral-800 text-black dark:text-white border-b border-black dark:border-black rounded-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-white hover:bg-neutral-100 dark:hover:bg-neutral-700 ${idx === options.length - 1 ? 'border-b-0' : ''} ${selectedIndex === idx ? 'bg-neutral-200 dark:bg-neutral-700 font-bold' : ''}`}
              tabIndex={0}
              type="button"
            >
              <span className="flex items-center gap-2">
                {option.label}
                {selectedIndex === idx && (
                  <span className="ml-auto">✓</span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default DropdownMenu;
